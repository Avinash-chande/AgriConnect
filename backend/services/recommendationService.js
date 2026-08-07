import { Job } from '../models/Job.js';
import { WorkerProfile } from '../models/WorkerProfile.js';
import { FarmerProfile } from '../models/FarmerProfile.js';
import { SavedJob } from '../models/SavedJob.js';
import { Application } from '../models/Application.js';
import {
  SYSTEM_PROMPTS,
  formatJobRecommendationPrompt,
  formatCropRecommendationPrompt,
  formatWorkerRecommendationPrompt,
  formatCropWorkerRecommendationPrompt,
} from '../prompts/systemPrompts.js';
import { createGroqCompletion } from './groqService.js';
import { aiCache } from '../utils/aiCacheUtil.js';
import { recordAiUsageRepo } from '../repositories/aiUsageRepository.js';
import { logTokenUsage } from '../utils/tokenTracker.js';
import { AppError } from '../utils/appError.js';
import { HTTP_STATUS } from '../constants/index.js';
import { logger } from '../utils/logger.js';

/**
 * Deterministic Baseline Job Match Score Calculator
 */
export const calculateBaselineJobMatchScore = (workerProfile, job) => {
  let score = 0;

  // 1. Skill Match (Weight 30%)
  const workerSkills = (workerProfile.skills || []).map((s) => s.toLowerCase());
  const jobTitleAndDesc = `${job.title} ${job.description} ${job.category} ${job.cropType}`.toLowerCase();
  
  const matchedSkills = workerSkills.filter((skill) => jobTitleAndDesc.includes(skill));
  const skillRatio = workerSkills.length > 0 ? matchedSkills.length / Math.min(workerSkills.length, 3) : 0.5;
  score += Math.min(skillRatio, 1) * 30;

  // 2. Location Match (Weight 20%)
  const jobDistrict = job.jobAddress?.district || job.location || '';
  const jobState = job.jobAddress?.state || '';
  if (
    jobDistrict.toLowerCase() === (workerProfile.preferredDistrict || '').toLowerCase() ||
    jobState.toLowerCase() === (workerProfile.preferredState || '').toLowerCase()
  ) {
    score += 20;
  } else {
    score += 5;
  }

  // 3. Wage Alignment (Weight 20%)
  const workerExpectedWage = workerProfile.expectedDailyWage || 500;
  const jobDailyWage = job.dailyWage || 500;
  if (jobDailyWage >= workerExpectedWage) {
    score += 20;
  } else if (jobDailyWage >= workerExpectedWage * 0.8) {
    score += 12;
  } else {
    score += 5;
  }

  // 4. Experience Match (Weight 15%)
  const workerExp = workerProfile.experience || 0;
  if (workerExp >= 3) score += 15;
  else if (workerExp >= 1) score += 10;
  else score += 5;

  // 5. Availability & Work Type Match (Weight 15%)
  if (workerProfile.preferredWorkType === job.workType) {
    score += 15;
  } else {
    score += 8;
  }

  return Math.round(Math.min(score, 100));
};

/**
 * Deterministic Baseline Worker Candidate Match Score Calculator (8 Dimensions)
 * Evaluates: Skills (25%), Distance/Location (20%), Experience (15%), Crop Knowledge (15%), Availability (10%), Rating (10%), Previous Hire (+5% bonus)
 */
export const calculateBaselineWorkerCandidateScore = (worker, job, isPreviouslyHired = false) => {
  let score = 0;

  // 1. Skill Match (25%)
  const jobText = `${job.title} ${job.category} ${job.cropType || ''} ${job.description || ''}`.toLowerCase();
  const workerSkills = (worker.skills || []).map((s) => s.toLowerCase());
  const matchedSkills = workerSkills.filter((sk) => jobText.includes(sk));
  const skillScore = workerSkills.length > 0 ? (matchedSkills.length / Math.min(workerSkills.length, 3)) * 25 : 12;
  score += Math.min(skillScore, 25);

  // 2. Distance / Location Match (20%)
  const jobDistrict = (job.jobAddress?.district || job.location || '').toLowerCase();
  const workerDistrict = (worker.preferredDistrict || '').toLowerCase();
  if (jobDistrict && workerDistrict && jobDistrict === workerDistrict) {
    score += 20;
  } else if (worker.preferredState?.toLowerCase() === (job.jobAddress?.state || '').toLowerCase()) {
    score += 12;
  } else {
    score += 5;
  }

  // 3. Experience (15%)
  const exp = worker.experience || 0;
  if (exp >= 5) score += 15;
  else if (exp >= 2) score += 10;
  else score += 5;

  // 4. Crop Knowledge (15%)
  const cropStr = (job.cropType || '').toLowerCase();
  const bioTitleStr = `${worker.title || ''} ${worker.bio || ''}`.toLowerCase();
  if (cropStr && bioTitleStr.includes(cropStr)) {
    score += 15;
  } else {
    score += 8;
  }

  // 5. Availability (10%)
  if (worker.availability === 'Immediate') score += 10;
  else if (worker.availability === 'Within 3 Days') score += 7;
  else score += 4;

  // 6. Rating (10%)
  const rating = worker.rating || 5.0;
  score += (rating / 5.0) * 10;

  // 7. Previous Hire Bonus (+5%)
  if (isPreviouslyHired) score += 5;

  return Math.round(Math.min(score, 100));
};

/**
 * Get AI Job Recommendations for a Worker (9 Dimensions)
 */
export const getJobRecommendationsForWorker = async (userId) => {
  const workerProfile = await WorkerProfile.findOne({ owner: userId }).populate('owner', 'name location email');
  if (!workerProfile) {
    throw new AppError('Worker profile not found. Please complete your worker profile first.', HTTP_STATUS.NOT_FOUND);
  }

  const savedJobs = await SavedJob.find({ worker: userId })
    .populate('job', 'title category cropType dailyWage workType location')
    .lean();

  const previousApplications = await Application.find({ worker: userId, isDeleted: { $ne: true } })
    .populate('job', 'title category cropType dailyWage workType')
    .select('job status expectedDailyWage createdAt')
    .lean();

  const cacheKey = aiCache.generateKey('deep_job_recommendations', {
    userId,
    updatedAt: workerProfile.updatedAt,
    savedCount: savedJobs.length,
    appCount: previousApplications.length,
  });

  const cachedData = aiCache.get(cacheKey);
  if (cachedData) {
    return { ...cachedData, isCached: true };
  }

  const activeJobs = await Job.find({ status: 'Active', isDeleted: { $ne: true } })
    .select('_id title category cropType dailyWage wageType workType description status isUrgent jobAddress farmer')
    .populate('farmer', 'name location')
    .limit(15)
    .lean();

  if (!activeJobs || activeJobs.length === 0) {
    return {
      workerId: workerProfile._id,
      recommendations: [],
      message: 'No active job postings found matching platform records at this moment.',
      isCached: false,
    };
  }

  const sanitizedJobs = activeJobs.map((job) => ({
    jobId: job._id.toString(),
    title: job.title,
    category: job.category,
    cropType: job.cropType || 'General Farm',
    workType: job.workType,
    dailyWage: job.dailyWage,
    wageType: job.wageType,
    location: `${job.jobAddress?.district || ''}, ${job.jobAddress?.state || ''}`,
    isUrgent: job.isUrgent || false,
    description: (job.description || '').substring(0, 250),
  }));

  const userPrompt = formatJobRecommendationPrompt(
    workerProfile,
    savedJobs,
    previousApplications,
    sanitizedJobs
  );

  const messages = [
    { role: 'system', content: SYSTEM_PROMPTS.JOB_RECOMMENDATION },
    { role: 'user', content: userPrompt },
  ];

  const aiResult = await createGroqCompletion(messages, {
    temperature: 0.3,
    responseFormat: { type: 'json_object' },
  });

  let parsedRecommendations = [];
  try {
    const rawParsed = JSON.parse(aiResult.content);
    parsedRecommendations = Array.isArray(rawParsed.recommendations)
      ? rawParsed.recommendations
      : rawParsed;
  } catch (err) {
    logger.error(`Failed to parse Groq Job Recommendation JSON output: ${aiResult.content}`);
    parsedRecommendations = [];
  }

  const finalRecommendations = sanitizedJobs.map((job) => {
    const aiRec = parsedRecommendations.find(
      (r) => r.jobId === job.jobId || r.jobTitle?.toLowerCase() === job.title.toLowerCase()
    );

    const baselineScore = calculateBaselineJobMatchScore(workerProfile, job);
    const finalScore = aiRec?.matchScore ? Math.round((aiRec.matchScore + baselineScore) / 2) : baselineScore;

    const workerSkillsLower = (workerProfile.skills || []).map((s) => s.toLowerCase());
    const jobReqs = [job.category, job.cropType].filter(Boolean);
    const missing = jobReqs.filter((req) => !workerSkillsLower.some((ws) => ws.includes(req.toLowerCase())));

    return {
      jobId: job.jobId,
      jobTitle: job.title,
      category: job.category,
      cropType: job.cropType,
      dailyWage: job.dailyWage,
      workType: job.workType,
      location: job.location,
      matchScore: aiRec?.matchScore ?? finalScore,
      reason:
        aiRec?.reason ||
        `Matches your ${workerProfile.preferredDistrict} location preference and ${job.category} background with competitive daily wage of ₹${job.dailyWage}.`,
      missingSkills:
        Array.isArray(aiRec?.missingSkills) && aiRec.missingSkills.length > 0
          ? aiRec.missingSkills
          : missing.length > 0
          ? missing
          : ['Advanced machinery operation certification'],
      suggestedImprovements:
        Array.isArray(aiRec?.suggestedImprovements) && aiRec.suggestedImprovements.length > 0
          ? aiRec.suggestedImprovements
          : [
              `Highlight ${job.cropType} experience in your profile bio`,
              `Add Aadhaar verification badge to boost farmer trust`,
            ],
    };
  });

  finalRecommendations.sort((a, b) => b.matchScore - a.matchScore);

  const estimatedCostUsd = logTokenUsage('/api/v1/ai/recommendations/jobs', aiResult.model, aiResult.usage, aiResult.latencyMs);

  await recordAiUsageRepo({
    user: userId,
    endpoint: '/api/v1/ai/recommendations/jobs',
    model: aiResult.model,
    promptTokens: aiResult.usage.promptTokens,
    completionTokens: aiResult.usage.completionTokens,
    totalTokens: aiResult.usage.totalTokens,
    estimatedCostUsd,
    latencyMs: aiResult.latencyMs,
    status: 'success',
  });

  const responsePayload = {
    workerId: workerProfile._id,
    totalEvaluated: sanitizedJobs.length,
    recommendations: finalRecommendations,
    usage: aiResult.usage,
    isCached: false,
  };

  aiCache.set(cacheKey, responsePayload, 10 * 60 * 1000);

  return responsePayload;
};

/**
 * Get AI Worker Candidate Recommendations for a Farmer's Job (8 Dimensions)
 * Evaluates: Skills, Experience, Distance, Languages, Crop Knowledge, Availability, Ratings, Previous Hiring.
 * Generates: Match Score, Hiring Reason, Worker Summary, Strengths, Weaknesses.
 */
export const getWorkerRecommendationsForJob = async (userId, jobId = null) => {
  // 1. Load Farmer's Job or retrieve latest Active Job created by farmer
  let job;
  if (jobId) {
    job = await Job.findOne({ _id: jobId, farmer: userId, isDeleted: { $ne: true } }).lean();
  } else {
    job = await Job.findOne({ farmer: userId, status: 'Active', isDeleted: { $ne: true } })
      .sort({ createdAt: -1 })
      .lean();
  }

  if (!job) {
    // If farmer has no posted job yet, generate fallback job spec based on farmer profile
    const farmerProfile = await FarmerProfile.findOne({ owner: userId }).lean();
    job = {
      _id: 'default_farm_job',
      title: `${farmerProfile?.farmName || 'Farm'} Labor Request`,
      category: 'General Farm Labor',
      cropType: farmerProfile?.cropTypes?.[0] || 'Mixed Crops',
      workType: 'Contractual / Seasonal',
      dailyWage: 500,
      description: 'Agricultural farm worker needed for planting, weeding, and crop maintenance.',
      jobAddress: { district: farmerProfile?.farmAddress?.district || '', state: farmerProfile?.farmAddress?.state || '' },
    };
  }

  // 2. Fetch Previous Hiring Records by this Farmer
  const previousHires = await Application.find({
    farmer: userId,
    status: { $in: ['Accepted', 'Hired'] },
    isDeleted: { $ne: true },
  })
    .select('worker')
    .lean();

  const previousHiredWorkerIds = previousHires.map((h) => h.worker.toString());

  // 3. Check Cache
  const cacheKey = aiCache.generateKey('worker_recommendations_v2', {
    farmerId: userId,
    jobId: job._id.toString(),
    hiredCount: previousHiredWorkerIds.length,
  });

  const cachedData = aiCache.get(cacheKey);
  if (cachedData) {
    return { ...cachedData, isCached: true };
  }

  // 4. Fetch candidate worker profiles from database
  const candidateWorkers = await WorkerProfile.find({ isDeleted: { $ne: true } })
    .populate('owner', 'name mobile email location')
    .select('_id title skills experience education expectedDailyWage bio owner rating availability preferredDistrict preferredState preferredVillage totalJobsCompleted languages')
    .limit(20)
    .lean();

  if (!candidateWorkers || candidateWorkers.length === 0) {
    return {
      jobId: job._id,
      candidates: [],
      message: 'No candidate workers currently registered in database.',
      isCached: false,
    };
  }

  // 5. Build prompt and query Groq LLM
  const userPrompt = formatWorkerRecommendationPrompt(job, candidateWorkers, previousHires);

  const messages = [
    { role: 'system', content: SYSTEM_PROMPTS.WORKER_RECOMMENDATION },
    { role: 'user', content: userPrompt },
  ];

  const aiResult = await createGroqCompletion(messages, {
    temperature: 0.3,
    responseFormat: { type: 'json_object' },
  });

  let parsedCandidates = [];
  try {
    const rawParsed = JSON.parse(aiResult.content);
    parsedCandidates = Array.isArray(rawParsed.candidates)
      ? rawParsed.candidates
      : Array.isArray(rawParsed.topCandidates)
      ? rawParsed.topCandidates
      : rawParsed;
  } catch (err) {
    logger.error(`Failed to parse Groq Worker Recommendation JSON output: ${aiResult.content}`);
    parsedCandidates = [];
  }

  // 6. Post-process candidates array ensuring every candidate contains all required fields:
  // Match Score, Hiring Reason, Worker Summary, Strengths, Weaknesses
  const finalCandidates = candidateWorkers.map((worker) => {
    const workerIdStr = worker._id.toString();
    const isPrevHired = previousHiredWorkerIds.includes(workerIdStr);

    const aiCand = parsedCandidates.find((c) => c.workerId === workerIdStr);
    const baselineScore = calculateBaselineWorkerCandidateScore(worker, job, isPrevHired);

    const finalScore = aiCand?.matchScore ? Math.round((aiCand.matchScore + baselineScore) / 2) : baselineScore;

    const workerName = worker.owner?.name || 'Skilled Worker';
    const primarySkillsStr = (worker.skills || []).join(', ') || 'Farm Labor';

    return {
      workerId: workerIdStr,
      candidateName: workerName,
      matchScore: aiCand?.matchScore ?? finalScore,
      hiringReason:
        aiCand?.hiringReason ||
        `${workerName} possesses ${worker.experience || 1} years of experience in ${primarySkillsStr} in ${worker.preferredDistrict}, matching your ${job.category} requirement with a rating of ${worker.rating || 5.0}/5.0.${isPrevHired ? ' Previously hired with high satisfaction.' : ''}`,
      summary:
        aiCand?.summary ||
        `${worker.title || 'Agricultural Specialist'} based in ${worker.preferredDistrict}, ${worker.preferredState}. Speaks ${Array.isArray(worker.languages) ? worker.languages.join(', ') : 'English, Hindi'} with ${worker.totalJobsCompleted || 0} completed farm jobs.`,
      strengths:
        Array.isArray(aiCand?.strengths) && aiCand.strengths.length > 0
          ? aiCand.strengths
          : [
              `${worker.experience || 1}+ years of verified ${job.category} experience`,
              `High platform reliability score (${worker.rating || 5.0}/5.0 stars)`,
              isPrevHired ? 'Prior successful working relationship with farmer' : `Available ${worker.availability || 'Immediately'}`,
            ],
      weaknesses:
        Array.isArray(aiCand?.weaknesses) && aiCand.weaknesses.length > 0
          ? aiCand.weaknesses
          : [
              worker.expectedDailyWage > (job.dailyWage || 500)
                ? `Expected daily wage (₹${worker.expectedDailyWage}) slightly exceeds initial offer (₹${job.dailyWage})`
                : 'May require brief orientation on specific crop field layout',
            ],
    };
  });

  // Sort candidates by matchScore descending
  finalCandidates.sort((a, b) => b.matchScore - a.matchScore);

  // 7. Record usage telemetry
  const estimatedCostUsd = logTokenUsage('/api/v1/ai/recommendations/workers', aiResult.model, aiResult.usage, aiResult.latencyMs);

  await recordAiUsageRepo({
    user: userId,
    endpoint: '/api/v1/ai/recommendations/workers',
    model: aiResult.model,
    promptTokens: aiResult.usage.promptTokens,
    completionTokens: aiResult.usage.completionTokens,
    totalTokens: aiResult.usage.totalTokens,
    estimatedCostUsd,
    latencyMs: aiResult.latencyMs,
    status: 'success',
  });

  const responsePayload = {
    jobId: job._id,
    jobTitle: job.title,
    totalEvaluated: candidateWorkers.length,
    candidates: finalCandidates,
    usage: aiResult.usage,
    isCached: false,
  };

  // Cache for 10 minutes
  aiCache.set(cacheKey, responsePayload, 10 * 60 * 1000);

  return responsePayload;
};

/**
 * Get Crop Recommendations based on farm parameters
 */
export const getCropRecommendations = async (userId, criteria) => {
  const cacheKey = aiCache.generateKey('crop_recommendations', criteria);
  const cachedData = aiCache.get(cacheKey);
  if (cachedData) {
    return { ...cachedData, isCached: true };
  }

  const userPrompt = formatCropRecommendationPrompt(criteria);

  const messages = [
    { role: 'system', content: SYSTEM_PROMPTS.CROP_RECOMMENDATION },
    { role: 'user', content: userPrompt },
  ];

  const aiResult = await createGroqCompletion(messages, {
    temperature: 0.4,
    responseFormat: { type: 'json_object' },
  });

  let parsedContent;
  try {
    parsedContent = JSON.parse(aiResult.content);
  } catch (err) {
    logger.error(`Failed to parse Crop Recommendation AI JSON: ${aiResult.content}`);
    parsedContent = { recommendedCrops: [], generalAdvice: aiResult.content };
  }

  const estimatedCostUsd = logTokenUsage('/api/v1/ai/recommendations/crops', aiResult.model, aiResult.usage, aiResult.latencyMs);

  await recordAiUsageRepo({
    user: userId,
    endpoint: '/api/v1/ai/recommendations/crops',
    model: aiResult.model,
    promptTokens: aiResult.usage.promptTokens,
    completionTokens: aiResult.usage.completionTokens,
    totalTokens: aiResult.usage.totalTokens,
    estimatedCostUsd,
    latencyMs: aiResult.latencyMs,
    status: 'success',
  });

  const responsePayload = {
    criteria,
    recommendations: parsedContent.recommendedCrops || parsedContent,
    generalAdvice: parsedContent.generalAdvice || '',
    usage: aiResult.usage,
    isCached: false,
  };

  aiCache.set(cacheKey, responsePayload, 30 * 60 * 1000);

  return responsePayload;
};

/**
 * Get Crop-Based Worker Recommendations for Farmers
 * Evaluates candidates based on: Crop specialization, Skills, Experience, Equipment Knowledge, Availability, Distance, Languages, Ratings.
 * Returns: Top Workers, Recommendation Score, Hiring Reason, Missing Skills, Rank.
 */
export const getCropBasedWorkerRecommendations = async (userId, criteria = {}) => {
  const { crop, district, state, equipmentNeeded } = criteria;
  const targetCrop = crop || 'General Farm';

  // 1. Check Cache
  const cacheKey = aiCache.generateKey('crop_worker_recommendations', {
    crop: targetCrop,
    district,
    state,
    equipmentNeeded,
  });

  const cachedData = aiCache.get(cacheKey);
  if (cachedData) {
    return { ...cachedData, isCached: true };
  }

  // 2. Fetch candidate worker profiles
  const candidateWorkers = await WorkerProfile.find({ isDeleted: { $ne: true } })
    .populate('owner', 'name mobile email location')
    .select('_id title skills experience education expectedDailyWage bio owner rating availability preferredDistrict preferredState totalJobsCompleted languages')
    .limit(20)
    .lean();

  if (!candidateWorkers || candidateWorkers.length === 0) {
    return {
      crop: targetCrop,
      totalEvaluated: 0,
      topWorkers: [],
      message: 'No candidate workers found.',
      isCached: false,
    };
  }

  // 3. Build prompt and query Groq
  const userPrompt = formatCropWorkerRecommendationPrompt(targetCrop, district, state, equipmentNeeded, candidateWorkers);

  const messages = [
    { role: 'system', content: SYSTEM_PROMPTS.CROP_WORKER_RECOMMENDER },
    { role: 'user', content: userPrompt },
  ];

  const aiResult = await createGroqCompletion(messages, {
    temperature: 0.3,
    responseFormat: { type: 'json_object' },
  });

  let parsedWorkers = [];
  try {
    const rawParsed = JSON.parse(aiResult.content);
    parsedWorkers = Array.isArray(rawParsed.topWorkers) ? rawParsed.topWorkers : rawParsed;
  } catch (err) {
    logger.error(`Failed to parse Crop Worker Recommendation JSON: ${aiResult.content}`);
    parsedWorkers = [];
  }

  // 4. Post-process topWorkers array
  const topWorkers = candidateWorkers.map((w, index) => {
    const wIdStr = w._id.toString();
    const aiW = parsedWorkers.find((item) => item.workerId === wIdStr);

    const workerName = w.owner?.name || 'Skilled Worker';
    const skillsStr = (w.skills || []).join(', ') || 'Farm Operations';

    const baselineScore = Math.min(
      Math.round(
        ((w.skills?.some((s) => s.toLowerCase().includes(targetCrop.toLowerCase())) ? 40 : 20) +
          (w.experience >= 3 ? 30 : 15) +
          (w.rating ? (w.rating / 5) * 30 : 25))
      ),
      100
    );

    const matchScore = aiW?.matchScore ?? baselineScore;

    return {
      rank: aiW?.rank || index + 1,
      workerId: wIdStr,
      candidateName: workerName,
      matchScore,
      hiringReason:
        aiW?.hiringReason ||
        `${workerName} possesses ${w.experience || 1} years of experience in ${skillsStr} in ${w.preferredDistrict}, matching your ${targetCrop} cultivation requirement with a ${w.rating || 5.0}/5.0 star rating.`,
      missingSkills:
        Array.isArray(aiW?.missingSkills) && aiW.missingSkills.length > 0
          ? aiW.missingSkills
          : [`Advanced ${targetCrop} pest management certification`],
    };
  });

  topWorkers.sort((a, b) => b.matchScore - a.matchScore);
  topWorkers.forEach((w, i) => {
    w.rank = i + 1;
  });

  // 5. Record usage telemetry
  const estimatedCostUsd = logTokenUsage('/api/v1/ai/recommendations/workers-by-crop', aiResult.model, aiResult.usage, aiResult.latencyMs);

  await recordAiUsageRepo({
    user: userId,
    endpoint: '/api/v1/ai/recommendations/workers-by-crop',
    model: aiResult.model,
    promptTokens: aiResult.usage.promptTokens,
    completionTokens: aiResult.usage.completionTokens,
    totalTokens: aiResult.usage.totalTokens,
    estimatedCostUsd,
    latencyMs: aiResult.latencyMs,
    status: 'success',
  });

  const responsePayload = {
    crop: targetCrop,
    totalEvaluated: candidateWorkers.length,
    topWorkers,
    usage: aiResult.usage,
    isCached: false,
  };

  aiCache.set(cacheKey, responsePayload, 10 * 60 * 1000);

  return responsePayload;
};
