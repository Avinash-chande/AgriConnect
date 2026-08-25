/**
 * Real Mobile Telephony Calling Test Suite
 * Tests E.164 normalization, verified mobile checks, provider adapters, call service, and controllers.
 */

import { jest } from '@jest/globals';
import { normalizePhoneNumber, isValidPhoneNumber } from '../utils/phoneUtils.js';
import { TwilioProvider } from '../services/telephony/twilioProvider.js';
import { MockProvider } from '../services/telephony/mockProvider.js';
import { callService } from '../services/callService.js';
import { Call } from '../models/Call.js';
import { WorkerProfile } from '../models/WorkerProfile.js';
import { User } from '../models/User.js';
import {
  initiateMobileCallController,
  handleCallWebhookController,
  getCallHistoryController,
} from '../controllers/callController.js';

describe('AgriConnect Real Mobile Telephony Calling Feature Suite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================
  // 1. Phone Number Normalization & Validation Utils
  // ============================================================
  describe('1. Phone Number Normalization & Validation Utils', () => {
    test('normalizes 10-digit Indian mobile numbers to E.164 format (+91XXXXXXXXXX)', () => {
      expect(normalizePhoneNumber('9876543210')).toBe('+919876543210');
      expect(normalizePhoneNumber('+91 98765 43210')).toBe('+919876543210');
      expect(normalizePhoneNumber('09876543210')).toBe('+919876543210');
      expect(normalizePhoneNumber('919876543210')).toBe('+919876543210');
      expect(normalizePhoneNumber('+91-98765-43210')).toBe('+919876543210');
    });

    test('validates E.164 phone numbers accurately', () => {
      expect(isValidPhoneNumber('9876543210')).toBe(true);
      expect(isValidPhoneNumber('+919876543210')).toBe(true);
      expect(isValidPhoneNumber('+14155552671')).toBe(true);
      expect(isValidPhoneNumber('123')).toBe(false);
      expect(isValidPhoneNumber('')).toBe(false);
      expect(isValidPhoneNumber(null)).toBe(false);
    });
  });

  // ============================================================
  // 2. Telephony Provider Adapters
  // ============================================================
  describe('2. Telephony Provider Adapters (Twilio & Mock)', () => {
    test('TwilioProvider accurately detects missing environment credentials', () => {
      const originalSid = process.env.TWILIO_ACCOUNT_SID;
      delete process.env.TWILIO_ACCOUNT_SID;

      const twilio = new TwilioProvider();
      expect(twilio.isConfigured()).toBe(false);

      process.env.TWILIO_ACCOUNT_SID = originalSid;
    });

    test('TwilioProvider isConfigured returns true when proper credentials are set', () => {
      const twilio = new TwilioProvider();
      process.env.TWILIO_ACCOUNT_SID = 'AC1234567890abcdef1234567890abcdef';
      process.env.TWILIO_AUTH_TOKEN = 'secret_token_12345';
      process.env.TWILIO_PHONE_NUMBER = '+15005550006';

      expect(twilio.isConfigured()).toBe(true);
    });

    test('MockProvider simulates call with generated Call SID and status', async () => {
      const mock = new MockProvider();
      expect(mock.isConfigured()).toBe(true);

      const res = await mock.makeCall({
        to: '+919876543210',
        from: '+910000000000',
        callerName: 'Harpreet Singh',
      });

      expect(res.success).toBe(true);
      expect(res.providerCallId).toMatch(/^CA/);
      expect(res.status).toBe('initiated');
    });
  });

  // ============================================================
  // 3. CallService Orchestration & Verified Mobile Guards
  // ============================================================
  describe('3. CallService Orchestration & Business Rules', () => {
    test('rejects call when callerUser is missing', async () => {
      await expect(
        callService.initiateMobileCall({
          callerUser: null,
          workerUser: { _id: 'w1', mobile: '+919876543210', mobileVerified: true },
        })
      ).rejects.toThrow(/Caller user authentication is required/i);
    });

    test('rejects call when worker has no registered mobile number', async () => {
      await expect(
        callService.initiateMobileCall({
          callerUser: { _id: 'f1', name: 'Farmer' },
          workerUser: { _id: 'w1', mobile: '', mobileVerified: false },
        })
      ).rejects.toThrow(/Worker does not have a registered mobile number/i);
    });

    test('rejects call when worker mobile is unverified (mobileVerified === false)', async () => {
      await expect(
        callService.initiateMobileCall({
          callerUser: { _id: 'f1', name: 'Farmer' },
          workerUser: { _id: 'w1', mobile: '+919876543210', mobileVerified: false, mobileVerifiedAt: null },
        })
      ).rejects.toThrow(/Worker mobile number is not verified/i);
    });

    test('rejects call with 503 when provider is not configured in real mode', async () => {
      process.env.CALL_PROVIDER_MODE = 'real';
      delete process.env.TWILIO_ACCOUNT_SID;

      await expect(
        callService.initiateMobileCall({
          callerUser: { _id: 'f1', name: 'Farmer' },
          workerUser: { _id: 'w1', mobile: '+919876543210', mobileVerified: true },
        })
      ).rejects.toThrow(/Mobile calling is not configured yet/i);

      process.env.CALL_PROVIDER_MODE = 'mock';
    });

    test('successfully initiates call and creates Call record in mock mode', async () => {
      process.env.CALL_PROVIDER_MODE = 'mock';

      const mockCallDoc = {
        _id: '60c72b2f9b1d8b2b98e1f555',
        status: 'initiated',
        createdAt: new Date(),
      };
      jest.spyOn(Call, 'create').mockResolvedValue(mockCallDoc);

      const result = await callService.initiateMobileCall({
        callerUser: { _id: 'f1', name: 'Harpreet Farmer' },
        workerUser: { _id: 'w1', mobile: '+919876543210', mobileVerified: true },
        workerProfile: { _id: 'wp1' },
      });

      expect(result).toBeDefined();
      expect(result.callId).toBe('60c72b2f9b1d8b2b98e1f555');
      expect(result.status).toBe('initiated');
      expect(Call.create).toHaveBeenCalled();
    });
  });

  // ============================================================
  // 4. Call Controller & Security (Hide Phone Number from Response)
  // ============================================================
  describe('4. Call Controller Security & Webhooks', () => {
    test('initiateMobileCallController rejects self-calling', async () => {
      const req = {
        user: { _id: 'same-user-id', name: 'Farmer' },
        body: { workerId: 'same-user-id' },
      };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      await initiateMobileCallController(req, res, next);
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('cannot initiate a phone call to yourself'),
        })
      );
    });

    test('handleCallWebhookController processes provider status updates', async () => {
      jest.spyOn(callService, 'updateCallStatusByProviderId').mockResolvedValue({ status: 'completed' });

      const req = {
        body: {
          CallSid: 'CA_test_123',
          CallStatus: 'completed',
          CallDuration: '60',
        },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        type: jest.fn().mockReturnThis(),
        send: jest.fn(),
      };

      await handleCallWebhookController(req, res, () => {});

      expect(res.status).toHaveBeenCalledWith(200);
      expect(callService.updateCallStatusByProviderId).toHaveBeenCalledWith('CA_test_123', 'completed', 60);
    });
  });
});
