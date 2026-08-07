import crypto from 'crypto';
import { logger } from './logger.js';

/**
 * In-Memory TTL Cache Utility for AI Recommendations & Query Responses
 */
class AiCacheManager {
  constructor(maxItems = 200, defaultTtlMs = 15 * 60 * 1000) {
    this.cache = new Map();
    this.maxItems = maxItems;
    this.defaultTtlMs = defaultTtlMs;
  }

  /**
   * Generate deterministic hash key from prompt or object parameters
   */
  generateKey(prefix, data) {
    const serialized = typeof data === 'string' ? data : JSON.stringify(data);
    const hash = crypto.createHash('md5').update(serialized).digest('hex');
    return `${prefix}:${hash}`;
  }

  /**
   * Get cached item if valid and unexpired
   */
  get(key) {
    if (!this.cache.has(key)) return null;

    const entry = this.cache.get(key);
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      logger.debug(`[AiCache] Cache expired for key: ${key}`);
      return null;
    }

    logger.info(`[AiCache] Cache hit for key: ${key}`);
    return entry.value;
  }

  /**
   * Set item with optional custom TTL
   */
  set(key, value, ttlMs = this.defaultTtlMs) {
    if (this.cache.size >= this.maxItems) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
    });
    logger.debug(`[AiCache] Cached entry for key: ${key} (TTL: ${ttlMs}ms)`);
  }

  /**
   * Flush all items
   */
  clear() {
    this.cache.clear();
    logger.info('[AiCache] Cleared all cached AI responses');
  }
}

export const aiCache = new AiCacheManager();
