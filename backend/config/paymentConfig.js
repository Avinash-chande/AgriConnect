/**
 * Centralized Phase 9 Payment & Subscription Environment Configuration Module
 * Validates Razorpay credentials, webhook secret, environment modes, currencies, and plan IDs at startup.
 * Enforces strict environment separation (development, test, production) and prevents secret leaks in logs.
 */

import { logger } from '../utils/logger.js';

const VALID_ENVIRONMENTS = ['development', 'test', 'production', 'sandbox', 'live'];
const PLACEHOLDER_PATTERNS = ['your_', 'placeholder', 'change_me', 'example', 'dummy', 'xxxx'];

/**
 * Checks if a string contains known insecure placeholder text
 */
const isPlaceholderValue = (val) => {
  if (!val || typeof val !== 'string') return true;
  const lower = val.toLowerCase();
  return PLACEHOLDER_PATTERNS.some((p) => lower.includes(p));
};

/**
 * Validates 3-letter currency code (ISO 4217 format)
 */
const isValidCurrencyCode = (currency) => {
  return typeof currency === 'string' && /^[A-Z]{3}$/i.test(currency);
};

/**
 * Parses and validates environment configuration for Phase 9 Razorpay & Payments.
 * @param {Object} envSource Optional custom environment object (defaults to process.env)
 * @returns {Object} Validated configuration object
 */
export const getValidatedPaymentConfig = (envSource = process.env) => {
  const nodeEnv = envSource.NODE_ENV || 'development';

  // 1. Resolve raw variables with environment-aware safe defaults
  const rawKeyId = envSource.RAZORPAY_KEY_ID;
  const rawKeySecret = envSource.RAZORPAY_KEY_SECRET;
  const rawWebhookSecret = envSource.RAZORPAY_WEBHOOK_SECRET;
  const rawRazorpayEnv = envSource.RAZORPAY_ENVIRONMENT;
  const rawCurrency = envSource.PAYMENT_CURRENCY;
  const rawMonthlyPlanId = envSource.PREMIUM_MONTHLY_PLAN_ID;
  const rawYearlyPlanId = envSource.PREMIUM_YEARLY_PLAN_ID;

  // Safe environment defaults
  const razorpayKeyId = rawKeyId || 'rzp_test_agriconnect_key_2026';
  const razorpayKeySecret = rawKeySecret || 'agriconnect_rzp_secret_key_2026_dev';
  const razorpayWebhookSecret = rawWebhookSecret || 'agriconnect_webhook_secret_2026';
  const razorpayEnvironment = (rawRazorpayEnv || (nodeEnv === 'test' ? 'test' : nodeEnv)).toLowerCase();
  const paymentCurrency = (rawCurrency || 'INR').toUpperCase();
  const premiumMonthlyPlanId = rawMonthlyPlanId || 'farmer_pro_monthly';
  const premiumYearlyPlanId = rawYearlyPlanId || 'farmer_pro_yearly';

  const errors = [];

  // 2. Format and type validations
  if (!VALID_ENVIRONMENTS.includes(razorpayEnvironment)) {
    errors.push(`Invalid RAZORPAY_ENVIRONMENT "${razorpayEnvironment}". Must be one of: ${VALID_ENVIRONMENTS.join(', ')}`);
  }

  if (!isValidCurrencyCode(paymentCurrency)) {
    errors.push(`Invalid PAYMENT_CURRENCY "${paymentCurrency}". Must be a 3-letter uppercase ISO currency code (e.g. INR).`);
  }

  if (!premiumMonthlyPlanId || typeof premiumMonthlyPlanId !== 'string') {
    errors.push(`Invalid PREMIUM_MONTHLY_PLAN_ID. Must be a valid non-empty string.`);
  }

  if (!premiumYearlyPlanId || typeof premiumYearlyPlanId !== 'string') {
    errors.push(`Invalid PREMIUM_YEARLY_PLAN_ID. Must be a valid non-empty string.`);
  }

  // 3. Strict Production Mode Checks
  if (nodeEnv === 'production') {
    if (!rawKeyId || isPlaceholderValue(rawKeyId)) {
      errors.push(`[PROD] RAZORPAY_KEY_ID is missing or contains placeholder value in production.`);
    }

    if (!rawKeySecret || isPlaceholderValue(rawKeySecret) || rawKeySecret.length < 16) {
      errors.push(`[PROD] RAZORPAY_KEY_SECRET is missing, placeholder, or insecure in production.`);
    }

    if (!rawWebhookSecret || isPlaceholderValue(rawWebhookSecret) || rawWebhookSecret.length < 12) {
      errors.push(`[PROD] RAZORPAY_WEBHOOK_SECRET is missing, placeholder, or insecure in production.`);
    }

    if (!['production', 'live'].includes(razorpayEnvironment)) {
      errors.push(`[PROD] RAZORPAY_ENVIRONMENT must be set to "production" or "live" when NODE_ENV is production.`);
    }

    if (!rawMonthlyPlanId || isPlaceholderValue(rawMonthlyPlanId)) {
      errors.push(`[PROD] PREMIUM_MONTHLY_PLAN_ID must be explicitly set in production.`);
    }

    if (!rawYearlyPlanId || isPlaceholderValue(rawYearlyPlanId)) {
      errors.push(`[PROD] PREMIUM_YEARLY_PLAN_ID must be explicitly set in production.`);
    }
  }

  // 4. Handle Errors or Log Warnings
  if (errors.length > 0) {
    const errorLogMsg = `❌ [PaymentConfig] Startup Configuration Errors:\n - ${errors.join('\n - ')}`;
    logger.error(errorLogMsg);
    if (nodeEnv === 'production') {
      throw new Error(`Production Environment Validation Failed:\n${errors.join('\n')}`);
    }
  } else if (nodeEnv === 'development') {
    if (isPlaceholderValue(razorpayKeyId) || isPlaceholderValue(razorpayKeySecret)) {
      logger.warn(`⚠️ [PaymentConfig] Running in development with fallback/test Razorpay keys.`);
    }
  }

  return {
    RAZORPAY_KEY_ID: razorpayKeyId,
    RAZORPAY_KEY_SECRET: razorpayKeySecret,
    RAZORPAY_WEBHOOK_SECRET: razorpayWebhookSecret,
    RAZORPAY_ENVIRONMENT: razorpayEnvironment,
    PAYMENT_CURRENCY: paymentCurrency,
    PREMIUM_MONTHLY_PLAN_ID: premiumMonthlyPlanId,
    PREMIUM_YEARLY_PLAN_ID: premiumYearlyPlanId,

    /**
     * Returns a copy of the configuration with secrets redacted for safe logging/telemetry
     */
    getSanitizedConfig() {
      return {
        RAZORPAY_KEY_ID: this.RAZORPAY_KEY_ID,
        RAZORPAY_KEY_SECRET: '[REDACTED]',
        RAZORPAY_WEBHOOK_SECRET: '[REDACTED]',
        RAZORPAY_ENVIRONMENT: this.RAZORPAY_ENVIRONMENT,
        PAYMENT_CURRENCY: this.PAYMENT_CURRENCY,
        PREMIUM_MONTHLY_PLAN_ID: this.PREMIUM_MONTHLY_PLAN_ID,
        PREMIUM_YEARLY_PLAN_ID: this.PREMIUM_YEARLY_PLAN_ID,
      };
    },
  };
};

export const paymentConfig = getValidatedPaymentConfig();
