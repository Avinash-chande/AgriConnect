import { AppError } from './appError.js';

/**
 * Specialized Custom Error Class for AI Service Operations
 */
export class AIError extends AppError {
  constructor(message, statusCode = 500, code = 'AI_SERVICE_ERROR', details = null) {
    super(sanitizeErrorMessage(message), statusCode);
    this.name = 'AIError';
    this.code = code;
    this.details = details;
  }
}

/**
 * Sanitizes error messages to prevent leaking API keys or internal paths
 */
function sanitizeErrorMessage(rawMessage) {
  if (!rawMessage || typeof rawMessage !== 'string') {
    return 'An unexpected error occurred in the AI processing engine.';
  }
  // Mask API key patterns
  let clean = rawMessage.replace(/sk-[a-zA-Z0-9_-]{20,}/g, 'sk-***MASKED***');
  clean = clean.replace(/Bearer\s+[a-zA-Z0-9._-]+/gi, 'Bearer ***MASKED***');
  return clean;
}

/**
 * Map HTTP status code from OpenAI API to user-friendly AI error
 */
export const handleOpenAIError = (status, responseData) => {
  const message = responseData?.error?.message || responseData?.message || 'OpenAI API request failed';
  const type = responseData?.error?.type || 'api_error';

  switch (status) {
    case 401:
      return new AIError('Invalid or unauthenticated AI API credentials.', 401, 'AI_AUTH_ERROR', { type });
    case 429:
      return new AIError('AI service rate limit exceeded or quota exhausted. Please try again shortly.', 429, 'AI_RATE_LIMIT_EXCEEDED', { type });
    case 400:
      if (message.includes('context_length_exceeded') || message.includes('maximum context length')) {
        return new AIError('Input text exceeds maximum AI token context window limit.', 400, 'AI_CONTEXT_LENGTH_EXCEEDED', { type });
      }
      return new AIError(`Invalid AI request: ${message}`, 400, 'AI_BAD_REQUEST', { type });
    case 404:
      return new AIError('Requested AI model or endpoint not found.', 404, 'AI_MODEL_NOT_FOUND', { type });
    case 500:
    case 502:
    case 503:
    case 504:
      return new AIError('Upstream AI service is temporarily unavailable. Graceful fallback active.', 503, 'AI_UPSTREAM_UNAVAILABLE', { type });
    default:
      return new AIError(message, status || 500, 'AI_PROVIDER_ERROR', { type });
  }
};
