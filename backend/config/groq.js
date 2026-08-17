import OpenAI from 'openai';
import dotenv from 'dotenv';
import { logger } from '../utils/logger.js';

dotenv.config();

/**
 * Groq API Configuration & OpenAI SDK Client Initialization
 * Base URL: https://api.groq.com/openai/v1
 */

const GROQ_BASE_URL = process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1';
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const GROQ_MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';

if (!GROQ_API_KEY && process.env.NODE_ENV === 'production') {
  logger.error('❌ GROQ_API_KEY environment variable is missing in production environment.');
}

/**
 * Singleton OpenAI client instance pointed at Groq base URL
 */
export const groqClient = new OpenAI({
  apiKey: GROQ_API_KEY || 'unconfigured_groq_api_key',
  baseURL: GROQ_BASE_URL,
  maxRetries: 0,
});

export const groqConfig = {
  baseUrl: GROQ_BASE_URL,
  defaultModel: GROQ_MODEL,
  apiKey: GROQ_API_KEY,
  maxTokensDefault: 2048,
  temperatureDefault: 0.7,
};
