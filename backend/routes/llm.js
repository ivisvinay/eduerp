// routes/llm.js
const express = require('express');
const router = express.Router();
const Joi = require('joi');
const llmService = require('../services/llmService');
const logger = require('../services/logger');
const { asyncHandler } = require('../middleware/asyncHandler');

// Validation schemas
const querySchema = Joi.object({
  query: Joi.string().required().min(1).max(2000),
  schoolData: Joi.object().required(),
  conversationHistory: Joi.array().items(
    Joi.object({
      role: Joi.string().valid('user', 'assistant').required(),
      content: Joi.string().required()
    })
  ).default([]),
  options: Joi.object({
    maxTokens: Joi.number().integer().min(50).max(2000).default(800),
    temperature: Joi.number().min(0).max(2).default(0.3),
    sessionId: Joi.string().optional()
  }).default({})
});

const modelSelectionSchema = Joi.object({
  modelId: Joi.string().required()
});

// POST /api/llm/query - Process LLM query
router.post('/query', asyncHandler(async (req, res) => {
  // Validate request
  const { error, value } = querySchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: error.details[0].message
    });
  }

  const { query, schoolData, conversationHistory, options } = value;

  try {
    logger.info(`Processing LLM query: ${query.substring(0, 100)}...`);

    // Process query through LLM service
    const result = await llmService.processSchoolQuery(
      query,
      schoolData,
      conversationHistory,
      { sessionId: options.sessionId, requestId: req.headers['x-request-id'] }
    );

    // Log usage for monitoring
    if (result.usage) {
      logger.info(`LLM Query completed - Tokens: ${result.usage.total_tokens}, Model: ${result.model}`);
    }

    res.json({
      success: result.success,
      data: {
        response: result.response,
        suggestions: result.suggestions,
        usage: result.usage,
        model: result.model,
        timestamp: result.timestamp
      }
    });

  } catch (error) {
    logger.error('LLM query processing failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process query',
      timestamp: new Date().toISOString()
    });
  }
}));

// GET /api/llm/models - Get available models
router.get('/models', asyncHandler(async (req, res) => {
  try {
    await llmService.fetchModels();
    const status = await llmService.getConnectionStatus();
    
    res.json({
      success: true,
      data: {
        availableModels: llmService.availableModels,
        selectedModel: status.selectedModel,
        connected: status.connected
      }
    });
  } catch (error) {
    logger.error('Failed to fetch models:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch models'
    });
  }
}));

// POST /api/llm/models/select - Select a model
router.post('/models/select', asyncHandler(async (req, res) => {
  const { error, value } = modelSelectionSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: error.details[0].message
    });
  }

  try {
    await llmService.setModel(value.modelId);
    
    res.json({
      success: true,
      data: {
        selectedModel: value.modelId,
        message: `Model changed to ${value.modelId}`
      }
    });
  } catch (error) {
    logger.error('Failed to set model:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
}));

// GET /api/llm/status - Get LLM service status
router.get('/status', asyncHandler(async (req, res) => {
  try {
    const status = await llmService.getConnectionStatus();
    
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    logger.error('Failed to get status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get status'
    });
  }
}));

// POST /api/llm/test - Test LLM connection
router.post('/test', asyncHandler(async (req, res) => {
  try {
    const isConnected = await llmService.testConnection();
    
    if (isConnected) {
      await llmService.fetchModels();
    }
    
    const status = await llmService.getConnectionStatus();
    
    res.json({
      success: true,
      data: {
        connected: isConnected,
        ...status,
        message: isConnected ? 'Connection successful' : 'Connection failed'
      }
    });
  } catch (error) {
    logger.error('Connection test failed:', error);
    res.status(500).json({
      success: false,
      error: 'Connection test failed',
      details: error.message
    });
  }
}));

// DELETE /api/llm/cache - Clear LLM cache
router.delete('/cache', asyncHandler(async (req, res) => {
  try {
    const cacheService = require('../services/cacheService');
    await cacheService.clear();
    
    res.json({
      success: true,
      message: 'Cache cleared successfully'
    });
  } catch (error) {
    logger.error('Failed to clear cache:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear cache'
    });
  }
}));

// GET /api/llm/stats - Get usage statistics
router.get('/stats', asyncHandler(async (req, res) => {
  try {
    const status = await llmService.getConnectionStatus();
    const cacheService = require('../services/cacheService');
    const cacheStats = await cacheService.getStats();
    
    res.json({
      success: true,
      data: {
        llm: {
          connected: status.connected,
          selectedModel: status.selectedModel,
          availableModels: status.availableModels,
          requestCount: status.requestCount,
          initialized: status.initialized
        },
        cache: cacheStats,
        server: {
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          nodeVersion: process.version
        }
      }
    });
  } catch (error) {
    logger.error('Failed to get stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get statistics'
    });
  }
}));

module.exports = router;