const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const moment = require('moment');
const _ = require('lodash');
const logger = require('./logger');

class DataManager {
  constructor() {
    this.dataPath = path.join(__dirname, '../data');
    this.schoolDataFile = path.join(this.dataPath, 'school-data.json');
    this.backupPath = path.join(this.dataPath, 'backups');
    this.schoolData = null;
    this.lastBackup = null;
    this.isInitialized = false;
  }

  async initialize() {
    try {
      // Ensure data directory exists
      await this.ensureDirectories();

      // Load school data
      await this.loadSchoolData();

      // Set up automatic backups
      this.setupAutoBackup();

      this.isInitialized = true;
      logger.info('DataManager initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize DataManager:', error);
      throw error;
    }
  }

  async ensureDirectories() {
    try {
      await fs.access(this.dataPath);
    } catch {
      await fs.mkdir(this.dataPath, { recursive: true });
    }

    try {
      await fs.access(this.backupPath);
    } catch {
      await fs.mkdir(this.backupPath, { recursive: true });
    }
  }

  async loadSchoolData() {
    try {
      const data = await fs.readFile(this.schoolDataFile, 'utf8');
      this.schoolData = JSON.parse(data);
      logger.info('School data loaded successfully');
    } catch (error) {
      if (error.code === 'ENOENT') {
        // Create default data if file doesn't exist
        this.schoolData = await this.createDefaultData();
        await this.saveSchoolData();
        logger.info('Created default school data');
      } else {
        throw error;
      }
    }
  }

  async createDefaultData() {
    return {
      school: {
        id: "SCH001",
        name: "Modern International School",
        address: "Sector 15, Gurgaon, Haryana, India",
        principal: "Dr. Priya Sharma",
        totalStudents: 0,
        totalTeachers: 0,
        grades: ["Pre-K", "K", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"],
        established: 2010,
        board: "CBSE",
        contact: {
          phone: "+91-124-4567890",
          email: "info@modernintschool.edu",
          website: "www.modernintschool.edu"
        },
        facilities: ["Library", "Computer Lab", "Science Lab", "Sports Complex", "Auditorium", "Cafeteria"]
      },
      students: [],
      teachers: [],
      finance: {
        totalRevenue: 0,
        totalExpenses: 0,
        netProfit: 0,
        pendingFees: 0,
        salaryExpenses: 0,
        infrastructureExpenses: 0,
        operationalExpenses: 0,
        monthlyBreakdown: [],
        expenseCategories: [],
        revenueStreams: [],
        budgetAllocations: {
          academics: 40,
          infrastructure: 25,
          sports: 15,
          extracurricular: 10,
          administration: 10
        }
      },
      inventory: [],
      events: [],
      classes: [],
      assignments: [],
      examinations: [],
      notifications: [],
      holidays: [],
      transportation: [],
      library: {
        totalBooks: 0,
        categories: [],
        digitalResources: {},
        issuedBooks: []
      },
      cafeteria: {
        menuItems: [],
        weeklyMenu: {}
      },
      healthRecords: [],
      extracurricular: [],
      infrastructure: {
        classrooms: 0,
        laboratories: 0,
        library: 1,
        auditorium: 1,
        sportsGround: 1,
        cafeteria: 1,
        facilities: []
      },
      metadata: {
        version: "1.0.0",
        lastUpdated: new Date().toISOString(),
        createdAt: new Date().toISOString()
      }
    };
  }

  async saveSchoolData() {
    try {
      this.schoolData.metadata.lastUpdated = new Date().toISOString();
      const dataString = JSON.stringify(this.schoolData, null, 2);
      await fs.writeFile(this.schoolDataFile, dataString, 'utf8');
      logger.info('School data saved successfully');
    } catch (error) {
      logger.error('Failed to save school data:', error);
      throw error;
    }
  }

  async createBackup() {
    try {
      const timestamp = moment().format('YYYY-MM-DD_HH-mm-ss');
      const backupFile = path.join(this.backupPath, `backup_${timestamp}.json`);
      
      const dataString = JSON.stringify(this.schoolData, null, 2);
      await fs.writeFile(backupFile, dataString, 'utf8');
      
      this.lastBackup = new Date();
      logger.info(`Backup created: ${backupFile}`);
      
      // Clean old backups (keep last 30)
      await this.cleanOldBackups();
      
      return backupFile;
    } catch (error) {
      logger.error('Failed to create backup:', error);
      throw error;
    }
  }

  async cleanOldBackups() {
    try {
      const files = await fs.readdir(this.backupPath);
      const backupFiles = files
        .filter(file => file.startsWith('backup_') && file.endsWith('.json'))
        .map(file => ({
          name: file,
          path: path.join(this.backupPath, file),
          stat: fs.stat(path.join(this.backupPath, file))
        }));

      const fileStats = await Promise.all(
        backupFiles.map(async (file) => ({
          ...file,
          stat: await file.stat
        }))
      );

      // Sort by creation time and keep only last 30
      const sortedFiles = fileStats.sort((a, b) => b.stat.mtime - a.stat.mtime);
      const filesToDelete = sortedFiles.slice(30);

      for (const file of filesToDelete) {
        await fs.unlink(file.path);
        logger.info(`Deleted old backup: ${file.name}`);
      }
    } catch (error) {
      logger.error('Failed to clean old backups:', error);
    }
  }

  setupAutoBackup() {
    // Create backup every hour
    setInterval(async () => {
      try {
        await this.createBackup();
      } catch (error) {
        logger.error('Auto backup failed:', error);
      }
    }, 60 * 60 * 1000); // 1 hour
  }

  // API Methods
  async getSchoolData(schoolId = null) {
    if (!this.isInitialized) {
      throw new Error('DataManager not initialized');
    }
    return _.cloneDeep(this.schoolData);
  }

  async getStudents(filters = {}) {
    let students = _.cloneDeep(this.schoolData.students);
    
    if (filters.grade) {
      students = students.filter(s => s.grade === filters.grade);
    }
    
    if (filters.section) {
      students = students.filter(s => s.section === filters.section);
    }
    
    if (filters.pendingFees) {
      students = students.filter(s => s.fees.pending > 0);
    }
    
    return students;
  }

  async getStudent(studentId) {
    const student = this.schoolData.students.find(s => s.id === studentId);
    return student ? _.cloneDeep(student) : null;
  }

  async addStudent(studentData) {
    const newStudent = {
      id: uuidv4(),
      ...studentData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    this.schoolData.students.push(newStudent);
    this.schoolData.school.totalStudents = this.schoolData.students.length;
    
    await this.saveSchoolData();
    logger.info(`Student added: ${newStudent.name} (${newStudent.id})`);
    
    return _.cloneDeep(newStudent);
  }

  async updateStudent(studentId, updates) {
    const studentIndex = this.schoolData.students.findIndex(s => s.id === studentId);
    
    if (studentIndex === -1) {
      throw new Error('Student not found');
    }
    
    this.schoolData.students[studentIndex] = {
      ...this.schoolData.students[studentIndex],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    await this.saveSchoolData();
    logger.info(`Student updated: ${studentId}`);
    
    return _.cloneDeep(this.schoolData.students[studentIndex]);
  }

  async deleteStudent(studentId) {
    const studentIndex = this.schoolData.students.findIndex(s => s.id === studentId);
    
    if (studentIndex === -1) {
      throw new Error('Student not found');
    }
    
    const deletedStudent = this.schoolData.students.splice(studentIndex, 1)[0];
    this.schoolData.school.totalStudents = this.schoolData.students.length;
    
    await this.saveSchoolData();
    logger.info(`Student deleted: ${deletedStudent.name} (${studentId})`);
    
    return true;
  }

  // Similar methods for Teachers
  async getTeachers(filters = {}) {
    let teachers = _.cloneDeep(this.schoolData.teachers);
    
    if (filters.subject) {
      teachers = teachers.filter(t => t.subject === filters.subject);
    }
    
    if (filters.performance) {
      teachers = teachers.filter(t => t.performance === filters.performance);
    }
    
    return teachers;
  }

  async addTeacher(teacherData) {
    const newTeacher = {
      id: uuidv4(),
      employeeId: `TCH-${String(this.schoolData.teachers.length + 1).padStart(3, '0')}`,
      ...teacherData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    this.schoolData.teachers.push(newTeacher);
    this.schoolData.school.totalTeachers = this.schoolData.teachers.length;
    
    await this.saveSchoolData();
    logger.info(`Teacher added: ${newTeacher.name} (${newTeacher.id})`);
    
    return _.cloneDeep(newTeacher);
  }

  async updateTeacher(teacherId, updates) {
    const teacherIndex = this.schoolData.teachers.findIndex(t => t.id === teacherId);
    
    if (teacherIndex === -1) {
      throw new Error('Teacher not found');
    }
    
    this.schoolData.teachers[teacherIndex] = {
      ...this.schoolData.teachers[teacherIndex],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    await this.saveSchoolData();
    logger.info(`Teacher updated: ${teacherId}`);
    
    return _.cloneDeep(this.schoolData.teachers[teacherIndex]);
  }

  // Finance methods
  async getFinanceData() {
    return _.cloneDeep(this.schoolData.finance);
  }

  async updateFinanceData(updates) {
    this.schoolData.finance = {
      ...this.schoolData.finance,
      ...updates,
      lastUpdated: new Date().toISOString()
    };
    
    await this.saveSchoolData();
    logger.info('Finance data updated');
    
    return _.cloneDeep(this.schoolData.finance);
  }

  // Inventory methods
  async getInventory(filters = {}) {
    let inventory = _.cloneDeep(this.schoolData.inventory);
    
    if (filters.category) {
      inventory = inventory.filter(item => item.category === filters.category);
    }
    
    if (filters.lowStock) {
      inventory = inventory.filter(item => item.quantity < item.minStock);
    }
    
    return inventory;
  }

  async addInventoryItem(itemData) {
    const newItem = {
      id: uuidv4(),
      ...itemData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    this.schoolData.inventory.push(newItem);
    
    await this.saveSchoolData();
    logger.info(`Inventory item added: ${newItem.item} (${newItem.id})`);
    
    return _.cloneDeep(newItem);
  }

  async updateInventoryItem(itemId, updates) {
    const itemIndex = this.schoolData.inventory.findIndex(item => item.id === itemId);
    
    if (itemIndex === -1) {
      throw new Error('Inventory item not found');
    }
    
    this.schoolData.inventory[itemIndex] = {
      ...this.schoolData.inventory[itemIndex],
      ...updates,
      lastUpdated: new Date().toISOString()
    };
    
    await this.saveSchoolData();
    logger.info(`Inventory item updated: ${itemId}`);
    
    return _.cloneDeep(this.schoolData.inventory[itemIndex]);
  }

  // Analytics methods
  async getAnalytics(type = 'overview') {
    const analytics = {
      students: {
        total: this.schoolData.students.length,
        byGrade: _.countBy(this.schoolData.students, 'grade'),
        averageAttendance: this.calculateAverageAttendance(),
        academicPerformance: this.calculateAcademicPerformance()
      },
      teachers: {
        total: this.schoolData.teachers.length,
        bySubject: _.countBy(this.schoolData.teachers, 'subject'),
        averageExperience: this.calculateAverageTeacherExperience(),
        performanceDistribution: _.countBy(this.schoolData.teachers, 'performance')
      },
      finance: _.cloneDeep(this.schoolData.finance),
      inventory: {
        total: this.schoolData.inventory.length,
        totalValue: this.calculateInventoryValue(),
        lowStock: this.schoolData.inventory.filter(item => item.quantity < item.minStock).length,
        byCategory: _.countBy(this.schoolData.inventory, 'category')
      }
    };
    
    return analytics;
  }

  calculateAverageAttendance() {
    if (this.schoolData.students.length === 0) return 0;
    
    const totalAttendance = this.schoolData.students.reduce(
      (sum, student) => sum + student.attendance.percentage, 0
    );
    
    return (totalAttendance / this.schoolData.students.length).toFixed(1);
  }

  calculateAcademicPerformance() {
    if (this.schoolData.students.length === 0) return {};
    
    const subjects = Object.keys(this.schoolData.students[0]?.grades || {});
    const performance = {};
    
    subjects.forEach(subject => {
      const total = this.schoolData.students.reduce(
        (sum, student) => sum + (student.grades[subject] || 0), 0
      );
      performance[subject] = (total / this.schoolData.students.length).toFixed(1);
    });
    
    return performance;
  }

  calculateAverageTeacherExperience() {
    if (this.schoolData.teachers.length === 0) return 0;
    
    const totalExperience = this.schoolData.teachers.reduce(
      (sum, teacher) => sum + teacher.experience, 0
    );
    
    return (totalExperience / this.schoolData.teachers.length).toFixed(1);
  }

  calculateInventoryValue() {
    return this.schoolData.inventory.reduce(
      (sum, item) => sum + item.totalValue, 0
    );
  }

  // Generic update method for real-time updates
  async updateData(type, schoolId, updates) {
    try {
      let result;
      
      switch (type) {
        case 'student':
          result = await this.updateStudent(updates.id, updates.data);
          break;
        case 'teacher':
          result = await this.updateTeacher(updates.id, updates.data);
          break;
        case 'finance':
          result = await this.updateFinanceData(updates.data);
          break;
        case 'inventory':
          result = await this.updateInventoryItem(updates.id, updates.data);
          break;
        default:
          throw new Error(`Unknown update type: ${type}`);
      }
      
      return { success: true, data: result };
    } catch (error) {
      logger.error(`Update failed for ${type}:`, error);
      return { success: false, error: error.message };
    }
  }

  // Health check
  isHealthy() {
    return this.isInitialized && this.schoolData !== null;
  }

  // Get system stats
  getStats() {
    return {
      isInitialized: this.isInitialized,
      lastBackup: this.lastBackup,
      dataSize: JSON.stringify(this.schoolData).length,
      lastUpdated: this.schoolData?.metadata?.lastUpdated
    };
  }
}

module.exports = new DataManager();