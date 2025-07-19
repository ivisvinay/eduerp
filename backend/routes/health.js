const express = require('express');
const router = express.Router();
const llmService = require('../services/llmService');
const cacheService = require('../services/cacheService');
const { asyncHandler } = require('../middleware/asyncHandler');

// GET /api/health - Basic health check
router.get('/', asyncHandler(async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0'
  };

  res.json(health);
}));

// GET /api/health/detailed - Detailed health check
router.get('/detailed', asyncHandler(async (req, res) => {
  try {
    const llmStatus = await llmService.getConnectionStatus();
    const cacheStats = await cacheService.getStats();

    const health = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
      services: {
        llm: {
          status: llmStatus.connected ? 'connected' : 'disconnected',
          selectedModel: llmStatus.selectedModel,
          availableModels: llmStatus.availableModels,
          initialized: llmStatus.initialized
        },
        cache: {
          status: 'ok',
          stats: cacheStats
        }
      },
      system: {
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
        nodeVersion: process.version,
        platform: process.platform
      }
    };

    // Determine overall status
    if (!llmStatus.connected) {
      health.status = 'degraded';
    }

    res.json(health);
  } catch (error) {
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
}));

module.exports = router;