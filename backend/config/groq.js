import OpenAI from 'openai';
import dotenv from 'dotenv';
import { logger } from '../utils/logger.js';

dotenv.config();

/**
 * Groq API Configuration & OpenAI SDK Client Initialization
 * Standard OpenAI SDK client configured for Groq API endpoint:
 * Base URL: https://api.groq.com/openai/v1
 */

const GROQ_BASE_URL = process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1';
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

if (!GROQ_API_KEY) {
  logger.warn('⚠️ GROQ_API_KEY environment variable is not set. AI features will fail until configured.');
}

/**
 * Singleton OpenAI client instance pointed at Groq base URL
 */
export const groqClient = new OpenAI({
  apiKey: GROQ_API_KEY || 'placeholder-key-for-dev',
  baseURL: GROQ_BASE_URL,
  maxRetries: 0, // Handled dynamically by custom exponential backoff retry utility
});

export const groqConfig = {
  baseUrl: GROQ_BASE_URL,
  defaultModel: GROQ_MODEL,
  apiKey: GROQ_API_KEY,
  maxTokensDefault: 2048,
  temperatureDefault: 0.7,
};
