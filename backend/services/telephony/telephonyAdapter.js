/**
 * Abstract Telephony Provider Base Adapter
 */

export class TelephonyAdapter {
  constructor(name) {
    this.name = name;
  }

  /**
   * Check if provider is configured with necessary API credentials
   * @returns {boolean}
   */
  isConfigured() {
    throw new Error('isConfigured() must be implemented by subclass');
  }

  /**
   * Initiate outbound phone call
   * @param {Object} params
   * @param {string} params.to - E.164 destination phone number
   * @param {string} params.from - Configured caller ID / phone number
   * @param {string} [params.customMessage] - Optional speech message or TwiML URL
   * @returns {Promise<{ success: boolean, providerCallId: string, status: string }>}
   */
  async makeCall(params) {
    throw new Error('makeCall() must be implemented by subclass');
  }
}
