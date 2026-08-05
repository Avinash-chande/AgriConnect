import { AppError } from '../utils/appError.js';
import { HTTP_STATUS } from '../constants/index.js';

// In-Memory Rate Limiter Store: userId -> { count, resetTime }
const userRateLimits = new Map();

// In-Memory Anti-Spam Duplicate Store: userId -> { lastText, timestamp }
const userLastMessage = new Map();

// Rate Limit Constants: Max 30 messages per 60 seconds
const RATE_LIMIT_MAX = 30;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const DUPLICATE_WINDOW_MS = 3 * 1000; // 3 seconds

/**
 * Middleware: Chat Message Rate Limiter
 */
export const chatRateLimiter = (req, res, next) => {
  const userId = (req.user?._id || req.user?.id || req.ip).toString();
  const now = Date.now();

  const record = userRateLimits.get(userId) || { count: 0, resetTime: now + RATE_LIMIT_WINDOW_MS };

  if (now > record.resetTime) {
    record.count = 1;
    record.resetTime = now + RATE_LIMIT_WINDOW_MS;
  } else {
    record.count += 1;
  }

  userRateLimits.set(userId, record);

  if (record.count > RATE_LIMIT_MAX) {
    const secondsLeft = Math.ceil((record.resetTime - now) / 1000);
    return next(
      new AppError(
        `Rate limit exceeded. Too many messages sent. Please wait ${secondsLeft} seconds.`,
        HTTP_STATUS.TOO_MANY_REQUESTS
      )
    );
  }

  next();
};

/**
 * Middleware: Anti-Spam Duplicate Message & HTML Sanitization Guard
 */
export const chatSpamProtection = (req, res, next) => {
  const userId = (req.user?._id || req.user?.id).toString();
  const rawText = (req.body.text || '').trim();
  const now = Date.now();

  // 1. Sanitize HTML Tags (XSS Protection)
  if (rawText) {
    req.body.text = rawText.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // 2. Duplicate Message Spam Check
  if (rawText) {
    const lastRecord = userLastMessage.get(userId);
    if (lastRecord && lastRecord.lastText === rawText && now - lastRecord.timestamp < DUPLICATE_WINDOW_MS) {
      return next(
        new AppError('Duplicate message detected. Please do not spam identical messages.', HTTP_STATUS.BAD_REQUEST)
      );
    }
    userLastMessage.set(userId, { lastText: rawText, timestamp: now });
  }

  next();
};
