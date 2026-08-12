/**
 * Centralized Redis Client Configuration Module for AgriConnect
 * Creates an ioredis client with silent error handling and automatic reconnects.
 * Ensures that Redis connection failure NEVER crashes the Node.js application process.
 */

import Redis from 'ioredis';
import { logger } from '../utils/logger.js';

let redisClient = null;
let isRedisConnected = false;

const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

try {
  redisClient = new Redis(redisUrl, {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
    connectTimeout: 5000,
    retryStrategy(times) {
      if (times > 3) {
        logger.warn('⚠️ [Redis] Max reconnection attempts reached. Running in degraded fallback mode.');
        return null; // Stop retrying automatically after 3 failures
      }
      return Math.min(times * 500, 2000);
    },
  });

  redisClient.on('connect', () => {
    isRedisConnected = true;
    logger.info('⚡ [Redis] Client connected successfully');
  });

  redisClient.on('error', (err) => {
    isRedisConnected = false;
    logger.warn(`⚠️ [Redis] Connection error: ${err.message}. Operating in fallback mode.`);
  });

  redisClient.on('close', () => {
    isRedisConnected = false;
  });

  redisClient.on('reconnecting', () => {
    logger.info('🔄 [Redis] Attempting connection...');
  });

  // Connect asynchronously without blocking startup
  redisClient.connect().catch((err) => {
    isRedisConnected = false;
    logger.warn(`⚠️ [Redis] Could not connect to Redis server (${err.message}). Using in-memory fallback.`);
  });
} catch (err) {
  isRedisConnected = false;
  logger.warn(`⚠️ [Redis] Initialization failed (${err.message}). Defaulting to in-memory fallback.`);
}

/**
 * Check if Redis is currently connected and operational
 */
export const isRedisReady = () => {
  return isRedisConnected && redisClient && redisClient.status === 'ready';
};

export { redisClient };
