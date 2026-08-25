/**
 * AgriConnect Telephony Call Service
 * Orchestrates telephony provider calls, normalization, credential checks, and call history logs.
 */

import { TwilioProvider } from './telephony/twilioProvider.js';
import { MockProvider } from './telephony/mockProvider.js';
import { Call } from '../models/Call.js';
import { normalizePhoneNumber, isValidPhoneNumber } from '../utils/phoneUtils.js';
import { AppError } from '../utils/appError.js';
import { logger } from '../utils/logger.js';

class CallService {
  constructor() {
    this.twilioProvider = new TwilioProvider();
    this.mockProvider = new MockProvider();
  }

  /**
   * Get active telephony provider based on environment configuration
   */
  getProvider() {
    const mode = process.env.CALL_PROVIDER_MODE?.toLowerCase();
    if (mode === 'mock') {
      return this.mockProvider;
    }
    return this.twilioProvider;
  }

  /**
   * Check if telephony provider is configured and ready to place calls
   */
  isProviderReady() {
    const provider = this.getProvider();
    return provider.isConfigured();
  }

  /**
   * Initiate a real mobile phone call to a worker's registered mobile number
   */
  async initiateMobileCall({ callerUser, workerUser, workerProfile, webhookUrl }) {
    if (!callerUser) {
      throw new AppError('Caller user authentication is required.', 401);
    }

    if (!workerUser) {
      throw new AppError('Worker account not found.', 404);
    }

    const rawMobile = workerUser.mobile || workerUser.mobileNumber;
    if (!rawMobile) {
      throw new AppError('Worker does not have a registered mobile number.', 400);
    }

    // Verify Worker Mobile Verification status
    const isMobileVerified = Boolean(workerUser.mobileVerified || workerUser.mobileVerifiedAt);
    if (!isMobileVerified) {
      throw new AppError('Worker mobile number is not verified.', 400);
    }

    // Normalize phone number to standard E.164
    const normalizedMobile = normalizePhoneNumber(rawMobile);
    if (!isValidPhoneNumber(normalizedMobile)) {
      throw new AppError('Worker mobile number format is invalid.', 400);
    }

    const provider = this.getProvider();

    // If provider credentials are missing and not in mock mode
    if (!provider.isConfigured()) {
      logger.warn('⚠️ Telephony provider is not configured. Outbound calling unavailable.');
      throw new AppError('Mobile calling is not configured yet. Please configure the call provider.', 503);
    }

    try {
      const result = await provider.makeCall({
        to: normalizedMobile,
        from: process.env.TWILIO_PHONE_NUMBER,
        callerName: callerUser.name,
        webhookUrl,
      });

      // Log call record in database (never storing audio or raw unverified info)
      const call = await Call.create({
        caller: callerUser._id,
        receiver: workerUser._id,
        workerProfile: workerProfile?._id || null,
        provider: provider.name,
        providerCallId: result.providerCallId || '',
        status: result.status || 'initiated',
        startedAt: new Date(),
      });

      logger.info(`📞 Call record created in DB: ${call._id} (Provider SID: ${result.providerCallId})`);

      return {
        callId: call._id.toString(),
        status: call.status,
        provider: provider.name,
        createdAt: call.createdAt,
      };
    } catch (err) {
      logger.error(`❌ Call initiation failed: ${err.message}`);
      if (err instanceof AppError) throw err;
      throw new AppError(
        err.message || 'Unable to initiate call. Please try again later.',
        err.statusCode || 500
      );
    }
  }

  /**
   * Update Call status by provider call ID (e.g. from Webhook)
   */
  async updateCallStatusByProviderId(providerCallId, status, duration = 0) {
    if (!providerCallId) return null;

    const updateData = { status };
    if (duration > 0) updateData.duration = duration;
    if (['completed', 'failed', 'busy', 'no-answer', 'cancelled'].includes(status)) {
      updateData.endedAt = new Date();
    }

    const updated = await Call.findOneAndUpdate(
      { providerCallId },
      { $set: updateData },
      { new: true }
    );

    return updated;
  }
}

export const callService = new CallService();
