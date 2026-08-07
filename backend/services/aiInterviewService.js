import { AiInterviewSession } from '../models/AiInterviewSession.js';
import { WorkerProfile } from '../models/WorkerProfile.js';
import { SYSTEM_PROMPTS, formatInterviewPrepPrompt, formatInterviewEvaluationPrompt } from '../prompts/systemPrompts.js';
import { createGroqCompletion } from './groqService.js';
import { aiCache } from '../utils/aiCacheUtil.js';
import { recordAiUsageRepo } from '../repositories/aiUsageRepository.js';
import { logTokenUsage } from '../utils/tokenTracker.js';
import { AppError } from '../utils/appError.js';
import { HTTP_STATUS } from '../constants/index.js';
import { logger } from '../utils/logger.js';

/**
 * Calculate readiness level text from numeric 0-100 score
 */
const calculateReadinessLevel = (score) => {
  if (score >= 85) return 'Highly Competent';
  if (score >= 70) return 'Job Ready';
  if (score >= 50) return 'Fair';
  return 'Needs Practice';
};

/**
 * AI Interview Generation Service
 * Generates 5 crop & role specific interview questions with model answers, difficulty levels, and tips.
 */
export const generateInterviewQuestionsService = async (userId, inputData) => {
  const { jobTitle, crop, experience, skills } = inputData;

  // 1. Fetch user worker profile defaults if parameters missing
  let targetExperience = experience;
  let targetSkills = Array.isArray(skills) ? skills : [skills].filter(Boolean);

  if (targetExperience === undefined || targetSkills.length === 0) {
    const workerProfile = await WorkerProfile.findOne({ owner: userId }).lean();
    if (workerProfile) {
      if (targetExperience === undefined) targetExperience = workerProfile.experience || 1;
      if (targetSkills.length === 0 && Array.isArray(workerProfile.skills)) targetSkills = workerProfile.skills;
    }
  }

  // 2. Build prompt and query Groq
  const userPrompt = formatInterviewPrepPrompt({
    jobTitle: jobTitle || 'Agricultural Worker',
    crop: crop || 'General Farm',
    experience: targetExperience || 1,
    skills: targetSkills,
  });

  const messages = [
    { role: 'system', content: SYSTEM_PROMPTS.INTERVIEW_PREP },
    { role: 'user', content: userPrompt },
  ];

  const aiResult = await createGroqCompletion(messages, {
    temperature: 0.3,
    responseFormat: { type: 'json_object' },
  });

  // 3. Parse JSON output
  let parsedContent = {};
  try {
    parsedContent = JSON.parse(aiResult.content);
  } catch (err) {
    logger.error(`Failed to parse AI Interview Prep JSON response: ${aiResult.content}`);
    parsedContent = {};
  }

  const rawQuestions = Array.isArray(parsedContent.questions) ? parsedContent.questions : [];

  const questions = rawQuestions.map((q, idx) => ({
    id: `Q${idx + 1}`,
    question: q.question || `Describe your experience with ${crop} farming.`,
    difficulty: q.difficulty || (idx < 2 ? 'Easy' : idx < 4 ? 'Medium' : 'Hard'),
    suggestedAnswer: q.suggestedAnswer || `Explain practical hands-on field steps for ${crop} care.`,
    userAnswer: '',
    feedback: '',
    score: 0,
  }));

  const tips = Array.isArray(parsedContent.tips) && parsedContent.tips.length > 0
    ? parsedContent.tips
    : [
        'Be clear about your hands-on experience with equipment and crop protection.',
        'Mention safety protocols you follow during chemical handling or harvest shifts.',
        'Highlight your availability and willingness to work during peak harvest hours.',
      ];

  const improvementSuggestions = Array.isArray(parsedContent.improvementSuggestions) && parsedContent.improvementSuggestions.length > 0
    ? parsedContent.improvementSuggestions
    : [
        'Practice articulating your crop management techniques step-by-step.',
        'Prepare specific examples of problem-solving during past farm jobs.',
      ];

  // 4. Save Interview Session to MongoDB
  const session = await AiInterviewSession.create({
    user: userId,
    jobTitle: jobTitle || 'Agricultural Specialist',
    crop: crop || 'Mixed Crops',
    experience: targetExperience || 1,
    skills: targetSkills,
    questions,
    overallScore: 0,
    readinessLevel: 'Needs Practice',
    tips,
    improvementSuggestions,
    status: 'Generated',
  });

  // 5. Record usage telemetry
  const estimatedCostUsd = logTokenUsage('/api/v1/ai/interview/generate', aiResult.model, aiResult.usage, aiResult.latencyMs);

  await recordAiUsageRepo({
    user: userId,
    endpoint: '/api/v1/ai/interview/generate',
    model: aiResult.model,
    promptTokens: aiResult.usage.promptTokens,
    completionTokens: aiResult.usage.completionTokens,
    totalTokens: aiResult.usage.totalTokens,
    estimatedCostUsd,
    latencyMs: aiResult.latencyMs,
    status: 'success',
  });

  return {
    sessionId: session._id,
    jobTitle: session.jobTitle,
    crop: session.crop,
    experience: session.experience,
    questions: session.questions,
    tips: session.tips,
    improvementSuggestions: session.improvementSuggestions,
    status: session.status,
    createdAt: session.createdAt,
    usage: aiResult.usage,
  };
};

/**
 * AI Interview Answer Evaluation Service
 * Evaluates candidate responses, scores accuracy (0-100), provides feedback, and updates readiness level.
 */
export const evaluateInterviewAnswersService = async (userId, sessionId, userAnswers = []) => {
  const session = await AiInterviewSession.findOne({ _id: sessionId, user: userId });
  if (!session) {
    throw new AppError('Interview session not found', HTTP_STATUS.NOT_FOUND);
  }

  // Map user answers into session questions
  userAnswers.forEach((ans) => {
    const qItem = session.questions.find((q) => q.id === ans.id || q._id?.toString() === ans.id);
    if (qItem) {
      qItem.userAnswer = ans.userAnswer || '';
    }
  });

  // Build prompt for Groq evaluator
  const evalPrompt = formatInterviewEvaluationPrompt(session);

  const messages = [
    { role: 'system', content: SYSTEM_PROMPTS.INTERVIEW_EVALUATOR },
    { role: 'user', content: evalPrompt },
  ];

  const aiResult = await createGroqCompletion(messages, {
    temperature: 0.2,
    responseFormat: { type: 'json_object' },
  });

  let parsedEval = {};
  try {
    parsedEval = JSON.parse(aiResult.content);
  } catch (err) {
    logger.error(`Failed to parse AI Interview Evaluation JSON: ${aiResult.content}`);
    parsedEval = {};
  }

  const evaluatedQuestions = Array.isArray(parsedEval.questionEvaluations) ? parsedEval.questionEvaluations : [];

  let totalScoreSum = 0;
  session.questions.forEach((q) => {
    const evalItem = evaluatedQuestions.find((e) => e.id === q.id);
    if (evalItem) {
      q.score = typeof evalItem.score === 'number' ? Math.min(Math.max(evalItem.score, 0), 100) : 75;
      q.feedback = evalItem.feedback || 'Good practical understanding demonstrated.';
    } else {
      q.score = q.userAnswer ? 70 : 0;
      q.feedback = q.userAnswer ? 'Response recorded.' : 'No answer provided.';
    }
    totalScoreSum += q.score;
  });

  const overallScore = Math.round(totalScoreSum / (session.questions.length || 1));
  session.overallScore = overallScore;
  session.readinessLevel = calculateReadinessLevel(overallScore);
  session.status = 'Completed';

  if (Array.isArray(parsedEval.improvementSuggestions) && parsedEval.improvementSuggestions.length > 0) {
    session.improvementSuggestions = parsedEval.improvementSuggestions;
  }

  await session.save();

  // Record usage telemetry
  const estimatedCostUsd = logTokenUsage('/api/v1/ai/interview/evaluate', aiResult.model, aiResult.usage, aiResult.latencyMs);

  await recordAiUsageRepo({
    user: userId,
    endpoint: '/api/v1/ai/interview/evaluate',
    model: aiResult.model,
    promptTokens: aiResult.usage.promptTokens,
    completionTokens: aiResult.usage.completionTokens,
    totalTokens: aiResult.usage.totalTokens,
    estimatedCostUsd,
    latencyMs: aiResult.latencyMs,
    status: 'success',
  });

  return {
    sessionId: session._id,
    jobTitle: session.jobTitle,
    crop: session.crop,
    overallScore: session.overallScore,
    readinessLevel: session.readinessLevel,
    evaluatedQuestions: session.questions,
    tips: session.tips,
    improvementSuggestions: session.improvementSuggestions,
    status: session.status,
    usage: aiResult.usage,
  };
};

/**
 * Fetch Past User Interview Sessions & Readiness Scores History
 */
export const getUserInterviewHistoryService = async (userId, page = 1, limit = 10) => {
  const skip = (page - 1) * limit;

  const [sessions, total] = await Promise.all([
    AiInterviewSession.find({ user: userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    AiInterviewSession.countDocuments({ user: userId }),
  ]);

  return {
    sessions,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
};
