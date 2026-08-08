import request from 'supertest';
import mongoose from 'mongoose';
import app from '../app.js';
import { sanitizeData } from '../utils/logSanitizer.js';
import { logAuditEvent } from '../services/auditLogger.js';
import { AuditLog } from '../models/AuditLog.js';
import { Payment } from '../models/Payment.js';
import { Transaction } from '../models/Transaction.js';
import { Invoice } from '../models/Invoice.js';
import { Refund } from '../models/Refund.js';

describe('Phase 9 Security Implementation Test Suite', () => {
  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(
        process.env.MONGODB_TEST_URI || 'mongodb://127.0.0.1:27017/agriconnect_test_db'
      );
    }
  });

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });

  describe('Sensitive Data Redaction & Log Sanitization', () => {
    it('should redact sensitive payment secrets, card numbers, and CVV from objects', () => {
      const sensitiveInput = {
        amount: 499,
        razorpay_signature: 'super_secret_hmac_signature',
        card: '4111111111111111',
        cvv: '123',
        password: 'mySecretPassword123',
        secret: 'webhook_secret_key',
        nested: {
          token: 'jwt_secret_token',
          publicField: 'safe_value',
        },
      };

      const sanitized = sanitizeData(sensitiveInput);

      expect(sanitized.amount).toBe(499);
      expect(sanitized.razorpay_signature).toBe('[REDACTED]');
      expect(sanitized.card).toBe('[REDACTED]');
      expect(sanitized.cvv).toBe('[REDACTED]');
      expect(sanitized.password).toBe('[REDACTED]');
      expect(sanitized.secret).toBe('[REDACTED]');
      expect(sanitized.nested.token).toBe('[REDACTED]');
      expect(sanitized.nested.publicField).toBe('safe_value');
    });

    it('should redact sensitive credentials from string payloads', () => {
      const logString = 'Processing payment with card: 4111111111111111 and cvv: 999';
      const sanitized = sanitizeData(logString);

      expect(sanitized).toContain('card: "[REDACTED]"');
      expect(sanitized).toContain('cvv: "[REDACTED]"');
    });
  });

  describe('Financial Audit Logging', () => {
    it('should log audit event while redacting sensitive fields', async () => {
      await logAuditEvent({
        action: 'REFUND_REQUESTED',
        ipAddress: '127.0.0.1',
        status: 'SUCCESS',
        details: {
          transactionId: 'txn_test_123',
          amount: 499,
          secretKey: 'should_be_redacted',
        },
      });

      const auditRecord = await AuditLog.findOne({ action: 'REFUND_REQUESTED' }).sort({ createdAt: -1 });
      expect(auditRecord).toBeDefined();
      expect(auditRecord.details.transactionId).toBe('txn_test_123');
      expect(auditRecord.details.secretKey).toBe('[REDACTED]');

      if (auditRecord) await AuditLog.findByIdAndDelete(auditRecord._id);
    });
  });

  describe('Database Schema Security Verification', () => {
    it('should confirm Mongoose models do not define card or CVV storage fields', () => {
      const paymentSchemaKeys = Object.keys(Payment.schema.paths);
      const txnSchemaKeys = Object.keys(Transaction.schema.paths);
      const invoiceSchemaKeys = Object.keys(Invoice.schema.paths);
      const refundSchemaKeys = Object.keys(Refund.schema.paths);

      const forbiddenKeys = ['card', 'cardNumber', 'card_number', 'cvv', 'cvc', 'secret', 'keySecret'];

      forbiddenKeys.forEach((key) => {
        expect(paymentSchemaKeys).not.toContain(key);
        expect(txnSchemaKeys).not.toContain(key);
        expect(invoiceSchemaKeys).not.toContain(key);
        expect(refundSchemaKeys).not.toContain(key);
      });
    });
  });

  describe('HTTP Security Headers & CORS Enforcement', () => {
    it('should include Helmet security headers in HTTP responses', async () => {
      const res = await request(app).get('/api/v1/health');

      expect(res.headers['x-dns-prefetch-control']).toBeDefined();
      expect(res.headers['x-frame-options']).toBeDefined();
      expect(res.headers['x-content-type-options']).toBeDefined();
    });
  });
});
