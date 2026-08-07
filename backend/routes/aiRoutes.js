import express from 'express';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { aiSecurityMiddleware } from '../middleware/aiSecurityMiddleware.js';
import { aiChatRateLimiter, aiRecommendationRateLimiter } from '../middleware/aiRateLimiter.js';
import {
  validateChatInput,
  validateCropRecommendationInput,
  validateWorkerRecommendationInput,
  validateConversationIdParam,
  validateJobDescriptionGenerationInput,
  validateSmartSearchInput,
  validateWagePredictionInput,
  validateCropWorkerRecommendationInput,
  validateInterviewGenerationInput,
  validateInterviewEvaluationInput,
} from '../validators/aiValidator.js';
import {
  sendChatMessage,
  streamChatMessage,
  getConversations,
  getConversationById,
  deleteConversation,
  getJobRecommendations,
  getCropRecommendationsController,
  getWorkerRecommendations,
  getCropWorkerRecommendations,
  analyzeProfile,
  generateJobDescription,
  executeSmartSearch,
  predictWage,
  generateResume,
  exportResumePdf,
  generateInterviewQuestions,
  evaluateInterviewAnswers,
  getInterviewHistory,
  sendFarmingAssistantMessage,
  streamFarmingAssistantMessage,
  getFarmerAnalytics,
  getWorkerAnalytics,
  getUsageStats,
} from '../controllers/aiController.js';

const router = express.Router();

// All AI endpoints require authentication
router.use(protect);

/**
 * AI Chat & Streaming Endpoints
 */
router.post('/chat', aiChatRateLimiter, aiSecurityMiddleware, validateChatInput, sendChatMessage);
router.post('/chat/stream', aiChatRateLimiter, aiSecurityMiddleware, validateChatInput, streamChatMessage);
router.post('/farming-assistant', aiChatRateLimiter, aiSecurityMiddleware, validateChatInput, sendFarmingAssistantMessage);
router.post('/farming-assistant/stream', aiChatRateLimiter, aiSecurityMiddleware, validateChatInput, streamFarmingAssistantMessage);

/**
 * AI Conversation Session Management
 */
router.get('/conversations', getConversations);
router.get('/conversations/:id', validateConversationIdParam, getConversationById);
router.delete('/conversations/:id', validateConversationIdParam, deleteConversation);

/**
 * AI Recommendation Engine Endpoints
 */
router.get('/recommendations/jobs', authorize('Worker', 'Admin'), aiRecommendationRateLimiter, getJobRecommendations);
router.post('/recommendations/jobs', authorize('Worker', 'Admin'), aiRecommendationRateLimiter, getJobRecommendations);
router.post('/recommendations/crops', aiRecommendationRateLimiter, aiSecurityMiddleware, validateCropRecommendationInput, getCropRecommendationsController);
router.get('/recommendations/workers', authorize('Farmer', 'Admin'), aiRecommendationRateLimiter, validateWorkerRecommendationInput, getWorkerRecommendations);
router.post('/recommendations/workers', authorize('Farmer', 'Admin'), aiRecommendationRateLimiter, validateWorkerRecommendationInput, getWorkerRecommendations);
router.get('/recommendations/workers-by-crop', authorize('Farmer', 'Admin'), aiRecommendationRateLimiter, validateCropWorkerRecommendationInput, getCropWorkerRecommendations);
router.post('/recommendations/workers-by-crop', authorize('Farmer', 'Admin'), aiRecommendationRateLimiter, validateCropWorkerRecommendationInput, getCropWorkerRecommendations);

/**
 * AI Profile Improvement & Analysis Endpoints
 */
router.get('/profile/analyze', authorize('Worker', 'Admin'), aiRecommendationRateLimiter, analyzeProfile);
router.post('/profile/analyze', authorize('Worker', 'Admin'), aiRecommendationRateLimiter, analyzeProfile);

/**
 * AI Job Description Generation Endpoint
 */
router.post(
  '/jobs/generate-description',
  authorize('Farmer', 'Admin'),
  aiRecommendationRateLimiter,
  aiSecurityMiddleware,
  validateJobDescriptionGenerationInput,
  generateJobDescription
);

/**
 * AI Natural Language Smart Search Endpoints
 */
router.get('/search', aiRecommendationRateLimiter, aiSecurityMiddleware, validateSmartSearchInput, executeSmartSearch);
router.post('/search', aiRecommendationRateLimiter, aiSecurityMiddleware, validateSmartSearchInput, executeSmartSearch);

/**
 * AI Wage Prediction & Econometrics Endpoint
 */
router.get('/predict-wage', aiRecommendationRateLimiter, aiSecurityMiddleware, validateWagePredictionInput, predictWage);
router.post('/predict-wage', aiRecommendationRateLimiter, aiSecurityMiddleware, validateWagePredictionInput, predictWage);

/**
 * AI Resume Generator & PDF Export Endpoints
 */
router.get('/resume', authorize('Worker', 'Admin'), aiRecommendationRateLimiter, generateResume);
router.post('/resume', authorize('Worker', 'Admin'), aiRecommendationRateLimiter, generateResume);
router.get('/resume/download', authorize('Worker', 'Admin'), exportResumePdf);
router.get('/resume/pdf', authorize('Worker', 'Admin'), exportResumePdf);

/**
 * AI Interview Preparation & Readiness Evaluation Endpoints
 */
router.post('/interview/generate', authorize('Worker', 'Admin'), aiRecommendationRateLimiter, validateInterviewGenerationInput, generateInterviewQuestions);
router.post('/interview/evaluate', authorize('Worker', 'Admin'), aiRecommendationRateLimiter, validateInterviewEvaluationInput, evaluateInterviewAnswers);
router.get('/interview/history', authorize('Worker', 'Admin'), getInterviewHistory);

/**
 * AI Analytics & Market/Career Insights Endpoints
 */
router.get('/analytics/farmer', authorize('Farmer', 'Admin'), aiRecommendationRateLimiter, getFarmerAnalytics);
router.get('/analytics/worker', authorize('Worker', 'Admin'), aiRecommendationRateLimiter, getWorkerAnalytics);

/**
 * AI Usage & Telemetry Stats
 */
router.get('/usage', getUsageStats);

export default router;
