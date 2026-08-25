/**
 * Mock Telephony Provider Adapter
 * Used ONLY when CALL_PROVIDER_MODE=mock is explicitly enabled for automated testing / dev.
 */

import { TelephonyAdapter } from './telephonyAdapter.js';
import { logger } from '../../utils/logger.js';

export class MockProvider extends TelephonyAdapter {
  constructor() {
    super('mock');
  }

  isConfigured() {
    return true;
  }

  async makeCall({ to, from, callerName }) {
    const mockSid = 'CA' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    logger.info(`📞 [MockTelephonyProvider] CALL SIMULATION ONLY`);
    logger.info(`📞 [MockTelephonyProvider] Outbound call to ${to} (Caller: ${callerName || 'Farmer'}, From: ${from || '+910000000000'})`);
    logger.info(`📞 [MockTelephonyProvider] Simulated Call SID: ${mockSid}`);

    return {
      success: true,
      providerCallId: mockSid,
      status: 'initiated',
      isMock: true,
    };
  }
}
