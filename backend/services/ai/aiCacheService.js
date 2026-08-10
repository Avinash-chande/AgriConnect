import crypto from 'crypto';
import { aiConfig } from '../../config/aiConfig.js';
import { aiLogger } from './aiLogger.js';
import { redisCacheService } from '../redisCacheService.js';

/**
 * Resilient Redis & In-Memory Cache Service for AI Completions
 */
class AICacheService {
  constructor() {
    this.cache = new Map();
    this.hits = 0;
    this.misses = 0;
    this.maxSize = 1000;
  }

  /**
   * Generates a deterministic SHA-256 hash key for an AI completion payload
   */
  generateKey({ model = '', systemPrompt = '', messages = [], prompt = '', category = '' }) {
    const payload = JSON.stringify({
      model: model || aiConfig.model,
      systemPrompt,
      category,
      messages: messages.map((m) => ({ role: m.role, content: m.content?.trim() })),
      prompt: prompt?.trim(),
    });

    return crypto.createHash('sha256').update(payload).digest('hex');
  }

  /**
   * Gets a cached item if present and not expired
   */
  async getAsync(key) {
    if (!aiConfig.enableCache) return null;

    const redisVal = await redisCacheService.get(`ai:recommendation:${key}`);
    if (redisVal !== null) {
      this.hits++;
      return redisVal;
    }

    const entry = this.cache.get(key);
    if (!entry) {
      this.misses++;
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }

    this.hits++;
    aiLogger.debug(`Cache hit for key: ${key.substring(0, 10)}...`);
    return entry.value;
  }

  /**
   * Synchronous get fallback
   */
  get(key) {
    if (!aiConfig.enableCache) return null;

    const entry = this.cache.get(key);
    if (!entry) {
      this.misses++;
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }

    this.hits++;
    return entry.value;
  }

  /**
   * Stores an item in the cache with a specified TTL in seconds
   */
  async set(key, value, ttlSeconds = aiConfig.cacheTtlSeconds) {
    if (!aiConfig.enableCache || !key || !value) return;

    // Async write to Redis cache layer
    redisCacheService.set(`ai:recommendation:${key}`, value, ttlSeconds).catch(() => {});

    // Maintain max size limit in memory
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }

    const expiresAt = Date.now() + ttlSeconds * 1000;
    this.cache.set(key, { value, expiresAt });
  }

  /**
   * Invalidates a specific key or clears all cache
   */
  clear(key = null) {
    if (key) {
      this.cache.delete(key);
      redisCacheService.del(`ai:recommendation:${key}`).catch(() => {});
    } else {
      this.cache.clear();
      redisCacheService.delPattern('ai:recommendation:*').catch(() => {});
      this.hits = 0;
      this.misses = 0;
    }
  }

  /**
   * Returns cache stats
   */
  getStats() {
    const total = this.hits + this.misses;
    const hitRatePercent = total > 0 ? ((this.hits / total) * 100).toFixed(2) : '0.00';
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hits: this.hits,
      misses: this.misses,
      hitRate: `${hitRatePercent}%`,
      enabled: aiConfig.enableCache,
    };
  }
}

export const aiCacheService = new AICacheService();
