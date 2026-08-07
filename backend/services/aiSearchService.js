import { Job } from '../models/Job.js';
import { WorkerProfile } from '../models/WorkerProfile.js';
import { SYSTEM_PROMPTS, formatSmartSearchPrompt } from '../prompts/systemPrompts.js';
import { createGroqCompletion } from './groqService.js';
import { aiCache } from '../utils/aiCacheUtil.js';
import { recordAiUsageRepo } from '../repositories/aiUsageRepository.js';
import { logTokenUsage } from '../utils/tokenTracker.js';
import { AppError } from '../utils/appError.js';
import { HTTP_STATUS } from '../constants/index.js';
import { logger } from '../utils/logger.js';

/**
 * Safely build Mongoose filter for Job collection from Groq AI intent JSON
 */
const buildJobMongoFilter = (filterObj = {}) => {
  const query = { status: 'Active', isDeleted: { $ne: true } };

  if (filterObj.title) {
    query.$or = [
      { title: { $regex: filterObj.title, $options: 'i' } },
      { description: { $regex: filterObj.title, $options: 'i' } },
    ];
  }

  if (filterObj.category) {
    query.category = { $regex: filterObj.category, $options: 'i' };
  }

  if (filterObj.cropType) {
    query.cropType = { $regex: filterObj.cropType, $options: 'i' };
  }

  if (typeof filterObj.maxWage === 'number' && filterObj.maxWage > 0) {
    query.dailyWage = { $lte: filterObj.maxWage };
  } else if (typeof filterObj.minWage === 'number' && filterObj.minWage > 0) {
    query.dailyWage = { $gte: filterObj.minWage };
  }

  if (filterObj.workType) {
    query.workType = { $regex: filterObj.workType, $options: 'i' };
  }

  if (filterObj.district) {
    query['jobAddress.district'] = { $regex: filterObj.district, $options: 'i' };
  }

  return query;
};

/**
 * Safely build Mongoose filter for WorkerProfile collection from Groq AI intent JSON
 */
const buildWorkerMongoFilter = (filterObj = {}) => {
  const query = { isDeleted: { $ne: true } };

  if (filterObj.skills && Array.isArray(filterObj.skills) && filterObj.skills.length > 0) {
    query.skills = { $in: filterObj.skills.map((s) => new RegExp(s, 'i')) };
  } else if (filterObj.skillKeyword) {
    query.$or = [
      { skills: { $regex: filterObj.skillKeyword, $options: 'i' } },
      { title: { $regex: filterObj.skillKeyword, $options: 'i' } },
      { bio: { $regex: filterObj.skillKeyword, $options: 'i' } },
    ];
  }

  if (typeof filterObj.maxWage === 'number' && filterObj.maxWage > 0) {
    query.expectedDailyWage = { $lte: filterObj.maxWage };
  }

  if (filterObj.district) {
    query.preferredDistrict = { $regex: filterObj.district, $options: 'i' };
  }

  if (filterObj.availability) {
    query.availability = { $regex: filterObj.availability, $options: 'i' };
  }

  return query;
};

/**
 * AI Smart Search Service Layer
 * Converts natural language search queries into structured MongoDB filter criteria,
 * executes queries against Job and WorkerProfile collections, and returns matched records.
 */
export const performSmartSearch = async (userId, searchQuery) => {
  const queryText = searchQuery.trim();

  // 1. Check Cache
  const cacheKey = aiCache.generateKey('smart_search', { queryText });
  const cachedData = aiCache.get(cacheKey);
  if (cachedData) {
    return { ...cachedData, isCached: true };
  }

  // 2. Build prompt and query Groq
  const userPrompt = formatSmartSearchPrompt(queryText);

  const messages = [
    { role: 'system', content: SYSTEM_PROMPTS.SMART_SEARCH_CONVERTER },
    { role: 'user', content: userPrompt },
  ];

  const aiResult = await createGroqCompletion(messages, {
    temperature: 0.2, // Low temperature for precise JSON filter output
    responseFormat: { type: 'json_object' },
  });

  // 3. Parse JSON output
  let parsedContent = {};
  try {
    parsedContent = JSON.parse(aiResult.content);
  } catch (err) {
    logger.error(`Failed to parse AI Smart Search JSON response: ${aiResult.content}`);
    parsedContent = {
      searchExplanation: `Searching for '${queryText}' across farm jobs and candidate profiles.`,
      target: 'both',
    };
  }

  const searchTarget = parsedContent.searchTarget || 'both';

  // 4. Construct MongoDB queries
  const jobQuery = buildJobMongoFilter(parsedContent.jobFilter || {});
  const workerQuery = buildWorkerMongoFilter(parsedContent.workerFilter || {});

  // 5. Execute DB queries parallelly
  let matchingJobs = [];
  let matchingWorkers = [];

  if (searchTarget === 'both' || searchTarget === 'jobs') {
    matchingJobs = await Job.find(jobQuery)
      .populate('farmer', 'name email mobile location')
      .select('_id title category cropType dailyWage workType location jobAddress status description isUrgent farmer createdAt')
      .limit(20)
      .lean();

    // Fallback text search if initial structured query returned no records
    if (matchingJobs.length === 0) {
      const textRegex = new RegExp(queryText, 'i');
      matchingJobs = await Job.find({
        status: 'Active',
        isDeleted: { $ne: true },
        $or: [
          { title: textRegex },
          { category: textRegex },
          { cropType: textRegex },
          { description: textRegex },
          { 'jobAddress.district': textRegex },
        ],
      })
        .populate('farmer', 'name email mobile location')
        .limit(10)
        .lean();
    }
  }

  if (searchTarget === 'both' || searchTarget === 'workers') {
    matchingWorkers = await WorkerProfile.find(workerQuery)
      .populate('owner', 'name email mobile location')
      .select('_id title skills experience expectedDailyWage availability preferredDistrict preferredState bio rating totalJobsCompleted owner')
      .limit(20)
      .lean();

    // Fallback text search for workers
    if (matchingWorkers.length === 0) {
      const textRegex = new RegExp(queryText, 'i');
      matchingWorkers = await WorkerProfile.find({
        isDeleted: { $ne: true },
        $or: [
          { title: textRegex },
          { skills: textRegex },
          { bio: textRegex },
          { preferredDistrict: textRegex },
        ],
      })
        .populate('owner', 'name email mobile location')
        .limit(10)
        .lean();
    }
  }

  // 6. Record usage telemetry
  const estimatedCostUsd = logTokenUsage('/api/v1/ai/search', aiResult.model, aiResult.usage, aiResult.latencyMs);

  await recordAiUsageRepo({
    user: userId,
    endpoint: '/api/v1/ai/search',
    model: aiResult.model,
    promptTokens: aiResult.usage.promptTokens,
    completionTokens: aiResult.usage.completionTokens,
    totalTokens: aiResult.usage.totalTokens,
    estimatedCostUsd,
    latencyMs: aiResult.latencyMs,
    status: 'success',
  });

  const responsePayload = {
    searchQuery: queryText,
    searchExplanation:
      parsedContent.searchExplanation ||
      `Interpreted natural language query '${queryText}' to filter jobs and worker candidates by skill, wage, and location.`,
    matchingJobs,
    matchingWorkers,
    generatedFilters: {
      searchTarget,
      jobFilter: parsedContent.jobFilter || jobQuery,
      workerFilter: parsedContent.workerFilter || workerQuery,
    },
    totalMatchedJobs: matchingJobs.length,
    totalMatchedWorkers: matchingWorkers.length,
    usage: aiResult.usage,
    isCached: false,
  };

  // Cache response for 5 minutes
  aiCache.set(cacheKey, responsePayload, 5 * 60 * 1000);

  return responsePayload;
};
