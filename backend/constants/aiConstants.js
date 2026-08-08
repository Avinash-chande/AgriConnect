/**
 * Constants and Enums for AgriConnect AI Infrastructure
 */

export const AI_CATEGORIES = Object.freeze({
  AGRONOMY: 'agronomy',
  JOB_GENERATOR: 'job_generator',
  PROFILE_SUMMARY: 'profile_summary',
  TRANSLATION: 'translation',
  GOVT_SCHEMES: 'govt_schemes',
  GENERAL_ASSISTANT: 'general_assistant',
});

export const AI_ROLES = Object.freeze({
  SYSTEM: 'system',
  USER: 'user',
  ASSISTANT: 'assistant',
  FUNCTION: 'function',
});

export const DEFAULT_AI_MODELS = Object.freeze({
  PRIMARY: 'gpt-4o-mini',
  FAST: 'gpt-3.5-turbo',
  ADVANCED: 'gpt-4o',
});

export const DEFAULT_AI_LIMITS = Object.freeze({
  MAX_TOKENS: 1000,
  TEMPERATURE: 0.7,
  TIMEOUT_MS: 30000,
  CONTEXT_WINDOW_TOKENS: 4096,
  MAX_RETRIES: 3,
  INITIAL_RETRY_DELAY_MS: 1000,
  CACHE_TTL_SECONDS: 3600, // 1 hour
});

export const ESTIMATED_TOKEN_PRICING = Object.freeze({
  'gpt-4o-mini': { promptPer1k: 0.00015, completionPer1k: 0.0006 },
  'gpt-3.5-turbo': { promptPer1k: 0.0015, completionPer1k: 0.002 },
  'gpt-4o': { promptPer1k: 0.005, completionPer1k: 0.015 },
  default: { promptPer1k: 0.0005, completionPer1k: 0.0015 },
});

export const REGIONAL_LANGUAGES = Object.freeze([
  'English',
  'Hindi',
  'Punjabi',
  'Telugu',
  'Tamil',
  'Marathi',
  'Kannada',
  'Gujarati',
  'Bengali',
  'Malayalam',
]);
