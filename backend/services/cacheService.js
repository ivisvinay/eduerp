// services/cacheService.js
const NodeCache = require('node-cache');
const logger = require('./logger');

class CacheService {
  constructor() {
    // Default TTL: 5 minutes, check period: 10 minutes
    this.cache = new NodeCache({
      stdTTL: 300,
      checkperiod: 600,
      useClones: false
    });
    
    this.hitCount = 0;
    this.missCount = 0;
    this.initialized = false;

    // Event listeners
    this.cache.on('set', (key, value) => {
      logger.debug(`Cache SET: ${key}`);
    });

    this.cache.on('del', (key, value) => {
      logger.debug(`Cache DEL: ${key}`);
    });

    this.cache.on('expired', (key, value) => {
      logger.debug(`Cache EXPIRED: ${key}`);
    });
  }

  async initialize() {
    try {
      this.initialized = true;
      logger.info('Cache Service initialized');
    } catch (error) {
      logger.error('Cache Service initialization failed:', error);
      throw error;
    }
  }

  async get(key) {
    try {
      const value = this.cache.get(key);
      
      if (value !== undefined) {
        this.hitCount++;
        logger.debug(`Cache HIT: ${key}`);
        return value;
      } else {
        this.missCount++;
        logger.debug(`Cache MISS: ${key}`);
        return null;
      }
    } catch (error) {
      logger.error(`Cache GET error for key ${key}:`, error);
      return null;
    }
  }

  async set(key, value, ttl = null) {
    try {
      const success = this.cache.set(key, value, ttl || undefined);
      if (success) {
        logger.debug(`Cache SET success: ${key}`);
      } else {
        logger.warn(`Cache SET failed: ${key}`);
      }
      return success;
    } catch (error) {
      logger.error(`Cache SET error for key ${key}:`, error);
      return false;
    }
  }

  async del(key) {
    try {
      const deletedCount = this.cache.del(key);
      logger.debug(`Cache DEL: ${key} (deleted: ${deletedCount})`);
      return deletedCount > 0;
    } catch (error) {
      logger.error(`Cache DEL error for key ${key}:`, error);
      return false;
    }
  }

  async clear() {
    try {
      this.cache.flushAll();
      this.hitCount = 0;
      this.missCount = 0;
      logger.info('Cache cleared');
      return true;
    } catch (error) {
      logger.error('Cache CLEAR error:', error);
      return false;
    }
  }

  async has(key) {
    try {
      return this.cache.has(key);
    } catch (error) {
      logger.error(`Cache HAS error for key ${key}:`, error);
      return false;
    }
  }

  async keys() {
    try {
      return this.cache.keys();
    } catch (error) {
      logger.error('Cache KEYS error:', error);
      return [];
    }
  }

  async getStats() {
    try {
      const stats = this.cache.getStats();
      const hitRate = this.hitCount + this.missCount > 0 ? 
        (this.hitCount / (this.hitCount + this.missCount) * 100).toFixed(2) : '0.00';

      return {
        keys: stats.keys,
        hits: this.hitCount,
        misses: this.missCount,
        hitRate: `${hitRate}%`,
        ksize: stats.ksize,
        vsize: stats.vsize
      };
    } catch (error) {
      logger.error('Cache STATS error:', error);
      return {};
    }
  }

  async cleanup() {
    try {
      this.cache.close();
      this.initialized = false;
      logger.info('Cache Service cleaned up');
    } catch (error) {
      logger.error('Cache cleanup error:', error);
    }
  }
}

module.exports = new CacheService();


