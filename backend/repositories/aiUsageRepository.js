import { AiUsage } from '../models/AiUsage.js';

/**
 * AI Usage Repository - Telemetry & Token Tracking
 */

export const recordAiUsageRepo = async (usageData) => {
  return await AiUsage.create(usageData);
};

export const getUserAiUsageSummaryRepo = async (userId) => {
  const result = await AiUsage.aggregate([
    { $match: { user: userId } },
    {
      $group: {
        _id: null,
        totalRequests: { $sum: 1 },
        totalPromptTokens: { $sum: '$promptTokens' },
        totalCompletionTokens: { $sum: '$completionTokens' },
        totalTokens: { $sum: '$totalTokens' },
        totalEstimatedCostUsd: { $sum: '$estimatedCostUsd' },
        avgLatencyMs: { $avg: '$latencyMs' },
      },
    },
  ]);

  if (!result || result.length === 0) {
    return {
      totalRequests: 0,
      totalPromptTokens: 0,
      totalCompletionTokens: 0,
      totalTokens: 0,
      totalEstimatedCostUsd: 0,
      avgLatencyMs: 0,
    };
  }

  return result[0];
};
