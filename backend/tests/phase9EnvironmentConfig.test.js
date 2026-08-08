import fs from 'fs';
import path from 'path';
import { jest } from '@jest/globals';
import { getValidatedPaymentConfig, paymentConfig } from '../config/paymentConfig.js';
import { sanitizeData } from '../utils/logSanitizer.js';

describe('Phase 9 Secure Environment Configuration Suite', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('1. Required Variables Presence & Export', () => {
    it('should export all 7 required Phase 9 environment variables', () => {
      const config = getValidatedPaymentConfig();

      expect(config.RAZORPAY_KEY_ID).toBeDefined();
      expect(config.RAZORPAY_KEY_SECRET).toBeDefined();
      expect(config.RAZORPAY_WEBHOOK_SECRET).toBeDefined();
      expect(config.RAZORPAY_ENVIRONMENT).toBeDefined();
      expect(config.PAYMENT_CURRENCY).toBeDefined();
      expect(config.PREMIUM_MONTHLY_PLAN_ID).toBeDefined();
      expect(config.PREMIUM_YEARLY_PLAN_ID).toBeDefined();
    });

    it('should default PAYMENT_CURRENCY to INR and validate uppercase ISO code', () => {
      const mockEnv = {
        NODE_ENV: 'test',
        PAYMENT_CURRENCY: 'usd',
      };
      const config = getValidatedPaymentConfig(mockEnv);
      expect(config.PAYMENT_CURRENCY).toBe('USD');
    });
  });

  describe('2. Git & Secrets Security (Never Commit Secrets)', () => {
    it('should verify backend/.env.example contains placeholder values only', () => {
      const envExamplePath = path.join(process.cwd(), '.env.example');
      expect(fs.existsSync(envExamplePath)).toBe(true);

      const content = fs.readFileSync(envExamplePath, 'utf8');

      expect(content).toContain('RAZORPAY_KEY_ID=your_razorpay_key_id_here');
      expect(content).toContain('RAZORPAY_KEY_SECRET=your_razorpay_key_secret_here');
      expect(content).toContain('RAZORPAY_WEBHOOK_SECRET=your_razorpay_webhook_secret_here');
      expect(content).toContain('RAZORPAY_ENVIRONMENT=development');
      expect(content).toContain('PAYMENT_CURRENCY=INR');
      expect(content).toContain('PREMIUM_MONTHLY_PLAN_ID=farmer_pro_monthly');
      expect(content).toContain('PREMIUM_YEARLY_PLAN_ID=farmer_pro_yearly');

      // Secrets must NOT be in .env.example
      expect(content).not.toContain('agriconnect_rzp_secret_key_2026_dev');
      expect(content).not.toContain('agriconnect_webhook_secret_2026');
    });

    it('should verify .gitignore ignores .env files to prevent committing secrets', () => {
      const gitignorePath = path.join(process.cwd(), '.gitignore');
      expect(fs.existsSync(gitignorePath)).toBe(true);

      const content = fs.readFileSync(gitignorePath, 'utf8');
      expect(content).toMatch(/\.env/);
    });
  });

  describe('3. Environment Separation (development, test, production)', () => {
    it('should allow default fallbacks in development environment', () => {
      const devEnv = {
        NODE_ENV: 'development',
      };

      const config = getValidatedPaymentConfig(devEnv);
      expect(config.RAZORPAY_ENVIRONMENT).toBe('development');
      expect(config.PAYMENT_CURRENCY).toBe('INR');
      expect(config.PREMIUM_MONTHLY_PLAN_ID).toBe('farmer_pro_monthly');
      expect(config.PREMIUM_YEARLY_PLAN_ID).toBe('farmer_pro_yearly');
    });

    it('should handle test environment gracefully without throwing errors', () => {
      const testEnv = {
        NODE_ENV: 'test',
      };

      const config = getValidatedPaymentConfig(testEnv);
      expect(config.RAZORPAY_ENVIRONMENT).toBe('test');
    });

    it('should enforce strict validation and throw in production if secrets are missing or placeholders', () => {
      const prodInsecureEnv = {
        NODE_ENV: 'production',
        RAZORPAY_KEY_ID: 'your_razorpay_key_id_here',
        RAZORPAY_KEY_SECRET: 'your_razorpay_key_secret_here',
        RAZORPAY_WEBHOOK_SECRET: 'your_razorpay_webhook_secret_here',
        RAZORPAY_ENVIRONMENT: 'development',
        PAYMENT_CURRENCY: 'INR',
        PREMIUM_MONTHLY_PLAN_ID: 'farmer_pro_monthly',
        PREMIUM_YEARLY_PLAN_ID: 'farmer_pro_yearly',
      };

      expect(() => {
        getValidatedPaymentConfig(prodInsecureEnv);
      }).toThrow(/Production Environment Validation Failed/i);
    });

    it('should pass production validation when all credentials are set securely', () => {
      const prodSecureEnv = {
        NODE_ENV: 'production',
        RAZORPAY_KEY_ID: 'rzp_live_real_key_9988776655',
        RAZORPAY_KEY_SECRET: 'super_secure_production_razorpay_secret_key_2026',
        RAZORPAY_WEBHOOK_SECRET: 'super_secure_production_webhook_secret_key_2026',
        RAZORPAY_ENVIRONMENT: 'production',
        PAYMENT_CURRENCY: 'INR',
        PREMIUM_MONTHLY_PLAN_ID: 'farmer_pro_monthly_live',
        PREMIUM_YEARLY_PLAN_ID: 'farmer_pro_yearly_live',
      };

      const config = getValidatedPaymentConfig(prodSecureEnv);
      expect(config.RAZORPAY_KEY_ID).toBe('rzp_live_real_key_9988776655');
      expect(config.RAZORPAY_ENVIRONMENT).toBe('production');
    });
  });

  describe('4. Log Security (Never Print Secrets in Logs)', () => {
    it('should sanitize secret keys when getSanitizedConfig is called', () => {
      const config = getValidatedPaymentConfig({
        NODE_ENV: 'development',
        RAZORPAY_KEY_SECRET: 'super_secret_raw_key_12345',
        RAZORPAY_WEBHOOK_SECRET: 'super_secret_webhook_12345',
      });

      const sanitized = config.getSanitizedConfig();
      expect(sanitized.RAZORPAY_KEY_SECRET).toBe('[REDACTED]');
      expect(sanitized.RAZORPAY_WEBHOOK_SECRET).toBe('[REDACTED]');
      expect(sanitized.RAZORPAY_KEY_ID).toBe(config.RAZORPAY_KEY_ID);
    });

    it('should automatically redact sensitive payment secrets via logSanitizer', () => {
      const testObject = {
        razorpay_key_secret: 'agriconnect_rzp_secret_key_2026_dev',
        razorpay_webhook_secret: 'agriconnect_webhook_secret_2026',
        razorpay_key_id: 'rzp_test_agriconnect_key_2026',
        public_info: 'visible',
      };

      const sanitized = sanitizeData(testObject);
      expect(sanitized.razorpay_key_secret).toBe('[REDACTED]');
      expect(sanitized.razorpay_webhook_secret).toBe('[REDACTED]');
      expect(sanitized.razorpay_key_id).toBe('[REDACTED]');
      expect(sanitized.public_info).toBe('visible');
    });
  });
});
