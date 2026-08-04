/**
 * In-Memory High-Performance TTL Cache Service
 * Provides ultra-fast response caching for public profiles and search queries
 */

class CacheService {
  constructor(defaultTTLSeconds = 300) {
    this.cache = new Map();
    this.defaultTTL = defaultTTLSeconds * 1000;
  }

  /**
   * Set cache key with optional custom TTL in seconds
   */
  set(key, value, ttlSeconds) {
    const ttl = ttlSeconds ? ttlSeconds * 1000 : this.defaultTTL;
    const expiresAt = Date.now() + ttl;
    this.cache.set(key, { value, expiresAt });
  }

  /**
   * Get cached value if valid and not expired
   */
  get(key) {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() > cached.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return cached.value;
  }

  /**
   * Delete specific cache key
   */
  delete(key) {
    this.cache.delete(key);
  }

  /**
   * Clear all cache entries matching a prefix (e.g. 'profile:')
   */
  clearPrefix(prefix) {
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Flush entire cache memory
   */
  flush() {
    this.cache.clear();
  }
}

export const cacheService = new CacheService(300); // 5-minute default TTL
