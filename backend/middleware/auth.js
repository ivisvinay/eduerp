// middleware/auth.js (Optional - for future authentication)
const jwt = require('jsonwebtoken');
const logger = require('../services/logger');

const auth = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'No token provided'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
    req.user = decoded;
    next();
  } catch (error) {
    logger.error('Auth middleware error:', error);
    res.status(401).json({
      success: false,
      error: 'Invalid token'
    });
  }
};

// Optional auth middleware that doesn't fail if no token
const optionalAuth = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
      req.user = decoded;
    } catch (error) {
      // Ignore auth errors for optional auth
      logger.warn('Optional auth failed:', error.message);
    }
  }

  next();
};

module.exports = { auth, optionalAuth };