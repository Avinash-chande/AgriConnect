import { logger } from './logger.js';

/**
 * Execute an async function with Exponential Backoff Retry logic & Jitter.
 * 
 * @param {Function} fn - Async target function to execute
 * @param {Object} options - Retry parameters
 * @param {number} options.maxRetries - Maximum number of retry attempts (default: 3)
 * @param {number} options.initialDelayMs - Initial backoff delay in ms (default: 1000)
 * @param {number} options.maxDelayMs - Maximum backoff delay cap (default: 10000)
 * @param {number} options.backoffFactor - Multiplier for each attempt (default: 2)
 * @returns {Promise<any>} Function execution result
 */
export const withRetry = async (fn, options = {}) => {
  const {
    maxRetries = 3,
    initialDelayMs = 1000,
    maxDelayMs = 10000,
    backoffFactor = 2,
  } = options;

  let attempt = 0;
  let delay = initialDelayMs;

  while (true) {
    try {
      attempt++;
      return await fn();
    } catch (error) {
      const isRateLimit = error?.status === 429 || error?.statusCode === 429;
      const isServerError = error?.status >= 500 || error?.statusCode >= 500;
      const isNetworkError = error?.code === 'ECONNRESET' || error?.code === 'ETIMEDOUT';

      const isRetryable = isRateLimit || isServerError || isNetworkError;

      if (!isRetryable || attempt > maxRetries) {
        logger.error(`Groq API call failed after ${attempt} attempt(s): ${error.message}`);
        throw error;
      }

      // Add full jitter to prevent thundering herd problem
      const jitter = Math.random() * delay * 0.3;
      const actualDelay = Math.min(delay + jitter, maxDelayMs);

      logger.warn(
        `Groq API temporary error (${error.status || error.code || 'transient'}). Retrying attempt ${attempt}/${maxRetries} after ${Math.round(actualDelay)}ms...`
      );

      await new Promise((resolve) => setTimeout(resolve, actualDelay));
      delay = delay * backoffFactor;
    }
  }
};
