const axios = require('axios');
const OpenAI = require('openai');
const _ = require('lodash');
const logger = require('./logger');

class AIService {
  constructor() {
    this.localLLMUrl = process.env.LOCAL_LLM_URL || 'http://localhost:11434';
    this.openaiClient = null;
    this.useLocalFirst = process.env.USE_LOCAL_FIRST !== 'false';
    this.isInitialized = false;
    this.localLLMAvailable = false;
    
    // Response cache for common queries
    this.responseCache = new Map();
    this.cacheExpiry = 30 * 60 * 1000; // 30 minutes
    
    // Education-specific system prompts
    this.systemPrompts = {
      general: `You are EduCare AI, an intelligent assistant for Modern International School's ERP system. You help administrators, teachers, and staff with school management tasks.

Key Guidelines:
- Provide accurate, helpful responses about student data, teacher information, finances, and school operations
- Always be professional and supportive
- When discussing students, maintain privacy and focus on educational outcomes
- Provide specific, actionable recommendations
- If you need more information to provide a complete answer, ask clarifying questions
- Format responses clearly with bullet points or sections when appropriate
- Include relevant statistics and insights when available`,

      student_analysis: `You are analyzing student data for Modern International School. Focus on:
- Academic performance trends and insights
- Attendance patterns and concerns
- Behavioral observations and recommendations
- Individual student progress and needs
- Suggestions for improvement and support`,

      financial_analysis: `You are analyzing financial data for Modern International School. Focus on:
- Revenue and expense trends
- Budget allocation efficiency
- Fee collection patterns
- Cost optimization opportunities
- Financial health indicators and recommendations`,

      inventory_management: `You are managing inventory for Modern International School. Focus on:
- Stock level analysis and alerts
- Reorder recommendations
- Cost optimization
- Usage patterns and trends
- Supplier performance and suggestions`
    };
  }

  async initialize() {
    try {
      // Initialize OpenAI client if API key is provided
      if (process.env.OPENAI_API_KEY) {
        this.openaiClient = new OpenAI({
          apiKey: process.env.OPENAI_API_KEY
        });
        logger.info('OpenAI client initialized');
      }

      // Test local LLM availability
      await this.testLocalLLM();

      this.isInitialized = true; // Initialize even if some services fail
    
      logger.info(`AI Service initialized - Local LLM: ${this.localLLMAvailable}, OpenAI: ${!!this.openaiClient}`);
    } catch (error) {
      logger.error('Failed to initialize AI Service:', error);
      this.isInitialized = true;
    }
  }

  async testLocalLLM() {
    try {
      const response = await axios.get(`${this.localLLMUrl}/api/tags`, {
        timeout: 5000
      });
      
      if (response.status === 200) {
        this.localLLMAvailable = true;
        logger.info('Local LLM is available');
      }
    } catch (error) {
      this.localLLMAvailable = false;
      logger.warn('Local LLM not available, will use OpenAI fallback');
    }
  }

  async processQuery(query, context = {}) {
    try {
      // Check cache first
      const cacheKey = this.generateCacheKey(query, context);
      const cachedResponse = this.getFromCache(cacheKey);
      
      if (cachedResponse) {
        logger.info('Returning cached AI response');
        return cachedResponse;
      }

      // Determine query type and select appropriate system prompt
      const queryType = this.categorizeQuery(query);
      const systemPrompt = this.systemPrompts[queryType] || this.systemPrompts.general;

      // Build context-aware prompt
      const enhancedPrompt = this.buildContextualPrompt(query, context, systemPrompt);

      let response;

      // Try local LLM first if available and preferred
      if (this.useLocalFirst && this.localLLMAvailable) {
        try {
          response = await this.queryLocalLLM(enhancedPrompt, queryType);
          
          // Validate response quality
          if (this.isResponseQualityGood(response, query)) {
            logger.info('Using local LLM response');
          } else {
            throw new Error('Local LLM response quality insufficient');
          }
        } catch (error) {
          logger.warn('Local LLM failed, falling back to OpenAI:', error.message);
          response = await this.queryOpenAI(enhancedPrompt, queryType);
        }
      } else {
        // Use OpenAI directly
        response = await this.queryOpenAI(enhancedPrompt, queryType);
      }

      // Post-process response
      const processedResponse = await this.postProcessResponse(response, query, context);

      // Cache the response
      this.cacheResponse(cacheKey, processedResponse);

      return processedResponse;

    } catch (error) {
      logger.error('AI query processing failed:', error);
      return this.getFallbackResponse(query);
    }
  }

  categorizeQuery(query) {
    const lowerQuery = query.toLowerCase();
    
    if (lowerQuery.includes('student') || lowerQuery.includes('academic') || lowerQuery.includes('grade') || lowerQuery.includes('attendance')) {
      return 'student_analysis';
    }
    
    if (lowerQuery.includes('finance') || lowerQuery.includes('fee') || lowerQuery.includes('revenue') || lowerQuery.includes('expense') || lowerQuery.includes('budget')) {
      return 'financial_analysis';
    }
    
    if (lowerQuery.includes('inventory') || lowerQuery.includes('stock') || lowerQuery.includes('supply') || lowerQuery.includes('equipment')) {
      return 'inventory_management';
    }
    
    return 'general';
  }

  buildContextualPrompt(query, context, systemPrompt) {
    let prompt = `${systemPrompt}\n\n`;
    
    // Add relevant data context
    if (context.schoolData) {
      prompt += `Current School Data Context:\n`;
      prompt += `- Total Students: ${context.schoolData.students?.length || 0}\n`;
      prompt += `- Total Teachers: ${context.schoolData.teachers?.length || 0}\n`;
      prompt += `- School: ${context.schoolData.school?.name || 'Modern International School'}\n\n`;
      
      // Add specific data based on query type
      if (query.toLowerCase().includes('student')) {
        prompt += `Student Data Summary:\n`;
        if (context.schoolData.students?.length > 0) {
          const students = context.schoolData.students;
          const avgAttendance = students.reduce((sum, s) => sum + s.attendance.percentage, 0) / students.length;
          const pendingFees = students.filter(s => s.fees.pending > 0).length;
          
          prompt += `- Average Attendance: ${avgAttendance.toFixed(1)}%\n`;
          prompt += `- Students with Pending Fees: ${pendingFees}\n`;
          prompt += `- Grade Distribution: ${JSON.stringify(_.countBy(students, 'grade'))}\n`;
        }
      }
      
      if (query.toLowerCase().includes('finance')) {
        prompt += `Financial Data Summary:\n`;
        if (context.schoolData.finance) {
          const finance = context.schoolData.finance;
          prompt += `- Total Revenue: ₹${finance.totalRevenue?.toLocaleString() || 0}\n`;
          prompt += `- Total Expenses: ₹${finance.totalExpenses?.toLocaleString() || 0}\n`;
          prompt += `- Net Profit: ₹${finance.netProfit?.toLocaleString() || 0}\n`;
          prompt += `- Pending Fees: ₹${finance.pendingFees?.toLocaleString() || 0}\n`;
        }
      }
      
      if (query.toLowerCase().includes('inventory')) {
        prompt += `Inventory Data Summary:\n`;
        if (context.schoolData.inventory?.length > 0) {
          const inventory = context.schoolData.inventory;
          const lowStock = inventory.filter(item => item.quantity < item.minStock);
          const totalValue = inventory.reduce((sum, item) => sum + item.totalValue, 0);
          
          prompt += `- Total Items: ${inventory.length}\n`;
          prompt += `- Low Stock Items: ${lowStock.length}\n`;
          prompt += `- Total Inventory Value: ₹${totalValue.toLocaleString()}\n`;
          prompt += `- Categories: ${JSON.stringify(_.countBy(inventory, 'category'))}\n`;
        }
      }
    }
    
    prompt += `\nUser Query: ${query}\n\n`;
    prompt += `Please provide a helpful, accurate response based on the above context. Include specific insights, recommendations, and actionable steps where appropriate.`;
    
    return prompt;
  }

  async queryLocalLLM(prompt, queryType) {
    try {
      const response = await axios.post(`${this.localLLMUrl}/api/generate`, {
        model: process.env.LOCAL_LLM_MODEL || 'llama2:7b-chat',
        prompt: prompt,
        stream: false,
        options: {
          temperature: 0.3,
          top_p: 0.9,
          max_tokens: 500,
          stop: ['Human:', 'User:']
        }
      }, {
        timeout: 30000
      });

      return {
        content: response.data.response,
        source: 'local_llm',
        model: process.env.LOCAL_LLM_MODEL || 'llama2:7b-chat',
        usage: {
          prompt_tokens: prompt.length / 4, // Rough estimation
          completion_tokens: response.data.response.length / 4
        }
      };
    } catch (error) {
      logger.error('Local LLM query failed:', error);
      throw error;
    }
  }

  async queryOpenAI(prompt, queryType) {
    if (!this.openaiClient) {
      throw new Error('OpenAI client not available');
    }

    try {
      const response = await this.openaiClient.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'llama2',
        messages: [
          { role: 'system', content: this.systemPrompts[queryType] || this.systemPrompts.general },
          { role: 'user', content: prompt }
        ],
        max_tokens: 500,
        temperature: 0.3,
        top_p: 0.9
      });

      return {
        content: response.choices[0].message.content,
        source: 'openai',
        model: response.model,
        usage: response.usage
      };
    } catch (error) {
      logger.error('OpenAI query failed:', error);
      throw error;
    }
  }

  async postProcessResponse(response, originalQuery, context) {
    try {
      // Extract actionable insights
      const actions = this.extractActions(response.content, originalQuery);
      
      // Generate follow-up suggestions
      const suggestions = this.generateSuggestions(response.content, originalQuery, context);
      
      // Determine if this should be broadcast to other users
      const shouldBroadcast = this.shouldBroadcastUpdate(response.content, originalQuery);

      return {
        content: response.content,
        source: response.source,
        model: response.model,
        actions: actions,
        suggestions: suggestions,
        broadcast: shouldBroadcast.should,
        broadcastMessage: shouldBroadcast.message,
        type: shouldBroadcast.type,
        timestamp: new Date().toISOString(),
        usage: response.usage
      };
    } catch (error) {
      logger.error('Response post-processing failed:', error);
      return {
        content: response.content,
        source: response.source,
        model: response.model,
        actions: [],
        suggestions: [],
        broadcast: false,
        timestamp: new Date().toISOString(),
        usage: response.usage
      };
    }
  }

  extractActions(content, query) {
    const actions = [];
    const lowerContent = content.toLowerCase();
    const lowerQuery = query.toLowerCase();

    // Navigation actions
    if (lowerQuery.includes('student') && lowerContent.includes('student')) {
      actions.push({ type: 'navigate', target: 'students' });
    }
    
    if (lowerQuery.includes('teacher') && lowerContent.includes('teacher')) {
      actions.push({ type: 'navigate', target: 'teachers' });
    }
    
    if (lowerQuery.includes('finance') && lowerContent.includes('finance')) {
      actions.push({ type: 'navigate', target: 'finance' });
    }
    
    if (lowerQuery.includes('inventory') && lowerContent.includes('inventory')) {
      actions.push({ type: 'navigate', target: 'inventory' });
    }

    // Alert actions
    if (lowerContent.includes('urgent') || lowerContent.includes('immediate')) {
      actions.push({ type: 'alert', priority: 'high' });
    }
    
    if (lowerContent.includes('reorder') || lowerContent.includes('stock')) {
      actions.push({ type: 'alert', target: 'inventory', message: 'Review inventory levels' });
    }

    return actions;
  }

  generateSuggestions(content, query, context) {
    const suggestions = [];
    const lowerContent = content.toLowerCase();
    const lowerQuery = query.toLowerCase();

    // Query-based suggestions
    if (lowerQuery.includes('student')) {
      suggestions.push('Show me students with pending fees');
      suggestions.push('What is the average class performance?');
      suggestions.push('Which students need attention?');
    }
    
    if (lowerQuery.includes('finance')) {
      suggestions.push('Show monthly revenue trends');
      suggestions.push('What are our major expenses?');
      suggestions.push('Generate financial summary report');
    }
    
    if (lowerQuery.includes('teacher')) {
      suggestions.push('Show teacher performance ratings');
      suggestions.push('What is the average teacher experience?');
      suggestions.push('Who are the top performing teachers?');
    }

    // Content-based suggestions
    if (lowerContent.includes('low') || lowerContent.includes('below')) {
      suggestions.push('Show detailed analysis');
      suggestions.push('What can we do to improve?');
    }
    
    if (lowerContent.includes('excellent') || lowerContent.includes('high')) {
      suggestions.push('How can we maintain this performance?');
      suggestions.push('What are the success factors?');
    }

    return suggestions.slice(0, 4); // Limit to 4 suggestions
  }

  shouldBroadcastUpdate(content, query) {
    const lowerContent = content.toLowerCase();
    const lowerQuery = query.toLowerCase();

    // Check for system-wide alerts
    if (lowerContent.includes('urgent') || lowerContent.includes('critical')) {
      return {
        should: true,
        message: 'System alert: Urgent attention required',
        type: 'alert'
      };
    }
    
    if (lowerContent.includes('low stock') || lowerContent.includes('reorder')) {
      return {
        should: true,
        message: 'Inventory alert: Items need reordering',
        type: 'inventory_alert'
      };
    }
    
    if (lowerQuery.includes('fee') && lowerContent.includes('overdue')) {
      return {
        should: true,
        message: 'Finance alert: Overdue fees require attention',
        type: 'finance_alert'
      };
    }

    return { should: false };
  }

  isResponseQualityGood(response, query) {
    const content = response.content || '';
    
    // Basic quality checks
    if (content.length < 50) return false; // Too short
    if (content.length > 2000) return false; // Too long
    if (content.includes('I cannot') || content.includes('I don\'t know')) return false;
    if (content.includes('error') && content.includes('failed')) return false;
    
    // Query relevance check
    const queryWords = query.toLowerCase().split(' ').filter(word => word.length > 3);
    const contentLower = content.toLowerCase();
    const relevanceScore = queryWords.filter(word => contentLower.includes(word)).length / queryWords.length;
    
    return relevanceScore > 0.3; // At least 30% of query words should appear in response
  }

  getFallbackResponse(query) {
    const lowerQuery = query.toLowerCase();
    
    let fallbackMessage = "I apologize, but I'm having trouble processing your request right now. ";
    
    if (lowerQuery.includes('student')) {
      fallbackMessage += "For student-related queries, please check the Students section for detailed information.";
    } else if (lowerQuery.includes('teacher')) {
      fallbackMessage += "For teacher-related queries, please check the Teachers section for staff information.";
    } else if (lowerQuery.includes('finance')) {
      fallbackMessage += "For financial queries, please check the Finance section for detailed reports.";
    } else if (lowerQuery.includes('inventory')) {
      fallbackMessage += "For inventory queries, please check the Inventory section for stock information.";
    } else {
      fallbackMessage += "Please try rephrasing your question or check the relevant section in the dashboard.";
    }

    return {
      content: fallbackMessage,
      source: 'fallback',
      model: 'system',
      actions: [],
      suggestions: [
        'Show me the dashboard overview',
        'What can you help me with?',
        'Generate a summary report'
      ],
      broadcast: false,
      timestamp: new Date().toISOString()
    };
  }

  // Cache management
  generateCacheKey(query, context) {
    const contextHash = JSON.stringify({
      studentCount: context.schoolData?.students?.length,
      teacherCount: context.schoolData?.teachers?.length,
      lastUpdated: context.schoolData?.metadata?.lastUpdated
    });
    
    return `${query.toLowerCase().trim()}_${Buffer.from(contextHash).toString('base64').slice(0, 10)}`;
  }

  getFromCache(key) {
    const cached = this.responseCache.get(key);
    
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.response;
    }
    
    if (cached) {
      this.responseCache.delete(key);
    }
    
    return null;
  }

  cacheResponse(key, response) {
    this.responseCache.set(key, {
      response,
      timestamp: Date.now()
    });
    
    // Clean old cache entries
    if (this.responseCache.size > 100) {
      const oldestKey = this.responseCache.keys().next().value;
      this.responseCache.delete(oldestKey);
    }
  }

  // Health and status methods
  isHealthy() {
    return this.isInitialized;
  }

  getStatus() {
    return {
      initialized: this.isInitialized,
      localLLM: this.localLLMAvailable,
      openAI: !!this.openaiClient,
      cacheSize: this.responseCache.size
    };
  }

  async getServiceStats() {
    return {
      status: this.getStatus(),
      config: {
        useLocalFirst: this.useLocalFirst,
        localLLMUrl: this.localLLMUrl,
        model: process.env.LOCAL_LLM_MODEL || 'llama2:7b-chat'
      },
      cache: {
        size: this.responseCache.size,
        maxSize: 100,
        expiryMinutes: this.cacheExpiry / (60 * 1000)
      }
    };
  }

  // Clear cache manually
  clearCache() {
    this.responseCache.clear();
    logger.info('AI Service cache cleared');
  }
}

module.exports = new AIService();