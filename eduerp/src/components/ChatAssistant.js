import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageCircle, 
  Send, 
  Mic, 
  Brain, 
  X, 
  Minimize2,
  Maximize2,
  Volume2,
  Square,
  Zap,
  CheckCircle,
  AlertCircle,
  Loader,
  Settings,
  RefreshCw,
  Info,
  Server,
  Wifi
} from 'lucide-react';
import llmClient from '../services/llmClient';

const ChatAssistant = ({ data, isOpen, setIsOpen, onTabChange }) => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'ai',
      content: "Hello! I'm your AI Assistant for Modern International School ERP. I can help you with student records, teacher management, finances, inventory, and analytics. What would you like to know?",
      timestamp: new Date().toISOString()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [typingIndicator, setTypingIndicator] = useState('');
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [backendStatus, setBackendStatus] = useState('disconnected');
  const [debugInfo, setDebugInfo] = useState('');
  const [showDebug, setShowDebug] = useState(false);
  const [modelInfo, setModelInfo] = useState(null);
  
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const inputRef = useRef(null);

  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onstart = () => {
        setIsListening(true);
        setCurrentTranscript('');
      };

      recognitionRef.current.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        setCurrentTranscript(finalTranscript || interimTranscript);

        if (finalTranscript) {
          setInputMessage(finalTranscript.trim());
          setIsListening(false);
        }
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
        setCurrentTranscript('');
      };
    }

    // Initialize backend connection
    initializeBackend();

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      llmClient.disconnect();
    };
  }, []);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && !isMinimized) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, isMinimized]);

  // Initialize backend connection
  const initializeBackend = async () => {
    try {
      setBackendStatus('connecting');
      setDebugInfo('Connecting to LLM backend...');
      
      const connected = await llmClient.initialize();
      
      if (connected) {
        setBackendStatus('connected');
        
        // Set up connection listener
        llmClient.onConnectionChange((isConnected) => {
          setBackendStatus(isConnected ? 'connected' : 'disconnected');
        });
        
        // Get backend status
        const status = await llmClient.getStatus();
        setConnectionStatus(status.connected ? 'connected' : 'error');
        
        // Get models
        const models = await llmClient.getModels();
        setModelInfo(models);
        
        setDebugInfo(`✅ Backend connected!\n\nLLM Status: ${status.connected ? 'Connected' : 'Disconnected'}\nSelected Model: ${models.selectedModel || 'None'}\nAvailable Models: ${models.availableModels?.length || 0}`);
      } else {
        setBackendStatus('error');
        setConnectionStatus('error');
        setDebugInfo('❌ Backend connection failed.\n\nPlease check:\n• Backend server is running\n• Network connectivity\n• Backend URL configuration');
      }
    } catch (error) {
      setBackendStatus('error');
      setConnectionStatus('error');
      setDebugInfo(`❌ Backend error: ${error.message}`);
      console.error('Backend initialization error:', error);
    }
  };

  // Process query using backend
  const processBackendQuery = async (query) => {
    try {
      setIsProcessing(true);
      setTypingIndicator('Sending query to backend...');
      
      if (backendStatus !== 'connected') {
        throw new Error('Backend not connected');
      }

      // Get conversation history for context
      const conversationHistory = messages
        .slice(-6)
        .filter(m => m.type === 'user' || m.type === 'ai')
        .map(m => ({
          role: m.type === 'user' ? 'user' : 'assistant',
          content: m.content
        }));

      setTypingIndicator('Processing with AI...');

      // Send query to backend
      const result = await llmClient.sendQuery(query, data, conversationHistory);
      
      if (result.success) {
        // Determine navigation action
        let action = null;
        const lowerResponse = result.response.toLowerCase();
        const lowerQuery = query.toLowerCase();

        if ((lowerQuery.includes('student') || lowerResponse.includes('student')) && 
            (lowerResponse.includes('view') || lowerResponse.includes('check') || lowerResponse.includes('show'))) {
          action = { type: 'highlight', tab: 'students' };
        } else if ((lowerQuery.includes('teacher') || lowerResponse.includes('teacher')) && 
                   (lowerResponse.includes('view') || lowerResponse.includes('check') || lowerResponse.includes('show'))) {
          action = { type: 'highlight', tab: 'teachers' };
        } else if ((lowerQuery.includes('finance') || lowerResponse.includes('finance') || lowerQuery.includes('fee')) && 
                   (lowerResponse.includes('view') || lowerResponse.includes('check') || lowerResponse.includes('show'))) {
          action = { type: 'highlight', tab: 'finance' };
        } else if ((lowerQuery.includes('inventory') || lowerResponse.includes('inventory')) && 
                   (lowerResponse.includes('view') || lowerResponse.includes('check') || lowerResponse.includes('show'))) {
          action = { type: 'highlight', tab: 'inventory' };
        } else if ((lowerQuery.includes('analytics') || lowerResponse.includes('report') || lowerResponse.includes('analysis')) && 
                   (lowerResponse.includes('view') || lowerResponse.includes('check') || lowerResponse.includes('show'))) {
          action = { type: 'highlight', tab: 'analytics' };
        }

        // Add AI response to chat
        setMessages(prev => [...prev, {
          id: Date.now(),
          type: 'ai',
          content: result.response,
          timestamp: new Date().toISOString(),
          action: action,
          suggestions: result.suggestions,
          usage: result.usage,
          model: result.model
        }]);
        
        // Execute navigation action if needed
        if (action && action.type === 'highlight' && action.tab) {
          setTimeout(() => {
            onTabChange(action.tab);
          }, 1000);
        }

        // Update debug info
        setDebugInfo(`✅ Query successful!\n\nModel: ${result.model}\nTokens: ${result.usage?.total_tokens || 'N/A'}`);

      } else {
        throw new Error(result.error || 'Query failed');
      }

    } catch (error) {
      console.error('Backend query failed:', error);
      
      // Use fallback response
      const fallbackResponse = llmClient.generateFallbackResponse(query, data);
      setMessages(prev => [...prev, {
        id: Date.now(),
        type: 'ai',
        content: fallbackResponse.response,
        timestamp: new Date().toISOString(),
        suggestions: fallbackResponse.suggestions,
        model: fallbackResponse.model
      }]);
      
      setDebugInfo(`❌ Error: ${error.message}\n\nUsing fallback mode.`);
    } finally {
      setIsProcessing(false);
      setTypingIndicator('');
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;
    
    // Add user message to chat
    setMessages(prev => [...prev, {
      id: Date.now(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date().toISOString()
    }]);
    
    const query = inputMessage;
    setInputMessage('');
    
    // Process the query
    if (backendStatus === 'connected') {
      await processBackendQuery(query);
    } else {
      // Use fallback response
      const fallbackResponse = llmClient.generateFallbackResponse(query, data);
      setMessages(prev => [...prev, {
        id: Date.now(),
        type: 'ai',
        content: fallbackResponse.response,
        timestamp: new Date().toISOString(),
        suggestions: fallbackResponse.suggestions,
        model: fallbackResponse.model
      }]);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const startVoiceInput = () => {
    if (recognitionRef.current) {
      recognitionRef.current.start();
    }
  };

  const stopVoiceInput = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  };

  const getConnectionStatusColor = () => {
    if (backendStatus === 'connected' && connectionStatus === 'connected') {
      return 'text-green-500';
    } else if (backendStatus === 'connecting') {
      return 'text-yellow-500';
    } else {
      return 'text-red-500';
    }
  };

  const getConnectionStatusText = () => {
    if (backendStatus === 'connected' && connectionStatus === 'connected') {
      return modelInfo?.selectedModel?.split('/').pop() || 'Connected';
    } else if (backendStatus === 'connecting') {
      return 'Connecting...';
    } else {
      return 'Offline';
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center z-50 hover:scale-110"
      >
        <div className="relative">
          <Brain className="w-7 h-7" />
          <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${
            backendStatus === 'connected' && connectionStatus === 'connected' ? 'bg-green-500 animate-pulse' : 
            backendStatus === 'connecting' ? 'bg-yellow-500 animate-spin' : 
            'bg-red-500'
          }`}></div>
        </div>
      </button>
    );
  }

  return (
    <div className={`fixed bottom-6 right-6 bg-white rounded-lg shadow-2xl border z-50 transition-all duration-300 ${
      isMinimized ? 'w-80 h-16' : 'w-96 h-[600px]'
    }`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 rounded-t-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Brain className="w-5 h-5" />
            <h3 className="font-semibold">AI Assistant</h3>
            <div className="flex items-center space-x-1">
              {backendStatus === 'connecting' ? (
                <Loader className="w-4 h-4 animate-spin" />
              ) : backendStatus === 'connected' ? (
                <Server className={`w-4 h-4 ${getConnectionStatusColor()}`} />
              ) : (
                <Wifi className="w-4 h-4 text-red-500" />
              )}
              <span className={`text-xs ${getConnectionStatusColor()}`}>
                {getConnectionStatusText()}
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {/* Debug Toggle */}
            {process.env.REACT_APP_DEBUG_MODE === 'true' && (
              <button
                onClick={() => setShowDebug(!showDebug)}
                className="p-1 hover:bg-white/20 rounded transition-colors"
                title="Toggle Debug Info"
              >
                <Settings className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-1 hover:bg-white/20 rounded transition-colors"
            >
              {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-white/20 rounded transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Debug Panel */}
          {showDebug && (
            <div className="bg-gray-100 p-3 border-b">
              <div className="text-xs text-gray-600 mb-2 flex items-center gap-2">
                <Info className="w-3 h-3" />
                Backend LLM Debug Info:
              </div>
              <div className="text-xs bg-white p-2 rounded border font-mono whitespace-pre-wrap max-h-24 overflow-y-auto">
                {debugInfo || 'No debug information available'}
              </div>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={initializeBackend}
                  className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600 transition-colors"
                  disabled={backendStatus === 'connecting'}
                >
                  <RefreshCw className="w-3 h-3 inline mr-1" />
                  Reconnect
                </button>
                <button
                  onClick={() => llmClient.clearCache()}
                  className="text-xs bg-gray-500 text-white px-2 py-1 rounded hover:bg-gray-600 transition-colors"
                >
                  Clear Cache
                </button>
                {modelInfo && (
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                    Backend: {backendStatus}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Messages */}
          <div className={`flex-1 overflow-y-auto p-4 space-y-3 ${showDebug ? 'h-[350px]' : 'h-[450px]'}`}>
            {messages.map(message => (
              <div
                key={message.id}
                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] px-4 py-3 rounded-lg ${
                    message.type === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  <div className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</div>
                  <div className="text-xs opacity-75 mt-2 flex items-center justify-between">
                    <span>{new Date(message.timestamp).toLocaleTimeString()}</span>
                    {message.usage && (
                      <span className="text-xs">
                        {message.model && `${message.model.split('/').pop()} • `}
                        {message.usage.total_tokens} tokens
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {isProcessing && (
              <div className="flex justify-start">
                <div className="bg-gray-100 text-gray-900 px-4 py-3 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                      <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                    </div>
                    <span className="text-sm">{typingIndicator}</span>
                  </div>
                </div>
              </div>
            )}
            
            {isListening && (
              <div className="flex justify-start">
                <div className="bg-blue-50 text-blue-800 px-4 py-3 rounded-lg border border-blue-200">
                  <div className="flex items-center space-x-2">
                    <Volume2 className="w-4 h-4 animate-pulse" />
                    <span className="text-sm">Listening... Speak clearly</span>
                  </div>
                  {currentTranscript && (
                    <div className="text-sm text-blue-600 italic mt-1">"{currentTranscript}"</div>
                  )}
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
          
          {/* Input Area */}
          <div className="p-4 border-t border-gray-200">
            <div className="flex space-x-2">
              <input
                ref={inputRef}
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me anything about your school..."
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                disabled={isProcessing}
              />
              
              {/* Voice Input Button */}
              <button
                onClick={isListening ? stopVoiceInput : startVoiceInput}
                disabled={isProcessing}
                className={`p-2 rounded-lg transition-colors ${
                  isListening 
                    ? 'bg-red-500 text-white animate-pulse' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
                title={isListening ? 'Stop recording' : 'Start voice input'}
              >
                {isListening ? <Square className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>
              
              {/* Send Button */}
              <button
                onClick={handleSendMessage}
                disabled={isProcessing || !inputMessage.trim()}
                className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Send message"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
            
            {/* Dynamic Suggestions */}
            <div className="mt-3 flex flex-wrap gap-2">
              {/* Show suggestions from the last AI response if available */}
              {messages.length > 0 && messages[messages.length - 1]?.suggestions ? 
                messages[messages.length - 1].suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setInputMessage(suggestion);
                      setTimeout(() => handleSendMessage(), 100);
                    }}
                    className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded-full hover:bg-blue-200 transition-colors"
                    disabled={isProcessing}
                  >
                    {suggestion}
                  </button>
                )) :
                // Default suggestions
                [
                  "Show me student overview",
                  "Financial performance summary",
                  "Teacher performance report",
                  "What insights can you provide?"
                ].map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setInputMessage(suggestion);
                      setTimeout(() => handleSendMessage(), 100);
                    }}
                    className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full hover:bg-gray-200 transition-colors"
                    disabled={isProcessing}
                  >
                    {suggestion}
                  </button>
                ))
              }
            </div>
            
            {/* Status */}
            <div className="mt-2 text-xs text-gray-500 text-center">
              {isProcessing ? (
                <div className="flex items-center justify-center space-x-1">
                  <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  <span>Processing with backend AI...</span>
                </div>
              ) : backendStatus === 'connected' && connectionStatus === 'connected' ? (
                <div className="flex items-center justify-center space-x-1">
                  <CheckCircle className="w-3 h-3 text-green-500" />
                  <span>Backend AI connected • Press Enter to send</span>
                </div>
              ) : (
                <div className="flex items-center justify-center space-x-1">
                  <AlertCircle className="w-3 h-3 text-red-500" />
                  <span>Backend offline • Using fallback mode</span>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ChatAssistant;