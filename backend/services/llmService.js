// services/llmService.js
const axios = require('axios');
const logger = require('./logger');
const cacheService = require('./cacheService');
const _ = require('lodash');

class LLMService {
  constructor() {
    this.baseUrl = process.env.OPEN_WEBUI_URL || 'https://chat.ivislabs.in';
    this.apiKey = process.env.OPEN_WEBUI_API_KEY;
    this.isConnected = false;
    this.availableModels = [];
    this.selectedModel = 'llama3.2:latest';
    this.requestTimeout = parseInt(process.env.LLM_TIMEOUT) || 30000;
    this.maxRetries = parseInt(process.env.LLM_MAX_RETRIES) || 3;
    
    // Rate limiting
    this.requestCount = 0;
    this.lastReset = Date.now();
    this.maxRequestsPerMinute = parseInt(process.env.LLM_RATE_LIMIT) || 60;
    
    this.initialized = false;
  }

  async initialize() {
    try {
      logger.info('Initializing LLM Service...');
      
      if (!this.apiKey) {
        throw new Error('OPEN_WEBUI_API_KEY not configured');
      }

      // Test connection and fetch models
      await this.testConnection();
      await this.fetchModels();
      
      this.initialized = true;
      logger.info(`LLM Service initialized successfully with model: ${this.selectedModel}`);
      
    } catch (error) {
      logger.error('LLM Service initialization failed:', error);
      throw error;
    }
  }

  async testConnection() {
    try {
      const response = await axios.get(`${this.baseUrl}/api/v1/models`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: this.requestTimeout
      });

      this.isConnected = response.status === 200;
      logger.info(`Open WebUI connection: ${this.isConnected ? 'Success' : 'Failed'}`);
      
      return this.isConnected;
    } catch (error) {
      this.isConnected = false;
      logger.error('Open WebUI connection test failed:', error.message);
      return false;
    }
  }

  async fetchModels() {
    try {
      const response = await axios.get(`${this.baseUrl}/api/v1/models`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: this.requestTimeout
      });

      this.availableModels = response.data.data || [];
      logger.info(`Found ${this.availableModels.length} available models`);

      // Prioritize llama3.2:latest
      const preferredModels = [
        'llama3.2:latest',
        'llama3.2',
        'llama3.2:3b',
        'llama3.1:latest',
        'llama3.1'
      ];

      for (const preferred of preferredModels) {
        const model = this.availableModels.find(m => m.id === preferred);
        if (model) {
          this.selectedModel = model.id;
          logger.info(`Selected preferred model: ${this.selectedModel}`);
          return;
        }
      }

      // Fallback to first available model
      if (this.availableModels.length > 0) {
        this.selectedModel = this.availableModels[0].id;
        logger.info(`Selected fallback model: ${this.selectedModel}`);
      }

    } catch (error) {
      logger.error('Failed to fetch models:', error);
    }
  }

  async setModel(modelId) {
    const model = this.availableModels.find(m => m.id === modelId);
    if (!model) {
      throw new Error(`Model ${modelId} not found`);
    }
    
    this.selectedModel = modelId;
    logger.info(`Model changed to: ${modelId}`);
  }

  checkRateLimit() {
    const now = Date.now();
    
    // Reset counter every minute
    if (now - this.lastReset > 60000) {
      this.requestCount = 0;
      this.lastReset = now;
    }
    
    if (this.requestCount >= this.maxRequestsPerMinute) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }
    
    this.requestCount++;
  }

  createSystemPrompt(schoolData) {
    return `You are EduCare AI, an intelligent assistant for ${schoolData.school?.name || 'the school'}'s ERP system.

SCHOOL CONTEXT:
- School: ${schoolData.school?.name}
- Principal: ${schoolData.school?.principal}
- Students: ${schoolData.students?.length || 0}
- Teachers: ${schoolData.teachers?.length || 0}
- Location: ${schoolData.school?.address}

CAPABILITIES:
You help with student management, teacher performance, financial analysis, inventory tracking, and educational insights.

RESPONSE GUIDELINES:
- Be professional, helpful, and concise
- Use clear formatting with bullet points
- Include specific data and statistics
- Provide actionable recommendations
- Focus on educational outcomes
- Use emojis sparingly for visual appeal

Always provide accurate information based on the provided school data context.`;
  }

  extractRelevantData(query, schoolData) {
    const lowerQuery = query.toLowerCase();
    const relevantData = {
      school: {
        name: schoolData.school?.name,
        totalStudents: schoolData.students?.length || 0,
        totalTeachers: schoolData.teachers?.length || 0
      }
    };

    // Extract data based on query intent
    if (lowerQuery.includes('student') || lowerQuery.includes('academic') || lowerQuery.includes('grade')) {
      relevantData.students = this.processStudentData(schoolData.students || []);
    }

    if (lowerQuery.includes('teacher') || lowerQuery.includes('staff') || lowerQuery.includes('faculty')) {
      relevantData.teachers = this.processTeacherData(schoolData.teachers || []);
    }

    if (lowerQuery.includes('finance') || lowerQuery.includes('fee') || lowerQuery.includes('money') || lowerQuery.includes('revenue')) {
      relevantData.finance = this.processFinanceData(schoolData.finance || {});
    }

    if (lowerQuery.includes('inventory') || lowerQuery.includes('stock') || lowerQuery.includes('equipment')) {
      relevantData.inventory = this.processInventoryData(schoolData.inventory || []);
    }

    return relevantData;
  }

  processStudentData(students) {
    if (!students.length) return { total: 0 };

    const avgAttendance = students.reduce((sum, s) => sum + (s.attendance?.percentage || 0), 0) / students.length;
    const pendingFees = students.filter(s => (s.fees?.pending || 0) > 0);
    
    return {
      total: students.length,
      averageAttendance: avgAttendance.toFixed(1),
      pendingFeesCount: pendingFees.length,
      pendingFeesAmount: pendingFees.reduce((sum, s) => sum + (s.fees?.pending || 0), 0),
      gradeDistribution: _.countBy(students, 'grade'),
      topPerformers: this.getTopPerformers(students, 5),
      needsAttention: this.getStudentsNeedingAttention(students)
    };
  }

  processTeacherData(teachers) {
    if (!teachers.length) return { total: 0 };

    const avgExperience = teachers.reduce((sum, t) => sum + (t.experience || 0), 0) / teachers.length;
    const avgSalary = teachers.reduce((sum, t) => sum + (t.salary || 0), 0) / teachers.length;

    return {
      total: teachers.length,
      averageExperience: avgExperience.toFixed(1),
      averageSalary: Math.round(avgSalary),
      subjectDistribution: _.countBy(teachers, 'subject'),
      performanceDistribution: _.countBy(teachers, 'performance'),
      totalSalaryExpense: teachers.reduce((sum, t) => sum + (t.salary || 0), 0)
    };
  }

  processFinanceData(finance) {
    const profitMargin = finance.totalRevenue ? 
      ((finance.netProfit || 0) / finance.totalRevenue * 100).toFixed(1) : '0';

    return {
      totalRevenue: finance.totalRevenue || 0,
      totalExpenses: finance.totalExpenses || 0,
      netProfit: finance.netProfit || 0,
      profitMargin,
      pendingFees: finance.pendingFees || 0,
      monthlyTrends: (finance.monthlyBreakdown || []).slice(-3),
      expenseCategories: finance.expenseCategories || []
    };
  }

  processInventoryData(inventory) {
    if (!inventory.length) return { total: 0 };

    const lowStock = inventory.filter(item => (item.quantity || 0) < (item.minStock || 0));
    const totalValue = inventory.reduce((sum, item) => sum + (item.totalValue || 0), 0);

    return {
      total: inventory.length,
      totalValue,
      lowStockCount: lowStock.length,
      categories: _.countBy(inventory, 'category'),
      lowStockItems: lowStock.map(item => ({
        item: item.item,
        current: item.quantity,
        minimum: item.minStock,
        category: item.category
      }))
    };
  }

  getTopPerformers(students, count = 5) {
    return students
      .map(s => {
        const grades = Object.values(s.grades || {});
        const average = grades.length ? grades.reduce((sum, g) => sum + g, 0) / grades.length : 0;
        return { name: s.name, grade: s.grade, average };
      })
      .sort((a, b) => b.average - a.average)
      .slice(0, count);
  }

  getStudentsNeedingAttention(students) {
    return students.filter(s => {
      const grades = Object.values(s.grades || {});
      const avgGrade = grades.length ? grades.reduce((sum, g) => sum + g, 0) / grades.length : 0;
      return avgGrade < 70 || (s.attendance?.percentage || 0) < 85 || (s.fees?.pending || 0) > 0;
    }).map(s => ({
      name: s.name,
      grade: s.grade,
      issues: [
        ...((Object.values(s.grades || {}).reduce((sum, g) => sum + g, 0) / Object.values(s.grades || {}).length) < 70 ? ['Low grades'] : []),
        ...((s.attendance?.percentage || 0) < 85 ? ['Poor attendance'] : []),
        ...((s.fees?.pending || 0) > 0 ? ['Pending fees'] : [])
      ]
    }));
  }

  async sendQuery(messages, options = {}) {
    try {
      this.checkRateLimit();

      if (!this.isConnected) {
        await this.testConnection();
        if (!this.isConnected) {
          throw new Error('LLM service is not connected');
        }
      }

      const payload = {
        model: this.selectedModel,
        messages,
        max_tokens: options.maxTokens || 800,
        temperature: options.temperature || 0.3,
        top_p: options.topP || 0.9,
        stream: false
      };

      const response = await axios.post(`${this.baseUrl}/api/v1/chat/completions`, payload, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: this.requestTimeout
      });

      if (!response.data.choices || !response.data.choices[0]) {
        throw new Error('Invalid response format from LLM');
      }

      return {
        success: true,
        response: response.data.choices[0].message.content,
        usage: response.data.usage,
        model: response.data.model || this.selectedModel
      };

    } catch (error) {
      logger.error('LLM query failed:', error.message);
      
      // Retry logic for transient errors
      if (options.retryCount < this.maxRetries && this.isRetryableError(error)) {
        logger.info(`Retrying LLM query (attempt ${options.retryCount + 1}/${this.maxRetries})`);
        return this.sendQuery(messages, { ...options, retryCount: (options.retryCount || 0) + 1 });
      }

      throw error;
    }
  }

  isRetryableError(error) {
    const retryableCodes = ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND'];
    return retryableCodes.includes(error.code) || 
           (error.response && [500, 502, 503, 504].includes(error.response.status));
  }

  async processSchoolQuery(query, schoolData, conversationHistory = [], metadata = {}) {
    try {
      // Check cache first
      const cacheKey = this.generateCacheKey(query, schoolData);
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        logger.info('Returning cached LLM response');
        return cached;
      }

      // Extract relevant data
      const relevantData = this.extractRelevantData(query, schoolData);
      
      // Build messages
      const messages = [
        {
          role: 'system',
          content: this.createSystemPrompt(schoolData)
        }
      ];

      // Add conversation history (last 6 exchanges)
      const recentHistory = conversationHistory.slice(-12);
      messages.push(...recentHistory);

      // Add current query with context
      messages.push({
        role: 'user',
        content: `${query}\n\nRelevant Data:\n${JSON.stringify(relevantData, null, 2)}\n\nPlease provide a comprehensive response with specific insights and recommendations.`
      });

      // Send to LLM
      const result = await this.sendQuery(messages);
      
      if (result.success) {
        const response = {
          success: true,
          response: result.response,
          usage: result.usage,
          model: result.model,
          suggestions: this.generateSuggestions(query, relevantData),
          timestamp: new Date().toISOString()
        };

        // Cache the response
        await cacheService.set(cacheKey, response, 300); // 5 minutes
        
        return response;
      } else {
        throw new Error('LLM query failed');
      }

    } catch (error) {
      logger.error('School query processing failed:', error);
      return {
        success: false,
        error: error.message,
        fallbackResponse: this.generateFallbackResponse(query, schoolData)
      };
    }
  }

  generateSuggestions(query, relevantData) {
    const suggestions = [];
    
    if (relevantData.students) {
      suggestions.push('Show top performing students', 'Which students need attention?');
    }
    if (relevantData.teachers) {
      suggestions.push('Analyze teacher performance', 'Show salary distribution');
    }
    if (relevantData.finance) {
      suggestions.push('Show financial trends', 'Analyze expense breakdown');
    }
    if (relevantData.inventory) {
      suggestions.push('Show low stock items', 'Analyze inventory value');
    }
    
    suggestions.push('Generate summary report', 'What insights do you have?');
    
    return suggestions.slice(0, 4);
  }

  generateFallbackResponse(query, schoolData) {
    const lowerQuery = query.toLowerCase();
    
    if (lowerQuery.includes('student')) {
      return `📚 **Student Overview** (Offline Mode)\n\n• Total Students: ${schoolData.students?.length || 0}\n• Please check the Students section for detailed information.`;
    }
    
    if (lowerQuery.includes('teacher')) {
      return `👨‍🏫 **Teacher Overview** (Offline Mode)\n\n• Total Teachers: ${schoolData.teachers?.length || 0}\n• Please check the Teachers section for detailed information.`;
    }
    
    if (lowerQuery.includes('finance')) {
      return `💰 **Financial Overview** (Offline Mode)\n\n• Total Revenue: ₹${(schoolData.finance?.totalRevenue || 0).toLocaleString()}\n• Please check the Finance section for detailed information.`;
    }
    
    return `I'm having trouble processing your request right now. Please try again or use the navigation menu to browse different sections.`;
  }

  generateCacheKey(query, schoolData) {
    const dataFingerprint = {
      studentsCount: schoolData.students?.length || 0,
      teachersCount: schoolData.teachers?.length || 0,
      lastUpdated: schoolData.metadata?.lastUpdated
    };
    
    return `llm_${Buffer.from(query + JSON.stringify(dataFingerprint)).toString('base64').slice(0, 20)}`;
  }

  async getConnectionStatus() {
    return {
      connected: this.isConnected,
      baseUrl: this.baseUrl,
      selectedModel: this.selectedModel,
      availableModels: this.availableModels.length,
      requestCount: this.requestCount,
      initialized: this.initialized
    };
  }

  async cleanup() {
    logger.info('Cleaning up LLM Service...');
    this.isConnected = false;
    this.initialized = false;
  }
}

module.exports = new LLMService();