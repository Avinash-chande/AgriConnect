import { groqClient, groqConfig } from '../config/groq.js';
import { withRetry } from '../utils/retryUtil.js';
import { extractUsageFromResponse, logTokenUsage } from '../utils/tokenTracker.js';
import { recordAiUsageRepo } from '../repositories/aiUsageRepository.js';
import { aiCache } from '../utils/aiCacheUtil.js';
import { AppError } from '../utils/appError.js';
import { HTTP_STATUS } from '../constants/index.js';
import { logger } from '../utils/logger.js';

const isApiKeyConfigured = () => {
  const key = groqConfig.apiKey;
  return key && typeof key === 'string' && key.trim().length > 0 && !key.includes('unconfigured') && !key.includes('your_');
};

const getMockAiResponse = (messages, isJson = false) => {
  const lastMessage = [...messages].reverse().find((m) => m.role === 'user')?.content || '';
  const query = lastMessage.toLowerCase();

  if (isJson) {
    if (query.includes('wage') || query.includes('predict')) {
      return JSON.stringify({
        estimatedDailyWage: 450,
        currency: 'INR',
        range: { min: 400, max: 500 },
        confidenceScore: 0.92,
        marketTrend: 'Increased demand during harvest season (+12%)',
        factors: ['High local crop yield', 'Worker scarcity in district', 'Peak harvest timing']
      });
    }
    if (query.includes('job') || query.includes('description')) {
      return JSON.stringify({
        jobTitle: 'Experienced Wheat Harvesting Specialist',
        description: 'Seeking skilled agricultural workers for wheat harvesting and bundling in local fields.',
        requiredSkills: ['Wheat Harvesting', 'Combine Operation', 'Manual Bundling'],
        responsibilities: ['Harvest mature wheat fields', 'Operate threshing equipment safely', 'Bundle harvest'],
        benefits: ['Free meals provided', 'Daily wage payout'],
        safetyInstructions: ['Wear protective gloves', 'Maintain safe distance from blades']
      });
    }
    return JSON.stringify({
      recommendations: [
        {
          jobTitle: 'Rice Sowing & Harvesting',
          matchScore: 94,
          reason: 'Matches your experience in grain harvesting and location proximity.'
        }
      ],
      insights: 'Strong market demand for seasonal harvesting workers.'
    });
  }

  if (query.includes('crop') || query.includes('wheat') || query.includes('rice') || query.includes('cotton') || query.includes('pest')) {
    return `🌾 **AgriConnect AI Crop Advisory**\n\n` +
      `Here are recommended guidelines for your query on **${lastMessage}**:\n\n` +
      `1. **Optimal Soil & Irrigation**: Ensure well-drained soil with organic compost enrichment. Water regularly during germination.\n` +
      `2. **Pest & Disease Prevention**: Monitor leaf discoloration weekly. Apply organic neem oil spray if early pest infestation appears.\n` +
      `3. **Seasonal Timing**: Align planting schedules with the local monsoon/seasonal calendar for maximum yield.\n\n` +
      `*Tip: You can also use AgriConnect's Job Matching tool to hire specialized workers for harvesting!*`;
  }

  if (query.includes('job') || query.includes('work') || query.includes('hire') || query.includes('wage')) {
    return `💼 **AgriConnect Employment Assistance**\n\n` +
      `Based on current regional agricultural data:\n\n` +
      `- **Average Daily Wage**: ₹400 - ₹550 per day (varies by crop & task intensity).\n` +
      `- **Top In-Demand Skills**: Tractor Driving, Irrigation Management, Crop Bundling, Organic Farming.\n` +
      `- **Best Practice**: Post your job opening early to connect with verified nearby farm workers.\n\n` +
      `Would you like me to help draft a job description or estimate wages for a specific district?`;
  }

  return `🤖 **AgriConnect AI Assistant**\n\n` +
    `Thank you for asking: "${lastMessage}"!\n\n` +
    `I am your dedicated AI assistant on the AgriConnect platform. I can assist you with:\n` +
    `- **Crop Care & Pest Management**: Insights on soil, irrigation, and crop protection.\n` +
    `- **Farm Job Postings**: Generating descriptions and requirements for farm hiring.\n` +
    `- **Wage Estimations**: Checking regional wage benchmarks across districts.\n` +
    `- **Platform Help**: Navigating farmer & worker discovery features.\n\n` +
    `How can I assist your farm today?`;
};

async function* mockStreamGenerator(responseText) {
  const words = responseText.split(' ');
  for (let i = 0; i < words.length; i += 3) {
    const chunkText = words.slice(i, i + 3).join(' ') + ' ';
    yield {
      choices: [
        {
          delta: { content: chunkText },
        },
      ],
    };
    await new Promise((resolve) => setTimeout(resolve, 30));
  }
}

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

  if (!isApiKeyConfigured()) {
    const mockContent = getMockAiResponse(messages, response_format?.type === 'json_object');
    return {
      content: mockContent,
      usage: { promptTokens: 30, completionTokens: 80, totalTokens: 110 },
      model: 'agriconnect-ai-mock',
      latencyMs: 120,
      finishReason: 'stop',
      rawResponse: {},
    };
  }

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

    if (process.env.NODE_ENV !== 'production') {
      logger.warn('⚠️ Groq API call failed in development. Using mock AI fallback.');
      const mockContent = getMockAiResponse(messages, response_format?.type === 'json_object');
      return {
        content: mockContent,
        usage: { promptTokens: 30, completionTokens: 80, totalTokens: 110 },
        model: 'agriconnect-ai-mock',
        latencyMs: 120,
        finishReason: 'stop',
        rawResponse: {},
      };
    }

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
  if (!isApiKeyConfigured()) {
    const mockContent = getMockAiResponse(messages, false);
    return mockStreamGenerator(mockContent);
  }

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
    if (process.env.NODE_ENV !== 'production') {
      logger.warn('⚠️ Groq API Stream call failed in development. Using mock stream fallback.');
      const mockContent = getMockAiResponse(messages, false);
      return mockStreamGenerator(mockContent);
    }
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
