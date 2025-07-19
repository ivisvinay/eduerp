const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const { createServer } = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

// Import services and middleware
const logger = require('./services/logger');
const llmService = require('./services/llmService');
const cacheService = require('./services/cacheService');
const authMiddleware = require('./middleware/auth');
const errorHandler = require('./middleware/errorHandler');

// Import routes
const llmRoutes = require('./routes/llm');
const healthRoutes = require('./routes/health');

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 5001;

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Compression
app.use(compression());

// Logging
app.use(morgan('combined', { 
  stream: { write: (message) => logger.info(message.trim()) } 
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/api', limiter);

// API Routes
app.use('/api/health', healthRoutes);
app.use('/api/llm', llmRoutes);

// Socket.io for real-time communication
io.on('connection', (socket) => {
  logger.info(`Client connected: ${socket.id}`);

  // Handle chat requests
  socket.on('llm_query', async (data) => {
    try {
      const { query, schoolData, conversationHistory, sessionId } = data;
      
      logger.info(`Processing LLM query from ${socket.id}: ${query.substring(0, 100)}...`);

      // Process query through LLM service
      const result = await llmService.processSchoolQuery(
        query, 
        schoolData, 
        conversationHistory,
        { sessionId, socketId: socket.id }
      );

      // Send response back to client
      socket.emit('llm_response', {
        id: data.id,
        success: result.success,
        response: result.response,
        suggestions: result.suggestions,
        usage: result.usage,
        model: result.model,
        timestamp: new Date().toISOString()
      });

      // Log usage for monitoring
      if (result.usage) {
        logger.info(`LLM Query completed - Tokens: ${result.usage.total_tokens}, Model: ${result.model}`);
      }

    } catch (error) {
      logger.error('LLM query error:', error);
      socket.emit('llm_error', {
        id: data.id,
        error: 'Failed to process your request. Please try again.',
        timestamp: new Date().toISOString()
      });
    }
  });

  // Handle connection test
  socket.on('test_connection', async () => {
    try {
      const status = await llmService.getConnectionStatus();
      socket.emit('connection_status', status);
    } catch (error) {
      logger.error('Connection test error:', error);
      socket.emit('connection_status', { connected: false, error: error.message });
    }
  });

  // Handle model selection
  socket.on('set_model', async (data) => {
    try {
      const { modelId } = data;
      await llmService.setModel(modelId);
      socket.emit('model_changed', { modelId, success: true });
      logger.info(`Model changed to ${modelId} for socket ${socket.id}`);
    } catch (error) {
      logger.error('Model change error:', error);
      socket.emit('model_changed', { modelId: data.modelId, success: false, error: error.message });
    }
  });

  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`);
  });
});

// Error handling
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// Graceful shutdown
const gracefulShutdown = (signal) => {
  logger.info(`${signal} received, shutting down gracefully`);
  
  server.close(async () => {
    try {
      // Cleanup services
      await llmService.cleanup();
      await cacheService.cleanup();
      
      logger.info('Server closed successfully');
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown:', error);
      process.exit(1);
    }
  });

  // Force close after 10 seconds
  setTimeout(() => {
    logger.error('Forced shutdown due to timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Unhandled promise rejection
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Uncaught exception
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Initialize services and start server
async function startServer() {
  try {
    // Initialize services
    await llmService.initialize();
    logger.info('LLM Service initialized');

    await cacheService.initialize();
    logger.info('Cache Service initialized');

    // Start server
    server.listen(PORT, () => {
      logger.info(`🚀 EduERP LLM Backend running on port ${PORT}`);
      logger.info(`🏥 Health check: http://localhost:${PORT}/api/health`);
      logger.info(`🤖 LLM Service: ${llmService.isConnected ? 'Connected' : 'Disconnected'}`);
      logger.info(`🌐 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();

module.exports = { app, server, io };