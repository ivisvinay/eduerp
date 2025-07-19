// src/services/llmService.js - Open WebUI Compatible
class LLMService {
  constructor() {
    // Open WebUI endpoints
    this.baseUrl = process.env.REACT_APP_LLM_API_URL || 'https://chat.ivislabs.in';
    this.apiKey = process.env.REACT_APP_LLM_API_KEY;
    this.isConnected = false;
    this.availableModels = [];
    this.selectedModel = null;
    this.responseCache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    
    // Debug logging
    this.debugMode = process.env.REACT_APP_DEBUG_MODE === 'true';
    
    if (this.debugMode) {
      console.log('Open WebUI Service initialized with:', {
        baseUrl: this.baseUrl,
        hasApiKey: !!this.apiKey,
        debugMode: this.debugMode
      });
    }
  }

  log(message, data = null) {
    if (this.debugMode) {
      console.log(`[Open WebUI] ${message}`, data || '');
    }
  }

  error(message, error = null) {
    console.error(`[Open WebUI] ${message}`, error || '');
  }

  // Get available models from Open WebUI
  async getModels() {
    try {
      this.log('Fetching available models...');
      
      const response = await fetch(`${this.baseUrl}/api/models`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Models API failed: ${response.status}`);
      }

      const data = await response.json();
      this.log('Models response:', data);

      // Open WebUI returns models in data array
      this.availableModels = data.data || [];
      
      // Prioritize llama3.2:latest model
      const preferredModel = this.availableModels.find(model => 
        model.id === 'llama3.2:latest' || 
        model.id === 'llama3.2' ||
        model.id.includes('llama3.2')
      );
      
      if (preferredModel) {
        this.selectedModel = preferredModel.id;
        this.log('Selected preferred model:', this.selectedModel);
      } else if (this.availableModels.length > 0) {
        // Fallback to first available model
        this.selectedModel = this.availableModels[0].id;
        this.log('Selected fallback model:', this.selectedModel);
      }

      return this.availableModels;
    } catch (error) {
      this.error('Failed to fetch models:', error);
      return [];
    }
  }

  async testConnection() {
    try {
      this.log('Testing Open WebUI connection...');
      
      if (!this.apiKey) {
        this.error('No API key provided');
        return false;
      }

      // First, get available models
      const models = await this.getModels();
      if (models.length === 0) {
        this.error('No models available');
        return false;
      }

      // Test chat completion with the selected model (preferably llama3.2:latest)
      const testPayload = {
        model: this.selectedModel || 'llama3.2:latest',
        messages: [
          {
            role: 'user',
            content: 'Hello, respond with just "OK" if you receive this.'
          }
        ],
        max_tokens: 10,
        temperature: 0.1,
        stream: false
      };

      this.log('Test payload:', testPayload);

      const response = await fetch(`${this.baseUrl}/api/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(testPayload)
      });

      this.log('Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        this.error(`Connection test failed: ${response.status}`, errorText);
        return false;
      }

      const data = await response.json();
      this.log('Response data:', data);

      this.isConnected = true;
      this.log('Open WebUI connection successful');
      return true;

    } catch (error) {
      this.error('Connection test error:', error);
      this.isConnected = false;
      return false;
    }
  }

  // Create system prompt optimized for school data
  createSystemPrompt(schoolData) {
    return `You are EduCare AI, an intelligent assistant for ${schoolData.school.name}, a school management system.

SCHOOL CONTEXT:
- School: ${schoolData.school.name}
- Principal: ${schoolData.school.principal}
- Location: ${schoolData.school.address}
- Students: ${schoolData.students.length}
- Teachers: ${schoolData.teachers.length}
- Established: ${schoolData.school.established}
- Board: ${schoolData.school.board}

CAPABILITIES:
You can help with:
- Student information and performance analysis
- Teacher management and performance reviews
- Financial analysis and fee management
- Inventory tracking and procurement
- Event planning and management
- Academic reports and insights

RESPONSE GUIDELINES:
- Be professional, helpful, and concise
- Use clear formatting with bullet points
- Include specific data and statistics when relevant
- Provide actionable insights and recommendations
- Use emojis sparingly for visual appeal
- Focus on educational outcomes and school improvement
- Maintain student privacy while being informative

FORMATTING:
- Use **bold** for important points
- Use bullet points for lists
- Include relevant numbers and percentages
- Structure responses with clear sections when appropriate`;
  }

  // Extract relevant data based on query context
  extractRelevantData(query, schoolData) {
    const lowerQuery = query.toLowerCase();
    const data = {
      school: {
        name: schoolData.school.name,
        totalStudents: schoolData.students.length,
        totalTeachers: schoolData.teachers.length,
        principal: schoolData.school.principal
      }
    };

    // Student-related data
    if (lowerQuery.includes('student') || lowerQuery.includes('grade') || lowerQuery.includes('academic')) {
      data.students = {
        total: schoolData.students.length,
        gradeDistribution: this.getGradeDistribution(schoolData.students),
        averageAttendance: this.calculateAverageAttendance(schoolData.students),
        feeStatus: this.getFeeStatus(schoolData.students),
        topPerformers: this.getTopPerformers(schoolData.students, 5),
        needsAttention: this.getStudentsNeedingAttention(schoolData.students)
      };

      // Include specific student details if asking about individuals
      if (lowerQuery.includes('list') || lowerQuery.includes('show') || lowerQuery.includes('who')) {
        data.studentDetails = schoolData.students.slice(0, 10).map(s => ({
          name: s.name,
          grade: s.grade,
          section: s.section,
          attendance: s.attendance.percentage,
          averageGrade: this.calculateStudentAverage(s.grades),
          feesPending: s.fees.pending,
          behavior: s.behavior
        }));
      }
    }

    // Teacher-related data
    if (lowerQuery.includes('teacher') || lowerQuery.includes('staff') || lowerQuery.includes('faculty')) {
      data.teachers = {
        total: schoolData.teachers.length,
        subjects: [...new Set(schoolData.teachers.map(t => t.subject))],
        averageExperience: (schoolData.teachers.reduce((sum, t) => sum + t.experience, 0) / schoolData.teachers.length).toFixed(1),
        performanceDistribution: this.getPerformanceDistribution(schoolData.teachers),
        salaryStats: this.getSalaryStats(schoolData.teachers)
      };

      if (lowerQuery.includes('list') || lowerQuery.includes('show')) {
        data.teacherDetails = schoolData.teachers.map(t => ({
          name: t.name,
          subject: t.subject,
          experience: t.experience,
          performance: t.performance,
          salary: t.salary,
          classes: t.classes.length
        }));
      }
    }

    // Financial data
    if (lowerQuery.includes('finance') || lowerQuery.includes('money') || lowerQuery.includes('fee') || 
        lowerQuery.includes('revenue') || lowerQuery.includes('profit') || lowerQuery.includes('budget')) {
      data.finance = {
        totalRevenue: schoolData.finance.totalRevenue,
        totalExpenses: schoolData.finance.totalExpenses,
        netProfit: schoolData.finance.netProfit,
        profitMargin: ((schoolData.finance.netProfit / schoolData.finance.totalRevenue) * 100).toFixed(1),
        pendingFees: schoolData.finance.pendingFees,
        monthlyTrends: schoolData.finance.monthlyBreakdown.slice(-3),
        expenseBreakdown: schoolData.finance.expenseCategories,
        revenueStreams: schoolData.finance.revenueStreams
      };
    }

    // Inventory data
    if (lowerQuery.includes('inventory') || lowerQuery.includes('stock') || lowerQuery.includes('equipment') || 
        lowerQuery.includes('supply')) {
      const lowStockItems = schoolData.inventory.filter(item => item.quantity < item.minStock);
      data.inventory = {
        totalItems: schoolData.inventory.length,
        totalValue: schoolData.inventory.reduce((sum, item) => sum + item.totalValue, 0),
        lowStockCount: lowStockItems.length,
        categories: [...new Set(schoolData.inventory.map(item => item.category))],
        lowStockItems: lowStockItems.map(item => ({
          item: item.item,
          current: item.quantity,
          minimum: item.minStock,
          category: item.category,
          supplier: item.supplier
        }))
      };
    }

    // Event data
    if (lowerQuery.includes('event') || lowerQuery.includes('activity') || lowerQuery.includes('program')) {
      data.events = schoolData.events.map(e => ({
        title: e.title,
        date: e.date,
        type: e.type,
        participants: e.participants,
        budget: e.budget,
        spent: e.spentAmount,
        status: e.status
      }));
    }

    return data;
  }

  // Helper functions for data analysis
  getGradeDistribution(students) {
    return students.reduce((acc, student) => {
      acc[student.grade] = (acc[student.grade] || 0) + 1;
      return acc;
    }, {});
  }

  calculateAverageAttendance(students) {
    return (students.reduce((sum, s) => sum + s.attendance.percentage, 0) / students.length).toFixed(1);
  }

  getFeeStatus(students) {
    const pending = students.filter(s => s.fees.pending > 0);
    const totalPending = pending.reduce((sum, s) => sum + s.fees.pending, 0);
    const totalFees = students.reduce((sum, s) => sum + s.fees.annual, 0);
    const collected = students.reduce((sum, s) => sum + s.fees.paid, 0);
    
    return {
      studentsWithPending: pending.length,
      totalPendingAmount: totalPending,
      collectionRate: ((collected / totalFees) * 100).toFixed(1)
    };
  }

  calculateStudentAverage(grades) {
    const values = Object.values(grades);
    return values.length > 0 ? (values.reduce((sum, grade) => sum + grade, 0) / values.length).toFixed(1) : 0;
  }

  getTopPerformers(students, count = 5) {
    return students
      .map(s => ({
        name: s.name,
        grade: s.grade,
        average: parseFloat(this.calculateStudentAverage(s.grades))
      }))
      .sort((a, b) => b.average - a.average)
      .slice(0, count);
  }

  getStudentsNeedingAttention(students) {
    return students.filter(s => {
      const avgGrade = parseFloat(this.calculateStudentAverage(s.grades));
      return avgGrade < 70 || s.attendance.percentage < 85 || s.fees.pending > 0;
    }).map(s => ({
      name: s.name,
      grade: s.grade,
      issues: [
        ...(parseFloat(this.calculateStudentAverage(s.grades)) < 70 ? ['Low grades'] : []),
        ...(s.attendance.percentage < 85 ? ['Poor attendance'] : []),
        ...(s.fees.pending > 0 ? ['Pending fees'] : [])
      ]
    }));
  }

  getPerformanceDistribution(teachers) {
    return teachers.reduce((acc, teacher) => {
      acc[teacher.performance] = (acc[teacher.performance] || 0) + 1;
      return acc;
    }, {});
  }

  getSalaryStats(teachers) {
    const salaries = teachers.map(t => t.salary);
    return {
      average: (salaries.reduce((sum, s) => sum + s, 0) / salaries.length).toFixed(0),
      min: Math.min(...salaries),
      max: Math.max(...salaries),
      total: salaries.reduce((sum, s) => sum + s, 0)
    };
  }

  async sendQuery(query, schoolData, conversationHistory = []) {
    try {
      this.log('Sending query to Open WebUI:', query);

      if (!this.apiKey) {
        throw new Error('No API key configured');
      }

      if (!this.selectedModel) {
        await this.getModels();
        if (!this.selectedModel) {
          throw new Error('No models available');
        }
      }

      // Extract relevant data
      const relevantData = this.extractRelevantData(query, schoolData);
      this.log('Extracted relevant data keys:', Object.keys(relevantData));

      // Build messages array
      const messages = [
        {
          role: 'system',
          content: this.createSystemPrompt(schoolData)
        }
      ];

      // Add conversation history (last 4 exchanges)
      const recentHistory = conversationHistory.slice(-8);
      messages.push(...recentHistory);

      // Add current query with context
      const contextualQuery = `${query}

RELEVANT DATA:
${JSON.stringify(relevantData, null, 2)}

Please provide a comprehensive, helpful response based on this school data. Include specific insights and actionable recommendations.`;

      messages.push({
        role: 'user',
        content: contextualQuery
      });

      const payload = {
        model: this.selectedModel,
        messages: messages,
        max_tokens: 800,
        temperature: 0.3,
        top_p: 0.9,
        stream: false
      };

      this.log('Open WebUI payload:', {
        model: payload.model,
        messageCount: payload.messages.length,
        maxTokens: payload.max_tokens
      });

      const response = await fetch(`${this.baseUrl}/api/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      this.log('Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        this.error(`API request failed: ${response.status}`, errorText);
        throw new Error(`API Error ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      this.log('API response received');

      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error('Invalid response format from Open WebUI');
      }

      return {
        success: true,
        response: data.choices[0].message.content,
        usage: data.usage,
        model: data.model || this.selectedModel,
        suggestions: this.generateSuggestions(query, relevantData)
      };

    } catch (error) {
      this.error('Query failed:', error);
      return {
        success: false,
        error: error.message,
        fallbackResponse: this.generateFallbackResponse(query, schoolData)
      };
    }
  }

  generateSuggestions(query, relevantData) {
    const suggestions = [];
    const lowerQuery = query.toLowerCase();

    if (relevantData.students) {
      suggestions.push(
        'Show top performing students',
        'Which students need attention?',
        'Generate attendance report'
      );
    }

    if (relevantData.teachers) {
      suggestions.push(
        'Show teacher performance overview',
        'Analyze salary distribution',
        'Show subject expertise'
      );
    }

    if (relevantData.finance) {
      suggestions.push(
        'Show monthly revenue trends',
        'Analyze expense categories',
        'Generate financial health report'
      );
    }

    if (relevantData.inventory) {
      suggestions.push(
        'Show items needing reorder',
        'Analyze inventory by category',
        'Show low stock alerts'
      );
    }

    // Add general suggestions
    suggestions.push(
      'Generate school overview',
      'Show key performance indicators',
      'What insights do you have?'
    );

    return suggestions.slice(0, 4);
  }

  generateFallbackResponse(query, schoolData) {
    const lowerQuery = query.toLowerCase();
    
    if (lowerQuery.includes('student')) {
      const pendingFees = schoolData.students.filter(s => s.fees.pending > 0).length;
      const avgAttendance = this.calculateAverageAttendance(schoolData.students);
      return `📚 **Student Overview:**\n\n• **Total Students:** ${schoolData.students.length}\n• **Average Attendance:** ${avgAttendance}%\n• **Students with Pending Fees:** ${pendingFees}\n\n*AI service temporarily unavailable. For detailed information, please check the Students section.*`;
    }
    
    if (lowerQuery.includes('teacher')) {
      const avgExperience = (schoolData.teachers.reduce((sum, t) => sum + t.experience, 0) / schoolData.teachers.length).toFixed(1);
      return `👨‍🏫 **Teacher Overview:**\n\n• **Total Teachers:** ${schoolData.teachers.length}\n• **Average Experience:** ${avgExperience} years\n• **Subjects:** ${[...new Set(schoolData.teachers.map(t => t.subject))].join(', ')}\n\n*AI service temporarily unavailable. For detailed information, please check the Teachers section.*`;
    }
    
    if (lowerQuery.includes('finance')) {
      const profitMargin = ((schoolData.finance.netProfit / schoolData.finance.totalRevenue) * 100).toFixed(1);
      return `💰 **Financial Overview:**\n\n• **Total Revenue:** ₹${schoolData.finance.totalRevenue.toLocaleString()}\n• **Net Profit:** ₹${schoolData.finance.netProfit.toLocaleString()}\n• **Profit Margin:** ${profitMargin}%\n• **Pending Fees:** ₹${schoolData.finance.pendingFees.toLocaleString()}\n\n*AI service temporarily unavailable. For detailed information, please check the Finance section.*`;
    }
    
    return `I'm having trouble connecting to the AI service right now. Please try:\n\n• **Refreshing the page**\n• **Checking your internet connection**\n• **Using the navigation menu** to browse sections\n\nWhat specific information about ${schoolData.school.name} are you looking for?`;
  }

  getConnectionStatus() {
    return {
      connected: this.isConnected,
      baseUrl: this.baseUrl,
      hasApiKey: !!this.apiKey,
      selectedModel: this.selectedModel,
      availableModels: this.availableModels.length,
      cacheSize: this.responseCache.size
    };
  }

  clearCache() {
    this.responseCache.clear();
    this.log('Cache cleared');
  }

  // Get model information for debugging
  async getModelInfo() {
    if (this.availableModels.length === 0) {
      await this.getModels();
    }
    return {
      selectedModel: this.selectedModel,
      availableModels: this.availableModels.map(m => ({
        id: m.id,
        name: m.name || m.id,
        size: m.size || 'unknown'
      }))
    };
  }
}

export default new LLMService();