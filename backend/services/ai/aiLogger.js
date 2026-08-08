import { logger } from '../../utils/logger.js';

/**
 * AI Service Structured Logging Wrapper
 */
export const aiLogger = {
  info: (message, meta = {}) => {
    logger.info(`[AI Infra] ${message}`, { service: 'ai-infra', ...meta });
  },

  debug: (message, meta = {}) => {
    logger.debug(`[AI Infra] ${message}`, { service: 'ai-infra', ...meta });
  },

  warn: (message, meta = {}) => {
    logger.warn(`[AI Infra] ${message}`, { service: 'ai-infra', ...meta });
  },

  error: (message, meta = {}) => {
    logger.error(`[AI Infra] ${message}`, { service: 'ai-infra', ...meta });
  },

  logCompletion: ({ model, promptTokens, completionTokens, totalTokens, durationMs, cached = false, fallback = false }) => {
    logger.info(`[AI Completion] Model: ${model} | Tokens: ${totalTokens} (${promptTokens}p/${completionTokens}c) | Duration: ${durationMs}ms | Cached: ${cached} | Fallback: ${fallback}`, {
      service: 'ai-infra',
      metric: 'completion',
      model,
      promptTokens,
      completionTokens,
      totalTokens,
      durationMs,
      cached,
      fallback,
    });
  },
};
