// src/services/llmClient.js - Frontend client for backend LLM service
import io from 'socket.io-client';

class LLMClient {
  constructor() {
    this.backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5001';
    this.socket = null;
    this.isConnected = false;
    this.pendingRequests = new Map();
    this.debugMode = process.env.REACT_APP_DEBUG_MODE === 'true';
    
    this.connectionCallbacks = [];
    this.responseCallbacks = new Map();
  }

  log(message, data = null) {
    if (this.debugMode) {
      console.log(`[LLM Client] ${message}`, data || '');
    }
  }

  error(message, error = null) {
    console.error(`[LLM Client] ${message}`, error || '');
  }

  // Initialize connection to backend
  async initialize() {
    try {
      this.log('Initializing connection to LLM backend...');
      
      // Initialize Socket.IO connection
      this.socket = io(this.backendUrl, {
        transports: ['websocket', 'polling'],
        timeout: 10000,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000
      });

      this.setupSocketEvents();
      
      // Wait for connection
      await this.waitForConnection();
      
      this.log('LLM Client initialized successfully');
      return true;
    } catch (error) {
      this.error('Failed to initialize LLM Client:', error);
      return false;
    }
  }

  setupSocketEvents() {
    this.socket.on('connect', () => {
      this.isConnected = true;
      this.log('Connected to LLM backend');
      this.connectionCallbacks.forEach(callback => callback(true));
    });

    this.socket.on('disconnect', () => {
      this.isConnected = false;
      this.log('Disconnected from LLM backend');
      this.connectionCallbacks.forEach(callback => callback(false));
    });

    this.socket.on('llm_response', (response) => {
      this.log('Received LLM response:', response);
      const callback = this.responseCallbacks.get(response.id);
      if (callback) {
        callback(response);
        this.responseCallbacks.delete(response.id);
      }
    });

    this.socket.on('llm_error', (error) => {
      this.error('LLM error received:', error);
      const callback = this.responseCallbacks.get(error.id);
      if (callback) {
        callback({ success: false, error: error.error });
        this.responseCallbacks.delete(error.id);
      }
    });

    this.socket.on('connection_status', (status) => {
      this.log('Connection status received:', status);
    });

    this.socket.on('model_changed', (data) => {
      this.log('Model changed:', data);
    });

    this.socket.on('connect_error', (error) => {
      this.error('Connection error:', error);
    });
  }

  waitForConnection(timeout = 10000) {
    return new Promise((resolve, reject) => {
      if (this.isConnected) {
        resolve();
        return;
      }

      const timer = setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, timeout);

      const onConnect = (connected) => {
        if (connected) {
          clearTimeout(timer);
          resolve();
        }
      };

      this.connectionCallbacks.push(onConnect);
    });
  }

  // Send query to backend LLM service
  async sendQuery(query, schoolData, conversationHistory = []) {
    return new Promise((resolve, reject) => {
      if (!this.isConnected) {
        reject(new Error('Not connected to LLM backend'));
        return;
      }

      const requestId = this.generateRequestId();
      const timeout = 60000; // 60 seconds

      this.log(`Sending query to backend: ${query.substring(0, 100)}...`);

      // Set up response callback
      const responseCallback = (response) => {
        clearTimeout(timeoutTimer);
        resolve(response);
      };

      this.responseCallbacks.set(requestId, responseCallback);

      // Set timeout
      const timeoutTimer = setTimeout(() => {
        this.responseCallbacks.delete(requestId);
        reject(new Error('Request timeout'));
      }, timeout);

      // Send query
      this.socket.emit('llm_query', {
        id: requestId,
        query,
        schoolData,
        conversationHistory,
        sessionId: this.generateSessionId(),
        timestamp: new Date().toISOString()
      });
    });
  }

  // Test connection to backend
  async testConnection() {
    return new Promise((resolve) => {
      if (!this.socket) {
        resolve(false);
        return;
      }

      const timeout = setTimeout(() => {
        resolve(false);
      }, 5000);

      this.socket.emit('test_connection');
      
      this.socket.once('connection_status', (status) => {
        clearTimeout(timeout);
        resolve(status.connected);
      });
    });
  }

  // Get available models via REST API
  async getModels() {
    try {
      const response = await fetch(`${this.backendUrl}/api/llm/models`);
      const data = await response.json();
      
      if (data.success) {
        this.log('Models fetched:', data.data);
        return data.data;
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      this.error('Failed to fetch models:', error);
      return { availableModels: [], selectedModel: null, connected: false };
    }
  }

  // Set model via REST API
  async setModel(modelId) {
    try {
      const response = await fetch(`${this.backendUrl}/api/llm/models/select`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ modelId })
      });
      
      const data = await response.json();
      
      if (data.success) {
        this.log('Model set successfully:', modelId);
        return true;
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      this.error('Failed to set model:', error);
      return false;
    }
  }

  // Get backend status
  async getStatus() {
    try {
      const response = await fetch(`${this.backendUrl}/api/llm/status`);
      const data = await response.json();
      
      if (data.success) {
        return data.data;
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      this.error('Failed to get status:', error);
      return {
        connected: false,
        selectedModel: null,
        availableModels: 0,
        initialized: false
      };
    }
  }

  // Clear cache
  async clearCache() {
    try {
      const response = await fetch(`${this.backendUrl}/api/llm/cache`, {
        method: 'DELETE'
      });
      
      const data = await response.json();
      return data.success;
    } catch (error) {
      this.error('Failed to clear cache:', error);
      return false;
    }
  }

  // Get backend statistics
  async getStats() {
    try {
      const response = await fetch(`${this.backendUrl}/api/llm/stats`);
      const data = await response.json();
      
      if (data.success) {
        return data.data;
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      this.error('Failed to get stats:', error);
      return null;
    }
  }

  // Utility methods
  generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Subscribe to connection status changes
  onConnectionChange(callback) {
    this.connectionCallbacks.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.connectionCallbacks.indexOf(callback);
      if (index > -1) {
        this.connectionCallbacks.splice(index, 1);
      }
    };
  }

  // Disconnect from backend
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.log('Disconnected from backend');
    }
  }

  // Reconnect to backend
  async reconnect() {
    this.disconnect();
    return await this.initialize();
  }

  // Fallback for when backend is unavailable
  generateFallbackResponse(query, schoolData) {
    const lowerQuery = query.toLowerCase();
    
    if (lowerQuery.includes('finance')) {
      const profitMargin = schoolData.finance?.totalRevenue ? 
        ((schoolData.finance.netProfit || 0) / schoolData.finance.totalRevenue * 100).toFixed(1) : 0;
      
      return {
        success: true,
        response: `💰 **Financial Overview** (Backend Offline)\n\n• **Total Revenue:** ₹${(schoolData.finance?.totalRevenue || 0).toLocaleString()}\n• **Net Profit:** ₹${(schoolData.finance?.netProfit || 0).toLocaleString()}\n• **Profit Margin:** ${profitMargin}%\n• **Pending Fees:** ₹${(schoolData.finance?.pendingFees || 0).toLocaleString()}\n\n*Backend LLM service temporarily unavailable. For detailed information, please check the Finance section.*`,
        suggestions: ['Show financial trends', 'Analyze expenses', 'Fee collection status'],
        model: 'fallback',
        usage: null
      };
    }
    
    return {
      success: true,
      response: `I'm having trouble connecting to the AI backend service right now. Please try:\n\n• **Refreshing the page**\n• **Checking your internet connection**\n• **Using the navigation menu** to browse sections\n\nWhat specific information about ${schoolData.school?.name || 'your school'} are you looking for?`,
      suggestions: ['Show school overview', 'Try again later', 'Browse sections manually'],
      model: 'fallback',
      usage: null
    };
  }
}

export default new LLMClient();('student')) {
      const pendingFees = schoolData.students?.filter(s => s.fees?.pending > 0).length || 0;
      const avgAttendance = schoolData.students?.length ? 
        (schoolData.students.reduce((sum, s) => sum + (s.attendance?.percentage || 0), 0) / schoolData.students.length).toFixed(1) : 0;
      
      return {
        success: true,
        response: `📚 **Student Overview** (Backend Offline)\n\n• **Total Students:** ${schoolData.students?.length || 0}\n• **Average Attendance:** ${avgAttendance}%\n• **Students with Pending Fees:** ${pendingFees}\n\n*Backend LLM service temporarily unavailable. For detailed information, please check the Students section.*`,
        suggestions: ['Show student details', 'Check attendance', 'View fee status'],
        model: 'fallback',
        usage: null
      };
    }
    
    if (lowerQuery.includes('teacher')) {
      const avgExperience = schoolData.teachers?.length ? 
        (schoolData.teachers.reduce((sum, t) => sum + (t.experience || 0), 0) / schoolData.teachers.length).toFixed(1) : 0;
      
      return {
        success: true,
        response: `👨‍🏫 **Teacher Overview** (Backend Offline)\n\n• **Total Teachers:** ${schoolData.teachers?.length || 0}\n• **Average Experience:** ${avgExperience} years\n• **Subjects:** ${[...new Set(schoolData.teachers?.map(t => t.subject) || [])].join(', ')}\n\n*Backend LLM service temporarily unavailable. For detailed information, please check the Teachers section.*`,
        suggestions: ['Show teacher details', 'Performance overview', 'Salary analysis'],
        model: 'fallback',
        usage: null
      };
    }
    
    if (lowerQuery.includes ('course')) {
      const courseCount = schoolData.courses?.length || 0;
      const avgDuration = schoolData.courses?.length ? 
        (schoolData.courses.reduce((sum, c) => sum + (c.duration || 0), 0) / schoolData.courses.length).toFixed(1) : 0;
      
      return {
        success: true,
        response: `📖 **Course Overview** (Backend Offline)\n\n• **Total Courses:** ${courseCount}\n• **Average Duration:** ${avgDuration} months\n• **Popular Subjects:** ${[...new Set(schoolData.courses?.map(c => c.subject) || [])].join(', ')}\n\n*Backend LLM service temporarily unavailable. For detailed information, please check the Courses section.*`,
        suggestions: ['Show course details', 'Enrollment status', 'Curriculum overview'],
        model: 'fallback',
        usage: null
      };
    }
  );