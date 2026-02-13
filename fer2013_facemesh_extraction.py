"""
FER-2013 FaceMesh Feature Extraction Pipeline
================================================
Downloads the FER-2013 **image** dataset from Kaggle
(https://www.kaggle.com/datasets/msambare/fer2013), combines train
and test images, performs a fresh 70% / 15% / 15% stratified split,
extracts 468 facial landmarks (x, y, z) per image using MediaPipe
FaceMesh, and exports the results as three CSV files.

Dataset structure after download
---------------------------------
    data/
    ├── train/
    │   ├── angry/
    │   ├── disgust/
    │   ├── fear/
    │   ├── happy/
    │   ├── sad/
    │   ├── surprise/
    │   └── neutral/
    └── test/
        ├── angry/
        ├── disgust/
        ├── fear/
        ├── happy/
        ├── sad/
        ├── surprise/
        └── neutral/

Prerequisites
-------------
1. Install dependencies:
       pip install -r requirements.txt

2. Set up Kaggle API credentials:
   - Go to https://www.kaggle.com/settings → "Create New Token"
   - Place the downloaded `kaggle.json` in ~/.kaggle/kaggle.json
   - Or set environment variables:
       export KAGGLE_USERNAME=<your_username>
       export KAGGLE_KEY=<your_api_key>

Usage
-----
    python fer2013_facemesh_extraction.py
    python fer2013_facemesh_extraction.py --data-dir ./my_data --output-dir ./my_output
"""

import os
import sys
import logging
import argparse

import numpy as np
import pandas as pd
import cv2
import mediapipe as mp
from sklearn.model_selection import train_test_split

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
KAGGLE_DATASET_URL = "https://www.kaggle.com/datasets/msambare/fer2013"
KAGGLE_DATASET_SLUG = "msambare/fer2013"

EMOTION_LABELS = ["angry", "disgust", "fear", "happy", "sad", "surprise", "neutral"]

# Map folder names → integer labels (alphabetical by convention, but we
# follow the standard FER-2013 ordering)
EMOTION_TO_INT = {
    "angry": 0,
    "disgust": 1,
    "fear": 2,
    "happy": 3,
    "sad": 4,
    "surprise": 5,
    "neutral": 6,
}
INT_TO_EMOTION = {v: k.capitalize() for k, v in EMOTION_TO_INT.items()}

# FaceMesh produces 468 landmarks, each with x, y, z coordinates
NUM_LANDMARKS = 468
FEATURES_PER_LANDMARK = 3  # x, y, z
TOTAL_FEATURES = NUM_LANDMARKS * FEATURES_PER_LANDMARK  # 1404

# Data split ratios
TRAIN_RATIO = 0.70
VAL_RATIO = 0.15
TEST_RATIO = 0.15

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".tif", ".tiff"}


# ---------------------------------------------------------------------------
# Download
# ---------------------------------------------------------------------------
def download_fer2013(data_dir: str) -> str:
    """
    Download the FER-2013 image dataset from Kaggle and return the path
    to the root directory containing train/ and test/ folders.

    Dataset URL: https://www.kaggle.com/datasets/msambare/fer2013
    """
    # Check if already downloaded — look for train/ subfolder
    train_dir = os.path.join(data_dir, "train")
    test_dir = os.path.join(data_dir, "test")

    if os.path.isdir(train_dir) and os.path.isdir(test_dir):
        logger.info(
            "FER-2013 image folders already present at %s — skipping download.",
            data_dir,
        )
        return data_dir

    logger.info("Downloading FER-2013 image dataset from Kaggle …")
    logger.info("Dataset URL: %s", KAGGLE_DATASET_URL)

    try:
        from kaggle.api.kaggle_api_extended import KaggleApi

        api = KaggleApi()
        api.authenticate()
        api.dataset_download_files(
            KAGGLE_DATASET_SLUG, path=data_dir, unzip=True
        )
    except Exception as exc:
        logger.error(
            "Failed to download FER-2013 from Kaggle.\n"
            "Ensure your Kaggle credentials are configured:\n"
            "  1. Go to https://www.kaggle.com/settings → Create New Token\n"
            "  2. Place kaggle.json in ~/.kaggle/kaggle.json\n"
            "  OR set KAGGLE_USERNAME and KAGGLE_KEY env vars.\n\n"
            "Error: %s",
            exc,
        )
        sys.exit(1)

    # After unzipping, the dataset may be nested inside a subdirectory.
    # Walk to find the directory that contains train/ and test/.
    if not os.path.isdir(train_dir):
        for root, dirs, _files in os.walk(data_dir):
            if "train" in dirs and "test" in dirs:
                # Move contents up if nested
                if root != data_dir:
                    import shutil

                    for item in os.listdir(root):
                        src = os.path.join(root, item)
                        dst = os.path.join(data_dir, item)
                        if not os.path.exists(dst):
                            shutil.move(src, dst)
                break

    if not os.path.isdir(os.path.join(data_dir, "train")):
        logger.error(
            "Could not find train/ and test/ folders after download in %s",
            data_dir,
        )
        sys.exit(1)

    logger.info("FER-2013 image dataset ready at %s", data_dir)
    return data_dir


# ---------------------------------------------------------------------------
# Load images from folder structure
# ---------------------------------------------------------------------------
def load_image_paths(dataset_root: str) -> pd.DataFrame:
    """
    Scan train/ and test/ folders and return a DataFrame with columns:
        - image_path: absolute path to the image file
        - emotion: integer label (0-6)
        - emotion_label: human-readable label
        - original_split: 'train' or 'test' (from Kaggle's original split)
    """
    records = []

    for split_folder in ["train", "test"]:
        split_dir = os.path.join(dataset_root, split_folder)
        if not os.path.isdir(split_dir):
            logger.warning("Directory not found: %s — skipping.", split_dir)
            continue

        for emotion_name in sorted(os.listdir(split_dir)):
            emotion_dir = os.path.join(split_dir, emotion_name)
            if not os.path.isdir(emotion_dir):
                continue

            # Normalise folder name to lowercase
            emotion_key = emotion_name.strip().lower()
            if emotion_key not in EMOTION_TO_INT:
                logger.warning(
                    "Unknown emotion folder '%s' — skipping.", emotion_name
                )
                continue

            emotion_int = EMOTION_TO_INT[emotion_key]
            emotion_label = INT_TO_EMOTION[emotion_int]

            for fname in os.listdir(emotion_dir):
                ext = os.path.splitext(fname)[1].lower()
                if ext not in IMAGE_EXTENSIONS:
                    continue

                records.append(
                    {
                        "image_path": os.path.join(emotion_dir, fname),
                        "emotion": emotion_int,
                        "emotion_label": emotion_label,
                        "original_split": split_folder,
                    }
                )

    df = pd.DataFrame(records)
    logger.info(
        "Found %d images across %d emotion classes.",
        len(df),
        df["emotion"].nunique(),
    )

    # Log per-class counts
    for emo_int in sorted(df["emotion"].unique()):
        label = INT_TO_EMOTION[emo_int]
        count = len(df[df["emotion"] == emo_int])
        logger.info("  %d %-10s : %d images", emo_int, label, count)

    return df


# ---------------------------------------------------------------------------
# FaceMesh extraction
# ---------------------------------------------------------------------------
def extract_facemesh_landmarks(
    image: np.ndarray,
    face_mesh,
) -> np.ndarray | None:
    """
    Run MediaPipe FaceMesh on an image and return a flat array of
    [x0, y0, z0, x1, y1, z1, …] for all 468 landmarks.

    Accepts grayscale or BGR images. Returns None if no face is detected.
    """
    # Convert to RGB for FaceMesh
    if len(image.shape) == 2:
        image_rgb = cv2.cvtColor(image, cv2.COLOR_GRAY2RGB)
    elif image.shape[2] == 4:
        image_rgb = cv2.cvtColor(image, cv2.COLOR_BGRA2RGB)
    else:
        image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)

    results = face_mesh.process(image_rgb)

    if not results.multi_face_landmarks:
        return None

    # Take the first detected face
    face_landmarks = results.multi_face_landmarks[0]
    coords = []
    for lm in face_landmarks.landmark:
        coords.extend([lm.x, lm.y, lm.z])

    return np.array(coords, dtype=np.float32)


def build_feature_columns() -> list[str]:
    """Return column names for the 468×3 landmark features."""
    cols = []
    for i in range(NUM_LANDMARKS):
        cols.extend([f"lm{i}_x", f"lm{i}_y", f"lm{i}_z"])
    return cols


def process_split(
    df: pd.DataFrame,
    split_name: str,
) -> pd.DataFrame:
    """
    Extract FaceMesh landmarks for every image in *df* and return a new
    DataFrame with columns:
        [image_index, image_path, emotion, emotion_label, lm0_x, lm0_y, lm0_z, …]

    Images where no face is detected are skipped.
    """
    logger.info(
        "Extracting FaceMesh landmarks for %s split (%d images) …",
        split_name,
        len(df),
    )

    feature_cols = build_feature_columns()
    records: list[dict] = []
    skipped = 0

    mp_face_mesh = mp.solutions.face_mesh
    with mp_face_mesh.FaceMesh(
        static_image_mode=True,
        max_num_faces=1,
        refine_landmarks=False,
        min_detection_confidence=0.3,
    ) as face_mesh:
        for idx, row in df.iterrows():
            # Read image from disk
            img = cv2.imread(row["image_path"], cv2.IMREAD_UNCHANGED)
            if img is None:
                logger.warning(
                    "Could not read image: %s — skipping.", row["image_path"]
                )
                skipped += 1
                continue

            landmarks = extract_facemesh_landmarks(img, face_mesh)

            if landmarks is None:
                skipped += 1
                continue

            record = {
                "image_index": idx,
                "image_path": row["image_path"],
                "emotion": int(row["emotion"]),
                "emotion_label": row["emotion_label"],
            }
            for col_name, val in zip(feature_cols, landmarks):
                record[col_name] = float(val)
            records.append(record)

            # Progress logging every 1000 images
            processed = len(records) + skipped
            if processed % 1000 == 0:
                logger.info(
                    "  [%s] Processed %d / %d images …",
                    split_name,
                    processed,
                    len(df),
                )

    logger.info(
        "  [%s] Done. Extracted: %d, Skipped (no face detected): %d",
        split_name,
        len(records),
        skipped,
    )

    result_df = pd.DataFrame(records)
    ordered_cols = ["image_index", "image_path", "emotion", "emotion_label"] + feature_cols
    ordered_cols = [c for c in ordered_cols if c in result_df.columns]
    return result_df[ordered_cols]


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main():
    parser = argparse.ArgumentParser(
        description=(
            "FER-2013 FaceMesh Feature Extraction Pipeline.\n"
            f"Downloads the image dataset from: {KAGGLE_DATASET_URL}"
        ),
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument(
        "--data-dir",
        type=str,
        default=os.path.join(os.path.dirname(os.path.abspath(__file__)), "data"),
        help="Directory to download/store FER-2013 images (default: ./data)",
    )
    parser.add_argument(
        "--output-dir",
        type=str,
        default=os.path.join(os.path.dirname(os.path.abspath(__file__)), "output"),
        help="Directory for output CSVs (default: ./output)",
    )
    parser.add_argument(
        "--seed",
        type=int,
        default=42,
        help="Random seed for reproducible splits (default: 42)",
    )
    args = parser.parse_args()

    os.makedirs(args.data_dir, exist_ok=True)
    os.makedirs(args.output_dir, exist_ok=True)

    # ------------------------------------------------------------------
    # 1. Download FER-2013 image dataset from Kaggle
    # ------------------------------------------------------------------
    logger.info("Dataset source: %s", KAGGLE_DATASET_URL)
    dataset_root = download_fer2013(args.data_dir)

    # ------------------------------------------------------------------
    # 2. Load all image paths and labels from folder structure
    # ------------------------------------------------------------------
    df_all = load_image_paths(dataset_root)

    if df_all.empty:
        logger.error("No images found. Check the dataset directory.")
        sys.exit(1)

    logger.info("Total images loaded: %d", len(df_all))

    # ------------------------------------------------------------------
    # 3. Combine and re-split: 70% train / 15% val / 15% test
    #    (stratified by emotion to preserve class distribution)
    # ------------------------------------------------------------------
    logger.info(
        "Re-splitting all %d images: 70%% train / 15%% val / 15%% test …",
        len(df_all),
    )

    # First split: 70% train, 30% remaining
    df_train, df_remaining = train_test_split(
        df_all,
        test_size=(VAL_RATIO + TEST_RATIO),
        random_state=args.seed,
        stratify=df_all["emotion"],
    )

    # Second split: divide remaining 30% into 15% val + 15% test (50/50)
    df_val, df_test = train_test_split(
        df_remaining,
        test_size=TEST_RATIO / (VAL_RATIO + TEST_RATIO),
        random_state=args.seed,
        stratify=df_remaining["emotion"],
    )

    logger.info(
        "Split sizes → Train: %d (%.1f%%), Val: %d (%.1f%%), Test: %d (%.1f%%)",
        len(df_train),
        100 * len(df_train) / len(df_all),
        len(df_val),
        100 * len(df_val) / len(df_all),
        len(df_test),
        100 * len(df_test) / len(df_all),
    )

    # ------------------------------------------------------------------
    # 4. Extract FaceMesh landmarks for each split
    # ------------------------------------------------------------------
    splits = {
        "train": df_train,
        "val": df_val,
        "test": df_test,
    }

    for split_name, split_df in splits.items():
        features_df = process_split(split_df.reset_index(drop=True), split_name)

        out_path = os.path.join(args.output_dir, f"fer2013_facemesh_{split_name}.csv")
        features_df.to_csv(out_path, index=False)
        logger.info("Saved %s → %s (%d rows)", split_name, out_path, len(features_df))

    # ------------------------------------------------------------------
    # 5. Summary
    # ------------------------------------------------------------------
    logger.info("=" * 60)
    logger.info("Pipeline complete. Output files:")
    for split_name in splits:
        fpath = os.path.join(args.output_dir, f"fer2013_facemesh_{split_name}.csv")
        if os.path.isfile(fpath):
            row_count = sum(1 for _ in open(fpath)) - 1  # minus header
            logger.info("  %-6s : %s (%d rows)", split_name, fpath, row_count)
    logger.info("=" * 60)
    logger.info(
        "Each CSV contains: image_index, image_path, emotion (0-6), "
        "emotion_label, and %d landmark features "
        "(468 landmarks × 3 coords [x, y, z]).",
        TOTAL_FEATURES,
    )


if __name__ == "__main__":
    main()
