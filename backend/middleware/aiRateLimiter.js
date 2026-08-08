import rateLimit from 'express-rate-limit';
import { HTTP_STATUS } from '../constants/index.js';

/**
 * Dedicated Rate Limiter for AI Chat Endpoints
 * 30 requests per minute per IP/User
 */
export const aiChatRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute window
  max: 30, // 30 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'AI chat request limit exceeded. Please wait a minute before sending more messages.',
    statusCode: HTTP_STATUS.TOO_MANY_REQUESTS,
  },
});

/**
 * Dedicated Rate Limiter for AI Recommendation Endpoints
 * 15 requests per minute per IP/User
 */
export const aiRecommendationRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute window
  max: 15, // 15 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'AI recommendation request limit exceeded. Please wait a moment.',
    statusCode: HTTP_STATUS.TOO_MANY_REQUESTS,
  },
});
