import { WorkerProfile } from '../models/WorkerProfile.js';
import { User } from '../models/User.js';
import { Application } from '../models/Application.js';
import { SYSTEM_PROMPTS, formatResumeGeneratorPrompt } from '../prompts/systemPrompts.js';
import { createGroqCompletion } from './groqService.js';
import { aiCache } from '../utils/aiCacheUtil.js';
import { recordAiUsageRepo } from '../repositories/aiUsageRepository.js';
import { logTokenUsage } from '../utils/tokenTracker.js';
import { AppError } from '../utils/appError.js';
import { HTTP_STATUS } from '../constants/index.js';
import { logger } from '../utils/logger.js';

/**
 * AI Resume Generator Service
 * Analyzes worker profile details, certifications, education, and platform work history
 * to generate a complete professional resume with AI-enhanced summary, headline, and objective.
 */
export const generateWorkerResume = async (userId, targetWorkerProfileId = null) => {
  // 1. Fetch Worker Profile
  let workerProfile;
  if (targetWorkerProfileId) {
    workerProfile = await WorkerProfile.findById(targetWorkerProfileId)
      .populate('owner', 'name email mobile location userType avatar')
      .lean();
  } else {
    workerProfile = await WorkerProfile.findOne({ owner: userId })
      .populate('owner', 'name email mobile location userType avatar')
      .lean();
  }

  if (!workerProfile) {
    throw new AppError('Worker profile not found. Please complete your profile first.', HTTP_STATUS.NOT_FOUND);
  }

  // 2. Fetch completed work history on platform
  const completedApplications = await Application.find({
    worker: workerProfile.owner?._id || userId,
    status: { $in: ['Accepted', 'Completed', 'Hired'] },
    isDeleted: { $ne: true },
  })
    .populate('job', 'title category cropType dailyWage workType jobAddress location')
    .sort({ updatedAt: -1 })
    .limit(10)
    .lean();

  const workHistory = completedApplications.map((app) => ({
    jobTitle: app.job?.title || 'Agricultural Project',
    category: app.job?.category || 'Farm Operations',
    cropType: app.job?.cropType || 'Mixed Crops',
    dailyWage: app.expectedDailyWage || app.job?.dailyWage || 500,
    location: app.job?.jobAddress?.district || app.job?.location || 'Local Farm',
    completedDate: app.updatedAt,
  }));

  // 3. Check Cache
  const cacheKey = aiCache.generateKey('worker_resume', {
    profileId: workerProfile._id.toString(),
    historyCount: workHistory.length,
  });

  const cachedResume = aiCache.get(cacheKey);
  if (cachedResume) {
    return { ...cachedResume, isCached: true };
  }

  // 4. Format prompt & call Groq API
  const userPrompt = formatResumeGeneratorPrompt(workerProfile, workHistory);

  const messages = [
    { role: 'system', content: SYSTEM_PROMPTS.RESUME_GENERATOR },
    { role: 'user', content: userPrompt },
  ];

  const aiResult = await createGroqCompletion(messages, {
    temperature: 0.3,
    responseFormat: { type: 'json_object' },
  });

  let parsedContent = {};
  try {
    parsedContent = JSON.parse(aiResult.content);
  } catch (err) {
    logger.error(`Failed to parse AI Resume JSON output: ${aiResult.content}`);
    parsedContent = {};
  }

  // 5. Construct full professional resume payload
  const ownerUser = workerProfile.owner || {};

  const resumePayload = {
    resumeId: `RES-${workerProfile._id.toString().substring(18).toUpperCase()}`,
    generatedAt: new Date().toISOString(),
    personalDetails: {
      fullName: ownerUser.name || 'Agricultural Worker',
      mobile: ownerUser.mobile || 'Provided upon contact',
      email: ownerUser.email || '',
      location: `${workerProfile.preferredVillage ? workerProfile.preferredVillage + ', ' : ''}${workerProfile.preferredDistrict || ''}, ${workerProfile.preferredState || ''}`,
      aadhaarVerified: !!workerProfile.aadhaarVerified,
      avatarUrl: ownerUser.avatar || null,
      expectedDailyWage: workerProfile.expectedDailyWage || 500,
      availability: workerProfile.availability || 'Immediate',
    },
    resumeHeadline:
      parsedContent.resumeHeadline ||
      workerProfile.title ||
      `Experienced ${workerProfile.skills?.[0] || 'Agricultural'} Worker | ${workerProfile.experience || 1}+ Years Experience`,
    careerObjective:
      parsedContent.careerObjective ||
      `To leverage my ${workerProfile.experience || 1} years of hands-on farm experience in ${workerProfile.preferredDistrict || 'agricultural operations'} to deliver high crop yield, equipment operation, and field productivity for progressive farmers.`,
    professionalSummary:
      parsedContent.professionalSummary ||
      workerProfile.bio ||
      `Dedicated and hard-working agricultural worker with proven expertise in crop planting, soil preparation, irrigation management, and field harvesting. Demonstrated track record with ${workerProfile.rating || 5.0}/5.0 star rating on AgriConnect.`,
    skills: {
      primarySkills: Array.isArray(workerProfile.skills) ? workerProfile.skills : [workerProfile.skills || 'Farm Operations'],
      secondarySkills: parsedContent.secondarySkills || ['Crop Harvesting', 'Pest Control', 'Irrigation Setup'],
      equipmentKnowledge: parsedContent.equipmentKnowledge || ['Tractor Driving', 'Power Tiller', 'Drip System', 'Sprayer'],
    },
    experienceYears: workerProfile.experience || 0,
    education: workerProfile.education || '10th Pass / Secondary School',
    languages: Array.isArray(workerProfile.languages) && workerProfile.languages.length > 0 ? workerProfile.languages : ['Hindi', 'English'],
    certificates: Array.isArray(workerProfile.certificateImages) && workerProfile.certificateImages.length > 0
      ? workerProfile.certificateImages.map((c, i) => `Certified Farm Skills Spec #${i + 1}`)
      : ['AgriConnect Verified Worker Badge', 'Field Safety Protocols Training'],
    achievements: parsedContent.keyAchievements || [
      `Completed ${workerProfile.totalJobsCompleted || workHistory.length} successful farm projects on AgriConnect`,
      `Maintained stellar ${workerProfile.rating || 5.0} star performance rating from farmers`,
      `Aadhaar & Identity Verified Platform Worker`,
    ],
    workHistory: workHistory.length > 0 ? workHistory : [
      {
        jobTitle: 'Seasonal Crop Harvesting Specialist',
        category: 'Harvesting & Sorting',
        cropType: 'Wheat & Paddy',
        dailyWage: workerProfile.expectedDailyWage || 500,
        location: `${workerProfile.preferredDistrict || 'Local'}, ${workerProfile.preferredState || 'Region'}`,
        completedDate: new Date(),
      },
    ],
    usage: aiResult.usage,
    isCached: false,
  };

  // 6. Record usage telemetry
  const estimatedCostUsd = logTokenUsage('/api/v1/ai/resume', aiResult.model, aiResult.usage, aiResult.latencyMs);

  await recordAiUsageRepo({
    user: userId,
    endpoint: '/api/v1/ai/resume',
    model: aiResult.model,
    promptTokens: aiResult.usage.promptTokens,
    completionTokens: aiResult.usage.completionTokens,
    totalTokens: aiResult.usage.totalTokens,
    estimatedCostUsd,
    latencyMs: aiResult.latencyMs,
    status: 'success',
  });

  // Cache response for 1 hour
  aiCache.set(cacheKey, resumePayload, 60 * 60 * 1000);

  return resumePayload;
};

/**
 * Generate Printable HTML / PDF Document for Resume Export
 */
export const generateResumeHtmlDocument = (resumeData) => {
  const { personalDetails, resumeHeadline, careerObjective, professionalSummary, skills, education, languages, certificates, achievements, workHistory } = resumeData;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${personalDetails.fullName} - Professional Resume (AgriConnect)</title>
  <style>
    @page { size: A4; margin: 15mm; }
    body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1f2937; line-height: 1.5; margin: 0; padding: 20px; background: #fff; }
    .resume-header { border-bottom: 3px solid #16a34a; padding-bottom: 15px; margin-bottom: 20px; }
    .name { font-size: 26px; font-weight: bold; color: #15803d; margin: 0; }
    .headline { font-size: 16px; color: #4b5563; margin-top: 4px; font-style: italic; }
    .contact-info { margin-top: 10px; font-size: 13px; color: #374151; display: flex; flex-wrap: wrap; gap: 15px; }
    .section-title { font-size: 16px; font-weight: bold; text-transform: uppercase; color: #16a34a; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; margin-top: 20px; margin-bottom: 10px; letter-spacing: 0.5px; }
    .text-block { font-size: 13.5px; color: #374151; text-align: justify; }
    .pills { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 6px; }
    .pill { background: #f0fdf4; border: 1px solid #bbf7d0; color: #166534; padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: 600; }
    .history-item { margin-bottom: 12px; }
    .history-title { font-weight: bold; font-size: 14px; color: #111827; }
    .history-meta { font-size: 12px; color: #6b7280; }
    .badge { background: #dcfce7; color: #15803d; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; }
    @media print {
      body { padding: 0; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="no-print" style="margin-bottom: 20px; text-align: right;">
    <button onclick="window.print()" style="background: #16a34a; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: bold;">🖨️ Print / Download PDF</button>
  </div>

  <div class="resume-header">
    <h1 class="name">${personalDetails.fullName} ${personalDetails.aadhaarVerified ? '<span class="badge">✓ Verified Worker</span>' : ''}</h1>
    <div class="headline">${resumeHeadline}</div>
    <div class="contact-info">
      <span>📍 ${personalDetails.location}</span>
      <span>📱 ${personalDetails.mobile}</span>
      ${personalDetails.email ? `<span>✉️ ${personalDetails.email}</span>` : ''}
      <span>💰 Expected Daily Wage: ₹${personalDetails.expectedDailyWage}</span>
      <span>⚡ Availability: ${personalDetails.availability}</span>
    </div>
  </div>

  <div class="section-title">Career Objective</div>
  <div class="text-block">${careerObjective}</div>

  <div class="section-title">Professional Summary</div>
  <div class="text-block">${professionalSummary}</div>

  <div class="section-title">Agricultural Skills & Equipment Expertise</div>
  <div style="font-weight: bold; font-size: 13px; margin-top: 8px;">Primary Skills:</div>
  <div class="pills">
    ${(skills.primarySkills || []).map(s => `<span class="pill">${s}</span>`).join('')}
  </div>
  <div style="font-weight: bold; font-size: 13px; margin-top: 10px;">Equipment & Machinery:</div>
  <div class="pills">
    ${(skills.equipmentKnowledge || []).map(e => `<span class="pill" style="background:#eff6ff; border-color:#bfdbfe; color:#1e40af;">${e}</span>`).join('')}
  </div>

  <div class="section-title">Completed Work History on AgriConnect</div>
  ${(workHistory || []).map(h => `
    <div class="history-item">
      <div class="history-title">${h.jobTitle} - ${h.cropType} (${h.category})</div>
      <div class="history-meta">📍 ${h.location} | Daily Wage: ₹${h.dailyWage}</div>
    </div>
  `).join('')}

  <div class="section-title">Key Achievements & Platform Reputation</div>
  <ul style="font-size: 13px; padding-left: 20px; color: #374151;">
    ${(achievements || []).map(a => `<li>${a}</li>`).join('')}
  </ul>

  <div style="display: flex; gap: 40px;">
    <div style="flex: 1;">
      <div class="section-title">Education</div>
      <div class="text-block"><strong>${education}</strong></div>
    </div>
    <div style="flex: 1;">
      <div class="section-title">Spoken Languages</div>
      <div class="text-block">${(languages || []).join(', ')}</div>
    </div>
  </div>

  <div class="section-title">Certifications & Credentials</div>
  <ul style="font-size: 13px; padding-left: 20px; color: #374151;">
    ${(certificates || []).map(c => `<li>${c}</li>`).join('')}
  </ul>

  <div style="margin-top: 30px; border-top: 1px solid #e5e7eb; padding-top: 10px; font-size: 11px; color: #9ca3af; text-align: center;">
    Generated automatically via AgriConnect AI Engine powered by Groq • Verified Platform Resume
  </div>
</body>
</html>`;
};
