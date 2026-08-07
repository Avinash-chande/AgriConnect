import { WorkerProfile } from '../models/WorkerProfile.js';
import { SYSTEM_PROMPTS, formatProfileAnalysisPrompt } from '../prompts/systemPrompts.js';
import { executeGroqJsonQuery } from './groqService.js';
import { AppError } from '../utils/appError.js';
import { HTTP_STATUS } from '../constants/index.js';

/**
 * Deterministic Baseline Profile Strength Calculator (0-100)
 */
export const calculateBaselineProfileStrength = (workerProfile) => {
  let score = 0;

  if (workerProfile.title && workerProfile.title !== 'Agricultural Specialist') score += 10;
  else score += 5;
  if (workerProfile.bio && workerProfile.bio.length > 20) score += 5;

  const skillsCount = Array.isArray(workerProfile.skills) ? workerProfile.skills.length : 0;
  if (skillsCount >= 4) score += 15;
  else if (skillsCount >= 1) score += 10;

  if ((workerProfile.experience || 0) > 0) score += 10;

  if (workerProfile.preferredDistrict && workerProfile.preferredState) score += 10;
  if (workerProfile.preferredVillage) score += 5;
  if (workerProfile.availability) score += 5;

  if (workerProfile.expectedDailyWage > 0 || workerProfile.expectedMonthlySalary > 0) score += 10;
  if (Array.isArray(workerProfile.languages) && workerProfile.languages.length >= 2) score += 5;

  if (workerProfile.aadhaarVerified) score += 15;
  if (Array.isArray(workerProfile.certificateImages) && workerProfile.certificateImages.length > 0) score += 5;
  if (Array.isArray(workerProfile.profileGallery) && workerProfile.profileGallery.length > 0) score += 5;

  return Math.min(score, 100);
};

/**
 * AI Profile Improvement Service
 * Analyzes worker profile and generates optimized headline, bio, summary, missing skills,
 * experience descriptions, missing information checks, and profile strength score.
 */
export const analyzeAndImproveWorkerProfile = async (userId) => {
  const workerProfile = await WorkerProfile.findOne({ owner: userId }).populate('owner', 'name email mobile location').lean();
  if (!workerProfile) {
    throw new AppError('Worker profile not found. Please create a worker profile first.', HTTP_STATUS.NOT_FOUND);
  }

  const cacheKey = `profile_analysis_${workerProfile._id}_${workerProfile.updatedAt?.getTime() || Date.now()}`;
  const baselineScore = calculateBaselineProfileStrength(workerProfile);
  const userPrompt = formatProfileAnalysisPrompt(workerProfile);

  const messages = [
    { role: 'system', content: SYSTEM_PROMPTS.PROFILE_ANALYZER },
    { role: 'user', content: userPrompt },
  ];

  const { data: parsedContent, usage, isCached } = await executeGroqJsonQuery({
    userId,
    endpoint: '/api/v1/ai/profile/analyze',
    cacheKey,
    ttlMs: 15 * 60 * 1000,
    messages,
    temperature: 0.4,
  });

  const aiScore = typeof parsedContent.profileScore === 'number' ? parsedContent.profileScore : baselineScore;
  const finalProfileScore = Math.min(Math.round((aiScore + baselineScore) / 2), 100);

  const missingInfoList = Array.isArray(parsedContent.missingInformation) && parsedContent.missingInformation.length > 0
    ? parsedContent.missingInformation
    : [];

  if (!workerProfile.aadhaarVerified) missingInfoList.push('Government Aadhaar Identity Verification');
  if (!workerProfile.preferredVillage) missingInfoList.push('Preferred Village/Panchayat details');
  if (!workerProfile.certificateImages || workerProfile.certificateImages.length === 0) {
    missingInfoList.push('Certifications or Training Proof');
  }

  const workerName = workerProfile.owner?.name || 'Worker';
  const primarySkill = workerProfile.skills?.[0] || 'Agricultural Operations';

  return {
    workerId: workerProfile._id,
    profileScore: finalProfileScore,
    improvedHeadline:
      parsedContent.improvedHeadline ||
      `Experienced ${primarySkill} Specialist | ${workerProfile.experience || 1}+ Years in ${workerProfile.preferredDistrict}`,
    improvedBio:
      parsedContent.improvedBio ||
      `Dedicated and reliable agricultural specialist with ${workerProfile.experience || 1} years of hands-on expertise in ${primarySkill} and crop care in ${workerProfile.preferredDistrict}, ${workerProfile.preferredState}. Known for strong work ethic, punctuality, and equipment operation safety.`,
    improvedSummary:
      parsedContent.improvedSummary ||
      `${workerName} is a highly rated (${workerProfile.rating || 5.0}/5.0 stars) farm specialist in ${workerProfile.preferredDistrict}. Proficient in ${Array.isArray(workerProfile.skills) ? workerProfile.skills.join(', ') : 'farm labor'} with a track record of ${workerProfile.totalJobsCompleted || 0} completed farm jobs.`,
    improvedExperienceDescription:
      parsedContent.improvedExperienceDescription ||
      `Managed field operations including sowing, irrigation management, weeding, and crop harvesting over ${workerProfile.experience || 1} years across ${workerProfile.preferredDistrict} region with high productivity standards.`,
    recommendedSkills:
      Array.isArray(parsedContent.recommendedSkills) && parsedContent.recommendedSkills.length > 0
        ? parsedContent.recommendedSkills
        : ['Drip Irrigation Setup', 'Soil Testing & Sampling', 'Pesticide Sprayer Operation', 'Tractor Equipment Handling'],
    missingInformation: [...new Set(missingInfoList)],
    suggestions:
      Array.isArray(parsedContent.suggestions) && parsedContent.suggestions.length > 0
        ? parsedContent.suggestions
        : [
            'Add at least 3 primary skills to appear in top farmer candidate searches',
            'Complete Aadhaar verification badge to increase farmer contact requests by 40%',
            'Upload photos of your recent farm work to your profile gallery',
          ],
    usage,
    isCached,
  };
};
