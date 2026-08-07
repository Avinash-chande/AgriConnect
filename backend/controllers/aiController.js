import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/appError.js';
import { HTTP_STATUS } from '../constants/index.js';
import {
  processChatMessage,
  processStreamChatMessage,
} from '../services/aiChatService.js';
import {
  getJobRecommendationsForWorker,
  getCropRecommendations,
  getWorkerRecommendationsForJob,
  getCropBasedWorkerRecommendations,
} from '../services/recommendationService.js';
import { analyzeAndImproveWorkerProfile } from '../services/aiProfileService.js';
import { generateJobDescriptionWithAi } from '../services/aiJobGeneratorService.js';
import { performSmartSearch } from '../services/aiSearchService.js';
import { predictWageWithAi } from '../services/aiWagePredictionService.js';
import { generateWorkerResume, generateResumeHtmlDocument } from '../services/aiResumeService.js';
import {
  generateInterviewQuestionsService,
  evaluateInterviewAnswersService,
  getUserInterviewHistoryService,
} from '../services/aiInterviewService.js';
import {
  processFarmingAssistantChat,
  processFarmingAssistantStreamChat,
} from '../services/aiFarmingAssistantService.js';
import {
  getFarmerAiAnalytics,
  getWorkerAiAnalytics,
} from '../services/aiAnalyticsService.js';
import {
  findUserAiConversationsRepo,
  countUserAiConversationsRepo,
  findAiConversationByIdRepo,
  findConversationMessagesRepo,
  deleteAiConversationRepo,
} from '../repositories/aiConversationRepository.js';
import { getUserAiUsageSummaryRepo } from '../repositories/aiUsageRepository.js';

/**
 * AI Controller - Controller Layer for AgriConnect AI Engine
 */

/**
 * POST /api/v1/ai/chat
 * Synchronous AI Chat completion endpoint
 */
export const sendChatMessage = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const result = await processChatMessage(userId, req.body);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'AI chat response generated successfully',
    data: result,
  });
});

/**
 * POST /api/v1/ai/chat/stream
 * Server-Sent Events (SSE) streaming chat endpoint
 */
export const streamChatMessage = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  await processStreamChatMessage(userId, req.body, res);
});

/**
 * GET /api/v1/ai/conversations
 * Fetch user's active AI conversation history list
 */
export const getConversations = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const skip = (page - 1) * limit;

  const conversations = await findUserAiConversationsRepo(userId, skip, limit);
  const total = await countUserAiConversationsRepo(userId);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: conversations,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  });
});

/**
 * GET /api/v1/ai/conversations/:id
 * Retrieve specific conversation session details and message history
 */
export const getConversationById = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { id } = req.params;

  const conversation = await findAiConversationByIdRepo(id, userId);
  if (!conversation) {
    throw new AppError('AI conversation session not found.', HTTP_STATUS.NOT_FOUND);
  }

  const messages = await findConversationMessagesRepo(id, 100);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: {
      conversation,
      messages,
    },
  });
});

/**
 * DELETE /api/v1/ai/conversations/:id
 * Delete an AI conversation session
 */
export const deleteConversation = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { id } = req.params;

  const conversation = await deleteAiConversationRepo(id, userId);
  if (!conversation) {
    throw new AppError('AI conversation session not found.', HTTP_STATUS.NOT_FOUND);
  }

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'AI conversation session deleted successfully',
  });
});

/**
 * POST /api/v1/ai/recommendations/jobs
 * Get AI Job Recommendations for worker candidate
 */
export const getJobRecommendations = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const result = await getJobRecommendationsForWorker(userId);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'AI job recommendations generated successfully',
    data: result,
  });
});

/**
 * POST /api/v1/ai/recommendations/crops
 * Get AI Crop & Seasonal Recommendations for farmers
 */
export const getCropRecommendationsController = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const result = await getCropRecommendations(userId, req.body);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'AI crop recommendations generated successfully',
    data: result,
  });
});

/**
 * POST /api/v1/ai/recommendations/workers
 * Get AI Worker Candidate Recommendations for a specific job posting
 */
export const getWorkerRecommendations = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const jobId = req.body?.jobId || req.query?.jobId;

  const result = await getWorkerRecommendationsForJob(userId, jobId);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'AI worker candidate recommendations generated successfully',
    data: result,
  });
});

/**
 * POST /api/v1/ai/profile/analyze
 * GET /api/v1/ai/profile/analyze
 * AI Worker Profile Improvement & Strength Analysis
 */
export const analyzeProfile = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const result = await analyzeAndImproveWorkerProfile(userId);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'AI worker profile analysis generated successfully',
    data: result,
  });
});

/**
 * POST /api/v1/ai/jobs/generate-description
 * Generate AI Job Description for Farmers
 */
export const generateJobDescription = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const result = await generateJobDescriptionWithAi(userId, req.body);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'AI job description generated successfully',
    data: result,
  });
});

/**
 * POST /api/v1/ai/search
 * GET /api/v1/ai/search
 * AI Natural Language Smart Search Engine
 */
export const executeSmartSearch = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const searchQuery = req.body?.query || req.query?.query || req.query?.q;

  const result = await performSmartSearch(userId, searchQuery);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'AI smart search executed successfully',
    data: result,
  });
});

/**
 * POST /api/v1/ai/predict-wage
 * GET /api/v1/ai/predict-wage
 * AI Agricultural Wage Prediction & Market Demand Analytics
 */
export const predictWage = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const inputData = { ...req.query, ...req.body };

  const result = await predictWageWithAi(userId, inputData);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'AI wage prediction generated successfully',
    data: result,
  });
});

/**
 * POST /api/v1/ai/recommendations/workers-by-crop
 * GET /api/v1/ai/recommendations/workers-by-crop
 * Crop-Based Worker Candidate Recommendation Engine
 */
export const getCropWorkerRecommendations = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const criteria = { ...req.query, ...req.body };

  const result = await getCropBasedWorkerRecommendations(userId, criteria);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Crop-based worker candidate recommendations generated successfully',
    data: result,
  });
});

/**
 * POST /api/v1/ai/resume
 * GET /api/v1/ai/resume
 * Generate AI Professional Worker Resume
 */
export const generateResume = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const targetWorkerProfileId = req.query?.workerProfileId || req.body?.workerProfileId || null;

  const result = await generateWorkerResume(userId, targetWorkerProfileId);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'AI professional resume generated successfully',
    data: result,
  });
});

/**
 * GET /api/v1/ai/resume/download
 * GET /api/v1/ai/resume/pdf
 * Export Printable HTML / PDF Worker Resume
 */
export const exportResumePdf = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const targetWorkerProfileId = req.query?.workerProfileId || null;

  const resumeData = await generateWorkerResume(userId, targetWorkerProfileId);
  const htmlDocument = generateResumeHtmlDocument(resumeData);

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(HTTP_STATUS.OK).send(htmlDocument);
});

/**
 * POST /api/v1/ai/interview/generate
 * Generate AI Farm Job Interview Questions & Model Answers
 */
export const generateInterviewQuestions = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const inputData = { ...req.query, ...req.body };

  const result = await generateInterviewQuestionsService(userId, inputData);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'AI interview questions generated successfully',
    data: result,
  });
});

/**
 * POST /api/v1/ai/interview/evaluate
 * Evaluate User Answers & Calculate Readiness Score
 */
export const evaluateInterviewAnswers = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { sessionId, userAnswers } = req.body;

  const result = await evaluateInterviewAnswersService(userId, sessionId, userAnswers);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'AI interview answers evaluated successfully',
    data: result,
  });
});

/**
 * GET /api/v1/ai/interview/history
 * Fetch User AI Interview Sessions & Score Trajectory
 */
export const getInterviewHistory = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;

  const result = await getUserInterviewHistoryService(userId, page, limit);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'User interview history retrieved successfully',
    data: result,
  });
});

/**
 * POST /api/v1/ai/farming-assistant
 * Conversational Farming AI Assistant (Sync Response)
 */
export const sendFarmingAssistantMessage = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const result = await processFarmingAssistantChat(userId, req.body);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Farming AI Assistant response generated successfully',
    data: result,
  });
});

/**
 * POST /api/v1/ai/farming-assistant/stream
 * Conversational Farming AI Assistant (Real-Time SSE Response Stream)
 */
export const streamFarmingAssistantMessage = async (req, res, next) => {
  try {
    const userId = req.user._id;
    await processFarmingAssistantStreamChat(userId, req.body, res);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/ai/analytics/farmer
 * AI Analytics & Market Insights for Farmers
 */
export const getFarmerAnalytics = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const result = await getFarmerAiAnalytics(userId);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Farmer AI analytics generated successfully',
    data: result,
  });
});

/**
 * GET /api/v1/ai/analytics/worker
 * AI Analytics & Career Insights for Workers
 */
export const getWorkerAnalytics = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const result = await getWorkerAiAnalytics(userId);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Worker AI analytics generated successfully',
    data: result,
  });
});

/**
 * GET /api/v1/ai/usage
 * Get Token Usage Telemetry & Summary for authenticated user
 */
export const getUsageStats = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const summary = await getUserAiUsageSummaryRepo(userId);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: summary,
  });
});
