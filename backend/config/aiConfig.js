import dotenv from 'dotenv';
import { DEFAULT_AI_LIMITS, DEFAULT_AI_MODELS } from '../constants/aiConstants.js';

dotenv.config();

/**
 * OpenAI-Compatible Environment Configuration for AgriConnect
 */
export const getAIConfig = () => {
  const apiKey = process.env.OPENAI_API_KEY || '';
  const baseUrl = (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/+$/, '');
  const model = process.env.OPENAI_MODEL || DEFAULT_AI_MODELS.PRIMARY;
  const maxTokens = parseInt(process.env.AI_MAX_TOKENS, 10) || DEFAULT_AI_LIMITS.MAX_TOKENS;
  const temperature = parseFloat(process.env.AI_TEMPERATURE) || DEFAULT_AI_LIMITS.TEMPERATURE;
  const timeoutMs = parseInt(process.env.AI_TIMEOUT_MS, 10) || DEFAULT_AI_LIMITS.TIMEOUT_MS;
  const enableCache = process.env.AI_ENABLE_CACHE !== 'false';
  const cacheTtlSeconds = parseInt(process.env.AI_CACHE_TTL_SECONDS, 10) || DEFAULT_AI_LIMITS.CACHE_TTL_SECONDS;
  const enableFallback = process.env.AI_ENABLE_FALLBACK !== 'false';
  const enableStreaming = process.env.AI_ENABLE_STREAMING !== 'false';

  return {
    apiKey,
    baseUrl,
    model,
    maxTokens,
    temperature,
    timeoutMs,
    enableCache,
    cacheTtlSeconds,
    enableFallback,
    enableStreaming,
    isConfigured: Boolean(apiKey && apiKey.trim().length > 0 && apiKey !== 'your_openai_api_key_here'),
  };
};

export const aiConfig = getAIConfig();
