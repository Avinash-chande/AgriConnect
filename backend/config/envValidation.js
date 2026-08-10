/**
 * Centralized Environment Variable Validation Module for AgriConnect Backend
 * Enforces strict environment separation and security checks on startup.
 */

import { logger } from '../utils/logger.js';

const INSECURE_PLACEHOLDERS = [
  'your_',
  'placeholder',
  'change_me',
  'replace_',
  'example',
  'dummy',
  'fallback_',
  'xxx',
];

/**
 * Checks if a config value matches known insecure placeholder strings
 */
const isPlaceholder = (val) => {
  if (!val || typeof val !== 'string') return true;
  const lower = val.trim().toLowerCase();
  return INSECURE_PLACEHOLDERS.some((pattern) => lower.includes(pattern));
};

/**
 * Validates process environment configuration based on NODE_ENV
 * @returns {Object} Validated environment summary object
 */
export const validateEnvironment = () => {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const errors = [];
  const warnings = [];

  // 1. Mandatory Environment Variables across ALL environments
  if (!process.env.MONGODB_URI && nodeEnv !== 'test') {
    errors.push('MONGODB_URI is required.');
  }

  const accessSecret = process.env.JWT_ACCESS_SECRET;
  const refreshSecret = process.env.JWT_REFRESH_SECRET;
  const cookieSecret = process.env.COOKIE_SECRET;

  if (!accessSecret) errors.push('JWT_ACCESS_SECRET is missing.');
  if (!refreshSecret) errors.push('JWT_REFRESH_SECRET is missing.');
  if (!cookieSecret) errors.push('COOKIE_SECRET is missing.');

  // 2. Strict Production Rules
  if (nodeEnv === 'production') {
    if (isPlaceholder(accessSecret) || (accessSecret && accessSecret.length < 32)) {
      errors.push('[PROD] JWT_ACCESS_SECRET must be at least 32 characters and cannot be a placeholder.');
    }

    if (isPlaceholder(refreshSecret) || (refreshSecret && refreshSecret.length < 32)) {
      errors.push('[PROD] JWT_REFRESH_SECRET must be at least 32 characters and cannot be a placeholder.');
    }

    if (isPlaceholder(cookieSecret) || (cookieSecret && cookieSecret.length < 32)) {
      errors.push('[PROD] COOKIE_SECRET must be at least 32 characters and cannot be a placeholder.');
    }

    if (!process.env.CORS_ORIGIN || isPlaceholder(process.env.CORS_ORIGIN)) {
      errors.push('[PROD] CORS_ORIGIN must be explicitly configured with a production domain URL.');
    }

    // Cloudinary Checks
    if (!process.env.CLOUDINARY_CLOUD_NAME || isPlaceholder(process.env.CLOUDINARY_CLOUD_NAME)) {
      errors.push('[PROD] CLOUDINARY_CLOUD_NAME is required in production.');
    }
    if (!process.env.CLOUDINARY_API_KEY || isPlaceholder(process.env.CLOUDINARY_API_KEY)) {
      errors.push('[PROD] CLOUDINARY_API_KEY is required in production.');
    }
    if (!process.env.CLOUDINARY_API_SECRET || isPlaceholder(process.env.CLOUDINARY_API_SECRET)) {
      errors.push('[PROD] CLOUDINARY_API_SECRET is required in production.');
    }

    // Razorpay Checks
    if (!process.env.RAZORPAY_KEY_ID || isPlaceholder(process.env.RAZORPAY_KEY_ID)) {
      errors.push('[PROD] RAZORPAY_KEY_ID is required in production.');
    }
    if (!process.env.RAZORPAY_KEY_SECRET || isPlaceholder(process.env.RAZORPAY_KEY_SECRET)) {
      errors.push('[PROD] RAZORPAY_KEY_SECRET is required in production.');
    }
    if (!process.env.RAZORPAY_WEBHOOK_SECRET || isPlaceholder(process.env.RAZORPAY_WEBHOOK_SECRET)) {
      errors.push('[PROD] RAZORPAY_WEBHOOK_SECRET is required in production.');
    }

    // SMTP Mail Checks
    if (!process.env.SMTP_HOST || isPlaceholder(process.env.SMTP_HOST)) {
      errors.push('[PROD] SMTP_HOST is required for production email notifications.');
    }
  } else if (nodeEnv === 'development') {
    if (isPlaceholder(accessSecret)) {
      warnings.push('[DEV] JWT_ACCESS_SECRET is using a placeholder key.');
    }
    if (isPlaceholder(refreshSecret)) {
      warnings.push('[DEV] JWT_REFRESH_SECRET is using a placeholder key.');
    }
    if (!process.env.GROQ_API_KEY && !process.env.OPENAI_API_KEY) {
      warnings.push('[DEV] Neither GROQ_API_KEY nor OPENAI_API_KEY is set. AI features will run in mock mode.');
    }
  }

  // 3. Log or Throw
  if (warnings.length > 0) {
    warnings.forEach((warn) => logger.warn(`⚠️ ${warn}`));
  }

  if (errors.length > 0) {
    const errorMsg = `❌ Environment Validation Fatal Errors:\n  - ${errors.join('\n  - ')}`;
    logger.error(errorMsg);
    if (nodeEnv === 'production') {
      throw new Error(errorMsg);
    }
  } else {
    logger.info(`✅ Environment Configuration Validated Successfully [MODE: ${nodeEnv}]`);
  }

  return {
    nodeEnv,
    isValid: errors.length === 0,
    errors,
    warnings,
  };
};
