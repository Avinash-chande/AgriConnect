/**
 * Unified Resilient Redis Cache Service with In-Memory Fallback & Security Guardrails
 * 
 * Features:
 * 1. Operates on Redis when available.
 * 2. Automatically falls back to an in-memory TTL Map when Redis is disconnected or unavailable.
 * 3. Never throws unhandled errors on cache operations (resilient degrade).
 * 4. STRICT SECURITY: Enforces policy blocking caching of sensitive data (passwords, JWT secrets, payment credentials, Aadhaar/e-KYC).
 */

import { redisClient, isRedisReady } from '../config/redis.js';
import { logger } from '../utils/logger.js';

// In-Memory Fallback Map store: Map<key, { value: any, expiresAt: number }>
const memoryStore = new Map();

// Security blocklist pattern list
const FORBIDDEN_CACHE_PATTERNS = [
  'password',
  'jwt',
  'secret',
  'token',
  'aadhaar',
  'kyc',
  'document',
  'credit_card',
  'cvv',
  'private_key',
];

/**
 * Validates if a cache key or payload contains sensitive data that must not be cached
 */
const isForbiddenCacheData = (key, value) => {
  if (!key || typeof key !== 'string') return true;
  const keyLower = key.toLowerCase();

  // Check key against forbidden patterns
  if (FORBIDDEN_CACHE_PATTERNS.some((pattern) => keyLower.includes(pattern))) {
    logger.warn(`🔒 [CacheSecurity] Blocked attempt to cache sensitive key pattern "${key}".`);
    return true;
  }

  // Check object values if value is an object
  if (value && typeof value === 'object') {
    const valString = JSON.stringify(value).toLowerCase();
    if (
      valString.includes('"password"') ||
      valString.includes('"aadhaar"') ||
      valString.includes('"kyc"') ||
      valString.includes('"secret"')
    ) {
      logger.warn(`🔒 [CacheSecurity] Blocked attempt to cache payload containing sensitive properties under key "${key}".`);
      return true;
    }
  }

  return false;
};

/**
 * Clean up expired keys from in-memory fallback store
 */
const cleanMemoryStore = () => {
  const now = Date.now();
  for (const [k, v] of memoryStore.entries()) {
    if (v.expiresAt && now > v.expiresAt) {
      memoryStore.delete(k);
    }
  }
};

// Run periodic cleanup every 60 seconds
setInterval(cleanMemoryStore, 60000).unref();

export const redisCacheService = {
  /**
   * Get cached item by key
   */
  async get(key) {
    if (!key || isForbiddenCacheData(key, null)) return null;

    try {
      if (isRedisReady()) {
        const raw = await redisClient.get(key);
        if (raw) return JSON.parse(raw);
      }
    } catch (err) {
      logger.warn(`⚠️ [CacheGet] Redis error for key "${key}": ${err.message}. Falling back to memory.`);
    }

    // In-memory fallback lookup
    const cached = memoryStore.get(key);
    if (cached) {
      if (cached.expiresAt && Date.now() > cached.expiresAt) {
        memoryStore.delete(key);
        return null;
      }
      return cached.value;
    }

    return null;
  },

  /**
   * Set cache item with TTL in seconds
   */
  async set(key, value, ttlSeconds = 300) {
    if (!key || value === undefined || isForbiddenCacheData(key, value)) return false;

    const serialized = JSON.stringify(value);
    let redisSuccess = false;

    try {
      if (isRedisReady()) {
        await redisClient.set(key, serialized, 'EX', ttlSeconds);
        redisSuccess = true;
      }
    } catch (err) {
      logger.warn(`⚠️ [CacheSet] Redis error for key "${key}": ${err.message}. Saving to memory store.`);
    }

    // Always update in-memory store as fallback
    memoryStore.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });

    return redisSuccess;
  },

  /**
   * Delete cached key
   */
  async del(key) {
    if (!key) return false;

    memoryStore.delete(key);

    try {
      if (isRedisReady()) {
        await redisClient.del(key);
      }
      return true;
    } catch (err) {
      logger.warn(`⚠️ [CacheDel] Redis error for key "${key}": ${err.message}`);
      return false;
    }
  },

  /**
   * Delete keys matching a prefix pattern (e.g. "jobs:*")
   */
  async delPattern(pattern) {
    if (!pattern) return;

    // Clean in-memory keys matching pattern
    const regexPattern = new RegExp(`^${pattern.replace('*', '.*')}`);
    for (const k of memoryStore.keys()) {
      if (regexPattern.test(k)) {
        memoryStore.delete(k);
      }
    }

    try {
      if (isRedisReady()) {
        const keys = await redisClient.keys(pattern);
        if (keys && keys.length > 0) {
          await redisClient.del(...keys);
        }
      }
    } catch (err) {
      logger.warn(`⚠️ [CacheDelPattern] Redis error for pattern "${pattern}": ${err.message}`);
    }
  },

  /**
   * Helper: Get from cache or compute via fetchFn and store in cache
   */
  async getOrSet(key, fetchFn, ttlSeconds = 300) {
    const cached = await this.get(key);
    if (cached !== null && cached !== undefined) {
      return cached;
    }

    const freshData = await fetchFn();
    if (freshData !== null && freshData !== undefined) {
      await this.set(key, freshData, ttlSeconds);
    }
    return freshData;
  },

  /**
   * Clear all cached keys
   */
  async flush() {
    memoryStore.clear();
    try {
      if (isRedisReady()) {
        await redisClient.flushdb();
      }
    } catch (err) {
      logger.warn(`⚠️ [CacheFlush] Redis error: ${err.message}`);
    }
  },
};
