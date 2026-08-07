import { logger } from './logger.js';

/**
 * Token Usage & Cost Estimation Utility for Groq Models
 */

// Model pricing per 1,000 tokens (USD)
const GROQ_MODEL_PRICING = {
  'llama-3.3-70b-versatile': { prompt: 0.00059, completion: 0.00079 },
  'llama3-70b-8192': { prompt: 0.00059, completion: 0.00079 },
  'llama3-8b-8192': { prompt: 0.00005, completion: 0.00008 },
  'mixtral-8x7b-32768': { prompt: 0.00024, completion: 0.00024 },
  default: { prompt: 0.0005, completion: 0.0008 },
};

/**
 * Calculate estimated cost in USD based on model pricing
 */
export const calculateEstimatedCost = (model, promptTokens = 0, completionTokens = 0) => {
  const pricing = GROQ_MODEL_PRICING[model] || GROQ_MODEL_PRICING.default;
  const promptCost = (promptTokens / 1000) * pricing.prompt;
  const completionCost = (completionTokens / 1000) * pricing.completion;
  return parseFloat((promptCost + completionCost).toFixed(6));
};

/**
 * Extract token counts safely from OpenAI SDK response object
 */
export const extractUsageFromResponse = (response) => {
  if (!response || !response.usage) {
    return { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
  }

  const { prompt_tokens = 0, completion_tokens = 0, total_tokens = 0 } = response.usage;
  return {
    promptTokens: prompt_tokens,
    completionTokens: completion_tokens,
    totalTokens: total_tokens || prompt_tokens + completion_tokens,
  };
};

/**
 * Log token telemetry to application logger
 */
export const logTokenUsage = (endpoint, model, usage, latencyMs) => {
  const cost = calculateEstimatedCost(model, usage.promptTokens, usage.completionTokens);
  logger.info(
    `[AI Token Telemetry] ${endpoint} | Model: ${model} | Prompt Tokens: ${usage.promptTokens} | Completion Tokens: ${usage.completionTokens} | Total: ${usage.totalTokens} | Latency: ${latencyMs}ms | Est. Cost: $${cost}`
  );
  return cost;
};
