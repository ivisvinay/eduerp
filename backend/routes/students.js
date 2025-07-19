const express = require('express');
const router = express.Router();
const Joi = require('joi');
const dataManager = require('../services/dataManager');
const logger = require('../services/logger');
const { asyncHandler } = require('../middleware/asyncHandler');
const { validateRequest } = require('../middleware/validation');

// Validation schemas
const studentSchema = Joi.object({
  name: Joi.string().required().min(2).max(100),
  rollNumber: Joi.string().required(),
  grade: Joi.string().required(),
  section: Joi.string().required(),
  dateOfBirth: Joi.string().isoDate().required(),
  gender: Joi.string().valid('Male', 'Female', 'Other').required(),
  bloodGroup: Joi.string().valid('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'),
  parentName: Joi.string().required().min(2).max(100),
  parentPhone: Joi.string().required().pattern(/^\+?[1-9]\d{1,14}$/),
  parentEmail: Joi.string().email().required(),
  emergencyContact: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/),
  address: Joi.string().required().max(500),
  admissionDate: Joi.string().isoDate().required(),
  fees: Joi.object({
    annual: Joi.number().positive().required(),
    paid: Joi.number().min(0).default(0),
    pending: Joi.number().min(0),
    dueDate: Joi.string().isoDate().required()
  }),
  grades: Joi.object().pattern(
    Joi.string(),
    Joi.number().min(0).max(100)
  ),
  attendance: Joi.object({
    present: Joi.number().min(0).default(0),
    absent: Joi.number().min(0).default(0),
    total: Joi.number().min(0).default(0),
    percentage: Joi.number().min(0).max(100).default(100)
  }),
  behavior: Joi.string().valid('Outstanding', 'Excellent', 'Very Good', 'Good', 'Needs Improvement'),
  achievements: Joi.array().items(Joi.string()),
  extracurricular: Joi.array().items(Joi.string()),
  medicalInfo: Joi.object({
    allergies: Joi.array().items(Joi.string()),
    medications: Joi.array().items(Joi.string()),
    specialNeeds: Joi.string()
  })
});

const updateStudentSchema = studentSchema.fork(
  ['name', 'rollNumber', 'grade', 'section', 'dateOfBirth', 'gender', 'parentName', 'parentPhone', 'parentEmail', 'address', 'admissionDate'],
  (schema) => schema.optional()
);

// GET /api/students - Get all students with optional filters
router.get('/', asyncHandler(async (req, res) => {
  const { grade, section, pendingFees, search, limit = 50, offset = 0 } = req.query;
  
  const filters = {};
  if (grade) filters.grade = grade;
  if (section) filters.section = section;
  if (pendingFees === 'true') filters.pendingFees = true;
  
  let students = await dataManager.getStudents(filters);
  
  // Search functionality
  if (search) {
    const searchTerm = search.toLowerCase();
    students = students.filter(student => 
      student.name.toLowerCase().includes(searchTerm) ||
      student.rollNumber.toLowerCase().includes(searchTerm) ||
      student.parentName.toLowerCase().includes(searchTerm)
    );
  }
  
  // Pagination
  const total = students.length;
  const paginatedStudents = students.slice(parseInt(offset), parseInt(offset) + parseInt(limit));
  
  res.json({
    success: true,
    data: {
      students: paginatedStudents,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: parseInt(offset) + parseInt(limit) < total
      }
    },
    timestamp: new Date().toISOString()
  });
}));

// GET /api/students/:id - Get specific student
router.get('/:id', asyncHandler(async (req, res) => {
  const student = await dataManager.getStudent(req.params.id);
  
  if (!student) {
    return res.status(404).json({
      success: false,
      error: 'Student not found',
      timestamp: new Date().toISOString()
    });
  }
  
  res.json({
    success: true,
    data: { student },
    timestamp: new Date().toISOString()
  });
}));

// POST /api/students - Add new student
router.post('/', validateRequest(studentSchema), asyncHandler(async (req, res) => {
  const studentData = req.body;
  
  // Check if roll number already exists
  const existingStudents = await dataManager.getStudents();
  const existingStudent = existingStudents.find(s => s.rollNumber === studentData.rollNumber);
  
  if (existingStudent) {
    return res.status(400).json({
      success: false,
      error: 'Student with this roll number already exists',
      timestamp: new Date().toISOString()
    });
  }
  
  // Calculate pending fees
  if (studentData.fees) {
    studentData.fees.pending = studentData.fees.annual - (studentData.fees.paid || 0);
  }
  
  const newStudent = await dataManager.addStudent(studentData);
  
  logger.info(`New student added: ${newStudent.name} (${newStudent.id})`);
  
  res.status(201).json({
    success: true,
    data: { student: newStudent },
    message: 'Student added successfully',
    timestamp: new Date().toISOString()
  });
}));

// PUT /api/students/:id - Update student
router.put('/:id', validateRequest(updateStudentSchema), asyncHandler(async (req, res) => {
  const studentId = req.params.id;
  const updates = req.body;
  
  // Check if student exists
  const existingStudent = await dataManager.getStudent(studentId);
  if (!existingStudent) {
    return res.status(404).json({
      success: false,
      error: 'Student not found',
      timestamp: new Date().toISOString()
    });
  }
  
  // Check if roll number is being changed and if it conflicts
  if (updates.rollNumber && updates.rollNumber !== existingStudent.rollNumber) {
    const allStudents = await dataManager.getStudents();
    const conflictingStudent = allStudents.find(s => 
      s.rollNumber === updates.rollNumber && s.id !== studentId
    );
    
    if (conflictingStudent) {
      return res.status(400).json({
        success: false,
        error: 'Roll number already exists for another student',
        timestamp: new Date().toISOString()
      });
    }
  }
  
  // Recalculate pending fees if fee data is updated
  if (updates.fees) {
    const currentFees = existingStudent.fees;
    const newFees = { ...currentFees, ...updates.fees };
    newFees.pending = newFees.annual - newFees.paid;
    updates.fees = newFees;
  }
  
  const updatedStudent = await dataManager.updateStudent(studentId, updates);
  
  logger.info(`Student updated: ${updatedStudent.name} (${studentId})`);
  
  res.json({
    success: true,
    data: { student: updatedStudent },
    message: 'Student updated successfully',
    timestamp: new Date().toISOString()
  });
}));

// DELETE /api/students/:id - Delete student
router.delete('/:id', asyncHandler(async (req, res) => {
  const studentId = req.params.id;
  
  // Check if student exists
  const existingStudent = await dataManager.getStudent(studentId);
  if (!existingStudent) {
    return res.status(404).json({
      success: false,
      error: 'Student not found',
      timestamp: new Date().toISOString()
    });
  }
  
  await dataManager.deleteStudent(studentId);
  
  logger.info(`Student deleted: ${existingStudent.name} (${studentId})`);
  
  res.json({
    success: true,
    message: 'Student deleted successfully',
    timestamp: new Date().toISOString()
  });
}));

// GET /api/students/:id/performance - Get student performance analytics
router.get('/:id/performance', asyncHandler(async (req, res) => {
  const student = await dataManager.getStudent(req.params.id);
  
  if (!student) {
    return res.status(404).json({
      success: false,
      error: 'Student not found',
      timestamp: new Date().toISOString()
    });
  }
  
  // Calculate performance metrics
  const grades = Object.values(student.grades || {});
  const averageGrade = grades.length > 0 ? grades.reduce((sum, grade) => sum + grade, 0) / grades.length : 0;
  
  const performance = {
    student: {
      id: student.id,
      name: student.name,
      grade: student.grade,
      section: student.section
    },
    academic: {
      subjects: student.grades || {},
      average: parseFloat(averageGrade.toFixed(2)),
      trend: 'stable', // This could be calculated from historical data
      strengths: Object.entries(student.grades || {})
        .filter(([subject, grade]) => grade >= 85)
        .map(([subject]) => subject),
      improvements: Object.entries(student.grades || {})
        .filter(([subject, grade]) => grade < 70)
        .map(([subject]) => subject)
    },
    attendance: {
      ...student.attendance,
      status: student.attendance.percentage >= 95 ? 'Excellent' : 
              student.attendance.percentage >= 90 ? 'Good' : 
              student.attendance.percentage >= 80 ? 'Fair' : 'Poor'
    },
    behavior: {
      current: student.behavior,
      achievements: student.achievements || [],
      extracurricular: student.extracurricular || []
    },
    recommendations: generateRecommendations(student)
  };
  
  res.json({
    success: true,
    data: { performance },
    timestamp: new Date().toISOString()
  });
}));

// POST /api/students/:id/fees/payment - Record fee payment
router.post('/:id/fees/payment', asyncHandler(async (req, res) => {
  const studentId = req.params.id;
  const { amount, paymentMethod, transactionId, notes } = req.body;
  
  // Validation
  if (!amount || amount <= 0) {
    return res.status(400).json({
      success: false,
      error: 'Invalid payment amount',
      timestamp: new Date().toISOString()
    });
  }
  
  const student = await dataManager.getStudent(studentId);
  if (!student) {
    return res.status(404).json({
      success: false,
      error: 'Student not found',
      timestamp: new Date().toISOString()
    });
  }
  
  // Update fee information
  const currentFees = student.fees;
  const newPaidAmount = currentFees.paid + amount;
  const newPendingAmount = Math.max(0, currentFees.annual - newPaidAmount);
  
  const paymentRecord = {
    date: new Date().toISOString(),
    amount,
    paymentMethod: paymentMethod || 'cash',
    transactionId,
    notes
  };
  
  // Add payment to history
  if (!currentFees.paymentHistory) {
    currentFees.paymentHistory = [];
  }
  currentFees.paymentHistory.push(paymentRecord);
  
  const updatedFees = {
    ...currentFees,
    paid: newPaidAmount,
    pending: newPendingAmount
  };
  
  const updatedStudent = await dataManager.updateStudent(studentId, { fees: updatedFees });
  
  logger.info(`Fee payment recorded: ${student.name} - ₹${amount}`);
  
  res.json({
    success: true,
    data: { 
      student: updatedStudent,
      payment: paymentRecord
    },
    message: `Payment of ₹${amount} recorded successfully`,
    timestamp: new Date().toISOString()
  });
}));

// GET /api/students/analytics/summary - Get students analytics summary
router.get('/analytics/summary', asyncHandler(async (req, res) => {
  const students = await dataManager.getStudents();
  
  const analytics = {
    total: students.length,
    byGrade: students.reduce((acc, student) => {
      acc[student.grade] = (acc[student.grade] || 0) + 1;
      return acc;
    }, {}),
    bySection: students.reduce((acc, student) => {
      acc[student.section] = (acc[student.section] || 0) + 1;
      return acc;
    }, {}),
    averageFees: students.reduce((sum, student) => sum + (student.fees  ? student.fees.annual : 0), 0) / students.length || 0,
    averageAttendance: students.reduce((sum, student) => sum + (student.attendance ? student.attendance.percentage : 0), 0) / students.length || 0,
    topPerformers: students
      .filter(student => student.grades && Object.values(student.grades).length > 0)
      .sort((a, b) => {
        const avgA = Object.values(a.grades).reduce((sum, grade) => sum + grade, 0) / Object.values(a.grades).length;
        const avgB = Object.values(b.grades).reduce((sum, grade) => sum + grade, 0) / Object.values(b.grades).length;
        return avgB - avgA; // Sort descending
      })
      .slice(0, 10) // Top 10 performers
      .map(student => ({
        id: student.id,
        name: student.name,
        averageGrade: Object.values(student.grades || {}).reduce((sum, grade) => sum + grade, 0) / (Object.values(student.grades || {}).length || 1)
      })),
};
    res.json({
        success: true,
        data: { analytics },
        timestamp: new Date().toISOString()
    });
    }            