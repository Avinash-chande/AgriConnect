import rateLimit from 'express-rate-limit';
import { HTTP_STATUS } from '../constants/index.js';

/**
 * Dedicated Rate Limiter for AI Chat Endpoints
 * Free Users: 10 requests per minute
 * Premium Users: 100 requests per minute
 */
export const aiChatRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: (req) => (req.user?.isPremium ? 100 : 10),
  keyGenerator: (req) => req.user?._id?.toString() || req.ip,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    const isPremium = req.user?.isPremium;
    return res.status(429).json({
      success: false,
      code: isPremium ? 'RATE_LIMIT_EXCEEDED' : 'FREE_TIER_LIMIT_REACHED',
      message: isPremium
        ? 'Premium AI request limit exceeded (100/min). Please wait a minute.'
        : 'Free tier AI limit reached (10 queries/min). Upgrade to Premium for 100 queries/min.',
      isPremium: !!isPremium,
      statusCode: HTTP_STATUS.TOO_MANY_REQUESTS,
    });
  },
});

/**
 * Dedicated Rate Limiter for AI Recommendation Endpoints
 * Free Users: 5 requests per minute
 * Premium Users: 50 requests per minute
 */
export const aiRecommendationRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: (req) => (req.user?.isPremium ? 50 : 5),
  keyGenerator: (req) => req.user?._id?.toString() || req.ip,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    const isPremium = req.user?.isPremium;
    return res.status(429).json({
      success: false,
      code: isPremium ? 'RATE_LIMIT_EXCEEDED' : 'FREE_TIER_LIMIT_REACHED',
      message: isPremium
        ? 'Premium AI recommendation limit exceeded (50/min). Please wait a moment.'
        : 'Free tier AI recommendation limit reached (5 queries/min). Upgrade to Premium for higher limits.',
      isPremium: !!isPremium,
      statusCode: HTTP_STATUS.TOO_MANY_REQUESTS,
    });
  },
});
