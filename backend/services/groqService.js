import { groqClient, groqConfig } from '../config/groq.js';
import { withRetry } from '../utils/retryUtil.js';
import { extractUsageFromResponse, logTokenUsage } from '../utils/tokenTracker.js';
import { recordAiUsageRepo } from '../repositories/aiUsageRepository.js';
import { aiCache } from '../utils/aiCacheUtil.js';
import { AppError } from '../utils/appError.js';
import { HTTP_STATUS } from '../constants/index.js';
import { logger } from '../utils/logger.js';

/**
 * Groq Service Layer - Interacts directly with Groq API using OpenAI SDK
 */

/**
 * Send a non-streaming Chat Completion request to Groq API
 * 
 * @param {Array<Object>} messages - Messages array [{role: 'system'|'user'|'assistant', content: '...'}]
 * @param {Object} options - Completion parameters (model, temperature, max_tokens, response_format)
 * @returns {Promise<Object>} Object containing { content, usage, model, rawResponse }
 */
export const createGroqCompletion = async (messages, options = {}) => {
  const model = options.model || groqConfig.defaultModel;
  const temperature = options.temperature ?? groqConfig.temperatureDefault;
  const max_tokens = options.maxTokens ?? groqConfig.maxTokensDefault;
  const response_format = options.responseFormat;

  const payload = {
    model,
    messages,
    temperature,
    max_tokens,
  };

  if (response_format) {
    payload.response_format = response_format;
  }

  const startTime = Date.now();

  try {
    const response = await withRetry(async () => {
      return await groqClient.chat.completions.create(payload);
    });

    const latencyMs = Date.now() - startTime;
    const choice = response.choices[0];
    const content = choice?.message?.content || '';
    const usage = extractUsageFromResponse(response);

    return {
      content,
      usage,
      model: response.model || model,
      latencyMs,
      finishReason: choice?.finish_reason || 'stop',
      rawResponse: response,
    };
  } catch (error) {
    logger.error(`Groq API Completion Error: ${error.message}`, { stack: error.stack });

    if (error.status === 401 || error.statusCode === 401) {
      throw new AppError('Invalid or missing Groq API Key.', HTTP_STATUS.UNAUTHORIZED);
    }
    if (error.status === 429 || error.statusCode === 429) {
      throw new AppError('Groq API rate limit exceeded. Please try again shortly.', HTTP_STATUS.TOO_MANY_REQUESTS);
    }
    if (error.status === 400 || error.statusCode === 400) {
      throw new AppError(`Groq API Bad Request: ${error.message}`, HTTP_STATUS.BAD_REQUEST);
    }

    throw new AppError(`Groq AI Service Failure: ${error.message}`, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
};

/**
 * Stream a Chat Completion response from Groq API using AsyncIterator (SSE support)
 * 
 * @param {Array<Object>} messages - Messages array
 * @param {Object} options - Stream completion parameters
 * @returns {Promise<AsyncIterable>} OpenAI Stream async iterable
 */
export const createGroqStreamCompletion = async (messages, options = {}) => {
  const model = options.model || groqConfig.defaultModel;
  const temperature = options.temperature ?? groqConfig.temperatureDefault;
  const max_tokens = options.maxTokens ?? groqConfig.maxTokensDefault;

  const payload = {
    model,
    messages,
    temperature,
    max_tokens,
    stream: true,
  };

  try {
    const stream = await withRetry(async () => {
      return await groqClient.chat.completions.create(payload);
    });

    return stream;
  } catch (error) {
    logger.error(`Groq API Stream Completion Error: ${error.message}`);
    throw new AppError(`Groq AI Streaming Service Failure: ${error.message}`, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
};

/**
 * Unified Helper for Executing Groq JSON Queries with Caching, Retry, Telemetry, and Safe Fallback Parsing
 */
export const executeGroqJsonQuery = async ({
  userId,
  endpoint,
  cacheKey,
  ttlMs = 15 * 60 * 1000,
  messages,
  temperature = 0.3,
  fallbackData = {},
}) => {
  // 1. Check Cache
  if (cacheKey) {
    const cached = aiCache.get(cacheKey);
    if (cached) {
      return { ...cached, isCached: true };
    }
  }

  // 2. Call Groq Completion
  const aiResult = await createGroqCompletion(messages, {
    temperature,
    responseFormat: { type: 'json_object' },
  });

  // 3. Parse JSON safely
  let parsedContent = {};
  try {
    parsedContent = JSON.parse(aiResult.content);
  } catch (err) {
    logger.error(`JSON Parse Error at ${endpoint}: ${aiResult.content}`);
    parsedContent = fallbackData;
  }

  // 4. Record Usage Telemetry
  const estimatedCostUsd = logTokenUsage(endpoint, aiResult.model, aiResult.usage, aiResult.latencyMs);

  if (userId) {
    await recordAiUsageRepo({
      user: userId,
      endpoint,
      model: aiResult.model,
      promptTokens: aiResult.usage.promptTokens,
      completionTokens: aiResult.usage.completionTokens,
      totalTokens: aiResult.usage.totalTokens,
      estimatedCostUsd,
      latencyMs: aiResult.latencyMs,
      status: 'success',
    });
  }

  const result = {
    data: parsedContent,
    usage: aiResult.usage,
    model: aiResult.model,
    latencyMs: aiResult.latencyMs,
    isCached: false,
  };

  // 5. Cache result
  if (cacheKey) {
    aiCache.set(cacheKey, result, ttlMs);
  }

  return result;
};
