const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const { createServer } = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

// Import services and middleware
const logger = require('./services/logger');
const rateLimiter = require('./middleware/rateLimiter');
const errorHandler = require('./middleware/errorHandler');
const dataManager = require('./services/dataManager');
const aiService = require('./services/aiService');

// Import routes
const authRoutes = require('./routes/auth');
const schoolRoutes = require('./routes/schools');
const studentRoutes = require('./routes/students');
const teacherRoutes = require('./routes/teachers');
const financeRoutes = require('./routes/finance');
const inventoryRoutes = require('./routes/inventory');
const analyticsRoutes = require('./routes/analytics');
const aiRoutes = require('./routes/ai');

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true
}));
app.use(compression());
app.use(morgan('combined', { stream: { write: (message) => logger.info(message.trim()) } }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
app.use('/api', rateLimiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    services: {
      dataManager: dataManager.isHealthy(),
      aiService: aiService.isHealthy()
    }
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/schools', schoolRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/teachers', teacherRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/ai', aiRoutes);

// Socket.io for real-time communication
io.on('connection', (socket) => {
  logger.info(`User connected: ${socket.id}`);

  // Join school room
  socket.on('join_school', (schoolId) => {
    socket.join(`school_${schoolId}`);
    logger.info(`Socket ${socket.id} joined school ${schoolId}`);
  });

  // Handle AI chat
  socket.on('ai_chat', async (data) => {
    try {
      const { message, context, schoolId } = data;
      
      // Get school data for context
      const schoolData = await dataManager.getSchoolData(schoolId);
      
      // Process AI query
      const aiResponse = await aiService.processQuery(message, {
        ...context,
        schoolData
      });

      // Send response back to user
      socket.emit('ai_response', {
        id: data.id,
        response: aiResponse.content,
        suggestions: aiResponse.suggestions,
        actions: aiResponse.actions,
        timestamp: new Date().toISOString()
      });

      // Broadcast to school if it's a system-wide update
      if (aiResponse.broadcast) {
        socket.to(`school_${schoolId}`).emit('system_update', {
          type: aiResponse.type,
          message: aiResponse.broadcastMessage,
          timestamp: new Date().toISOString()
        });
      }

    } catch (error) {
      logger.error('AI chat error:', error);
      socket.emit('ai_error', {
        id: data.id,
        error: 'Failed to process your request. Please try again.',
        timestamp: new Date().toISOString()
      });
    }
  });

  // Handle real-time data updates
  socket.on('data_update', async (data) => {
    try {
      const { type, schoolId, updates } = data;
      
      // Update data through data manager
      const result = await dataManager.updateData(type, schoolId, updates);
      
      if (result.success) {
        // Broadcast update to all school members
        io.to(`school_${schoolId}`).emit('data_updated', {
          type,
          data: result.data,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      logger.error('Data update error:', error);
      socket.emit('update_error', {
        error: 'Failed to update data',
        timestamp: new Date().toISOString()
      });
    }
  });

  socket.on('disconnect', () => {
    logger.info(`User disconnected: ${socket.id}`);
  });
});

// Error handling middleware
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
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

// Initialize services
async function initializeServer() {
  try {
    // Initialize data manager
    await dataManager.initialize();
    logger.info('Data Manager initialized');

    // Initialize AI service
    await aiService.initialize();
    logger.info('AI Service initialized');

    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => {
      logger.info(`🚀 Agentic Schools ERP Backend running on port ${PORT}`);
      logger.info(`🏥 Health check available at http://localhost:${PORT}/health`);
      logger.info(`🤖 AI Service: ${aiService.getStatus()}`);
    });

  } catch (error) {
    logger.error('Failed to initialize server:', error);
    process.exit(1);
  }
}

// Start server
initializeServer();

module.exports = { app, server, io };