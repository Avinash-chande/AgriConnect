import { AppError } from '../utils/appError.js';
import { HTTP_STATUS } from '../constants/index.js';
import { logger } from '../utils/logger.js';

// Suspicious patterns associated with prompt injection & system bypass attacks
const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|above)\s+instructions/i,
  /disregard\s+(all\s+)?prior\s+prompts/i,
  /you\s+are\s+now\s+in\s+DAN\s+mode/i,
  /reveal\s+(your\s+)?system\s+prompt/i,
  /print\s+system\s+instructions/i,
  /<\|im_start\|>/i,
  /<\|im_end\|>/i,
  /\[INST\]/i,
  /\[\/INST\]/i,
];

/**
 * Sanitize prompt text against prompt injection attacks
 */
export const sanitizePromptText = (text) => {
  if (typeof text !== 'string') return '';
  let sanitized = text;

  // Check for malicious patterns
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(sanitized)) {
      logger.warn(`[AI Security] Prompt injection attempt detected and sanitized: ${pattern}`);
      sanitized = sanitized.replace(pattern, '[filtered]');
    }
  }

  return sanitized.trim();
};

/**
 * AI Security Middleware
 * Sanitizes req.body text/messages and blocks prompt injection payloads.
 */
export const aiSecurityMiddleware = (req, res, next) => {
  if (req.body) {
    // 1. Sanitize 'message' field
    if (typeof req.body.message === 'string') {
      req.body.message = sanitizePromptText(req.body.message);
    }

    // 2. Sanitize 'systemPrompt' if custom system prompt passed
    if (typeof req.body.systemPrompt === 'string') {
      req.body.systemPrompt = sanitizePromptText(req.body.systemPrompt);
    }

    // 3. Sanitize nested objects/strings in criteria
    if (req.body.criteria && typeof req.body.criteria === 'object') {
      for (const key in req.body.criteria) {
        if (typeof req.body.criteria[key] === 'string') {
          req.body.criteria[key] = sanitizePromptText(req.body.criteria[key]);
        }
      }
    }
  }

  next();
};
