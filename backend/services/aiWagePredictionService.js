import { Job } from '../models/Job.js';
import { SYSTEM_PROMPTS, formatWagePredictionPrompt } from '../prompts/systemPrompts.js';
import { executeGroqJsonQuery } from './groqService.js';

/**
 * Fetch platform database market benchmark wage for crop & district
 */
const getPlatformWageBenchmark = async (crop, district) => {
  const matchCriteria = { status: 'Active', isDeleted: { $ne: true } };
  if (crop) matchCriteria.cropType = { $regex: crop, $options: 'i' };
  if (district) matchCriteria['jobAddress.district'] = { $regex: district, $options: 'i' };

  const result = await Job.aggregate([
    { $match: matchCriteria },
    {
      $group: {
        _id: null,
        avgDailyWage: { $avg: '$dailyWage' },
        minDailyWage: { $min: '$dailyWage' },
        maxDailyWage: { $max: '$dailyWage' },
        sampleCount: { $sum: 1 },
      },
    },
  ]);

  if (result.length > 0 && result[0].sampleCount > 0) {
    return {
      avgDailyWage: Math.round(result[0].avgDailyWage),
      minDailyWage: result[0].minDailyWage,
      maxDailyWage: result[0].maxDailyWage,
      sampleCount: result[0].sampleCount,
    };
  }

  return { avgDailyWage: 500, minDailyWage: 400, maxDailyWage: 700, sampleCount: 0 };
};

/**
 * AI Wage Prediction Service Layer
 * Predicts optimal daily & monthly wages, demand levels, hiring difficulty, reasoning,
 * and confidence scores based on crop, location, season, experience, worker count, and working hours.
 */
export const predictWageWithAi = async (userId, inputData) => {
  const { crop, district, state, season, experience, workersNeeded, workingHours } = inputData;

  const cacheKey = `wage_pred_${crop}_${district}_${season}_${experience}_${workingHours}`;
  const platformBenchmark = await getPlatformWageBenchmark(crop, district);

  const userPrompt = formatWagePredictionPrompt({
    ...inputData,
    dbBenchmark: platformBenchmark,
  });

  const messages = [
    { role: 'system', content: SYSTEM_PROMPTS.WAGE_PREDICTOR },
    { role: 'user', content: userPrompt },
  ];

  const { data: parsedContent, usage, isCached } = await executeGroqJsonQuery({
    userId,
    endpoint: '/api/v1/ai/predict-wage',
    cacheKey,
    ttlMs: 30 * 60 * 1000,
    messages,
    temperature: 0.3,
  });

  const recommendedDaily = parsedContent.recommendedDailyWage || platformBenchmark.avgDailyWage || 550;
  const recommendedMonthly = parsedContent.recommendedMonthlyWage || Math.round(recommendedDaily * 26);

  return {
    recommendedDailyWage: recommendedDaily,
    recommendedMonthlyWage: recommendedMonthly,
    demandLevel: parsedContent.demandLevel || 'High',
    hiringDifficulty: parsedContent.hiringDifficulty || 'Moderate',
    reasoning:
      parsedContent.reasoning ||
      `Based on ${season || 'current'} season demand for ${crop || 'crop'} in ${district || ''}, ${state || ''}, the benchmark wage of ₹${recommendedDaily}/day reflects local market rates for ${workingHours || 8} working hours with ${experience || 1}+ years of experience.`,
    confidenceScore: typeof parsedContent.confidenceScore === 'number' ? parsedContent.confidenceScore : 90,
    inputParameters: {
      crop,
      district,
      state,
      season,
      experience,
      workersNeeded,
      workingHours,
    },
    platformMarketBenchmark: platformBenchmark,
    usage,
    isCached,
  };
};
