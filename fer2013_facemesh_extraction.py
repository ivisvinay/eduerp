"""
FER-2013 FaceMesh Feature Extraction Pipeline
================================================
Downloads the FER-2013 dataset from Kaggle, splits it into
70% train / 15% validation / 15% test, extracts facial landmark
feature vectors using MediaPipe FaceMesh, and exports the results
as CSV files.

Prerequisites
-------------
1. Install dependencies:
       pip install -r requirements.txt

2. Set up Kaggle API credentials:
   - Go to https://www.kaggle.com/settings  → "Create New Token"
   - Place the downloaded `kaggle.json` in ~/.kaggle/kaggle.json
   - Or set environment variables:
       export KAGGLE_USERNAME=<your_username>
       export KAGGLE_KEY=<your_api_key>

Usage
-----
    python fer2013_facemesh_extraction.py
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
EMOTION_MAP = {
    0: "Angry",
    1: "Disgust",
    2: "Fear",
    3: "Happy",
    4: "Sad",
    5: "Surprise",
    6: "Neutral",
}

# FaceMesh produces 468 landmarks, each with x, y, z coordinates
NUM_LANDMARKS = 468
FEATURES_PER_LANDMARK = 3  # x, y, z
TOTAL_FEATURES = NUM_LANDMARKS * FEATURES_PER_LANDMARK  # 1404

# Data split ratios
TRAIN_RATIO = 0.70
VAL_RATIO = 0.15
TEST_RATIO = 0.15

# FER-2013 image dimensions
IMG_SIZE = 48


def download_fer2013(data_dir: str) -> str:
    """Download FER-2013 dataset from Kaggle and return the CSV path."""
    csv_path = os.path.join(data_dir, "fer2013.csv")

    if os.path.isfile(csv_path):
        logger.info("FER-2013 CSV already exists at %s — skipping download.", csv_path)
        return csv_path

    logger.info("Downloading FER-2013 dataset from Kaggle …")
    try:
        from kaggle.api.kaggle_api_extended import KaggleApi

        api = KaggleApi()
        api.authenticate()
        # The canonical dataset slug on Kaggle
        api.dataset_download_files(
            "msambare/fer2013", path=data_dir, unzip=True
        )
    except Exception:
        # Fallback: try the competition dataset slug
        try:
            from kaggle.api.kaggle_api_extended import KaggleApi

            api = KaggleApi()
            api.authenticate()
            api.competition_download_files(
                "challenges-in-representation-learning-facial-expression-recognition-challenge",
                path=data_dir,
            )
            # Competition downloads come as a zip
            import zipfile

            for fname in os.listdir(data_dir):
                if fname.endswith(".zip"):
                    with zipfile.ZipFile(os.path.join(data_dir, fname), "r") as zf:
                        zf.extractall(data_dir)
                    os.remove(os.path.join(data_dir, fname))
        except Exception as exc:
            logger.error(
                "Failed to download FER-2013 from Kaggle. "
                "Ensure your Kaggle credentials are configured.\n%s",
                exc,
            )
            sys.exit(1)

    # The dataset may land as fer2013.csv or inside a subdirectory
    if not os.path.isfile(csv_path):
        # Search recursively for the CSV
        for root, _dirs, files in os.walk(data_dir):
            for f in files:
                if f.lower() == "fer2013.csv":
                    found = os.path.join(root, f)
                    if found != csv_path:
                        os.rename(found, csv_path)
                    return csv_path
        # If still not found, check for icml variant
        alt = os.path.join(data_dir, "icml_face_data.csv")
        if os.path.isfile(alt):
            csv_path = alt
        else:
            logger.error("Could not locate fer2013.csv after download.")
            sys.exit(1)

    logger.info("FER-2013 CSV ready at %s", csv_path)
    return csv_path


def load_fer2013(csv_path: str) -> pd.DataFrame:
    """Load FER-2013 CSV and return a DataFrame with columns: emotion, pixels."""
    logger.info("Loading FER-2013 data from %s …", csv_path)
    df = pd.read_csv(csv_path)

    # Normalise column names (some versions differ in casing / naming)
    df.columns = [c.strip().lower() for c in df.columns]

    if "emotion" not in df.columns or "pixels" not in df.columns:
        # Handle icml_face_data.csv format
        rename_map = {}
        for col in df.columns:
            if "emotion" in col:
                rename_map[col] = "emotion"
            if "pixel" in col.lower():
                rename_map[col] = "pixels"
        df.rename(columns=rename_map, inplace=True)

    required = {"emotion", "pixels"}
    if not required.issubset(set(df.columns)):
        logger.error(
            "CSV must contain 'emotion' and 'pixels' columns. Found: %s",
            list(df.columns),
        )
        sys.exit(1)

    logger.info("Loaded %d samples.", len(df))
    return df


def pixels_to_image(pixel_string: str) -> np.ndarray:
    """Convert a space-separated pixel string to a 48×48 uint8 grayscale image."""
    pixels = np.fromstring(pixel_string, dtype=np.uint8, sep=" ")
    return pixels.reshape(IMG_SIZE, IMG_SIZE)


def extract_facemesh_landmarks(
    image_gray: np.ndarray,
    face_mesh,
) -> np.ndarray | None:
    """
    Run MediaPipe FaceMesh on a single grayscale image and return a flat
    array of [x0, y0, z0, x1, y1, z1, …] for all 468 landmarks.

    Returns None if no face is detected.
    """
    # FaceMesh expects an RGB image
    image_rgb = cv2.cvtColor(image_gray, cv2.COLOR_GRAY2RGB)
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


def process_dataset(
    df: pd.DataFrame,
    split_name: str,
) -> pd.DataFrame:
    """
    Extract FaceMesh landmarks for every image in *df* and return a new
    DataFrame with columns: [image_index, emotion, emotion_label, lm0_x, …].

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

    # Initialise FaceMesh once per split for performance
    mp_face_mesh = mp.solutions.face_mesh
    with mp_face_mesh.FaceMesh(
        static_image_mode=True,
        max_num_faces=1,
        refine_landmarks=False,
        min_detection_confidence=0.3,
    ) as face_mesh:
        for idx, row in df.iterrows():
            img = pixels_to_image(row["pixels"])
            landmarks = extract_facemesh_landmarks(img, face_mesh)

            if landmarks is None:
                skipped += 1
                continue

            record = {
                "image_index": idx,
                "emotion": int(row["emotion"]),
                "emotion_label": EMOTION_MAP.get(int(row["emotion"]), "Unknown"),
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
        "  [%s] Done. Extracted: %d, Skipped (no face): %d",
        split_name,
        len(records),
        skipped,
    )

    result_df = pd.DataFrame(records)
    # Ensure column order
    ordered_cols = ["image_index", "emotion", "emotion_label"] + feature_cols
    # Only keep columns that exist (in case of empty DataFrame)
    ordered_cols = [c for c in ordered_cols if c in result_df.columns]
    return result_df[ordered_cols]


def main():
    parser = argparse.ArgumentParser(
        description="FER-2013 FaceMesh feature extraction pipeline."
    )
    parser.add_argument(
        "--data-dir",
        type=str,
        default=os.path.join(os.path.dirname(__file__), "data"),
        help="Directory to download/store FER-2013 data (default: ./data)",
    )
    parser.add_argument(
        "--output-dir",
        type=str,
        default=os.path.join(os.path.dirname(__file__), "output"),
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
    # 1. Download FER-2013
    # ------------------------------------------------------------------
    csv_path = download_fer2013(args.data_dir)

    # ------------------------------------------------------------------
    # 2. Load dataset
    # ------------------------------------------------------------------
    df = load_fer2013(csv_path)

    # ------------------------------------------------------------------
    # 3. Split: 70% train, 15% val, 15% test (stratified by emotion)
    # ------------------------------------------------------------------
    logger.info("Splitting data: 70%% train / 15%% val / 15%% test …")

    # First split: 70% train, 30% remaining
    df_train, df_remaining = train_test_split(
        df,
        test_size=(VAL_RATIO + TEST_RATIO),
        random_state=args.seed,
        stratify=df["emotion"],
    )

    # Second split: divide remaining 30% into 15% val + 15% test (50/50)
    df_val, df_test = train_test_split(
        df_remaining,
        test_size=TEST_RATIO / (VAL_RATIO + TEST_RATIO),
        random_state=args.seed,
        stratify=df_remaining["emotion"],
    )

    logger.info(
        "Split sizes → Train: %d, Val: %d, Test: %d",
        len(df_train),
        len(df_val),
        len(df_test),
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
        features_df = process_dataset(split_df.reset_index(drop=True), split_name)

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
            logger.info("  %-6s: %s (%d rows)", split_name, fpath, row_count)
    logger.info("=" * 60)
    logger.info(
        "Each CSV contains: image_index, emotion (0-6), emotion_label, "
        "and %d landmark features (468 landmarks × 3 coords [x, y, z]).",
        TOTAL_FEATURES,
    )


if __name__ == "__main__":
    main()
