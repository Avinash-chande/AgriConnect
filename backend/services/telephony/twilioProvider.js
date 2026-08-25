/**
 * Twilio Telephony Voice Provider Adapter
 * Initiates real telecom outbound calls via Twilio REST API.
 */

import { TelephonyAdapter } from './telephonyAdapter.js';
import { logger } from '../../utils/logger.js';

export class TwilioProvider extends TelephonyAdapter {
  constructor() {
    super('twilio');
  }

  /**
   * Check if Twilio environment credentials are fully configured
   */
  isConfigured() {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    const phone = process.env.TWILIO_PHONE_NUMBER;

    return Boolean(
      sid &&
      token &&
      phone &&
      !sid.includes('your_') &&
      !token.includes('your_')
    );
  }

  /**
   * Initiate outbound phone call to real phone number via Twilio REST API
   */
  async makeCall({ to, from, webhookUrl, callerName }) {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = from || process.env.TWILIO_PHONE_NUMBER;

    if (!this.isConfigured()) {
      throw new Error('Twilio provider credentials are not configured in environment variables.');
    }

    const twimlMessage = `<Response><Say voice="Polly.Aditi" language="hi-IN">Namaste! This is an agricultural employment call from an AgriConnect farmer ${callerName ? callerName : ''}. Please hold while we connect you.</Say></Response>`;

    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls.json`;

    const formData = new URLSearchParams();
    formData.append('To', to);
    formData.append('From', fromNumber);
    formData.append('Twiml', twimlMessage);

    if (webhookUrl) {
      formData.append('StatusCallback', webhookUrl);
      formData.append('StatusCallbackMethod', 'POST');
      formData.append('StatusCallbackEvent', 'initiated');
      formData.append('StatusCallbackEvent', 'ringing');
      formData.append('StatusCallbackEvent', 'answered');
      formData.append('StatusCallbackEvent', 'completed');
    }

    const authHeader = 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64');

    logger.info(`📞 [TwilioProvider] Calling ${to} from ${fromNumber}`);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    const data = await response.json();

    if (!response.ok) {
      const errMsg = data.message || `Twilio API error: ${response.status} ${response.statusText}`;
      logger.error(`❌ [TwilioProvider] Call failed: ${errMsg}`);
      throw new Error(errMsg);
    }

    logger.info(`✅ [TwilioProvider] Call initiated successfully. SID: ${data.sid}, Status: ${data.status}`);

    return {
      success: true,
      providerCallId: data.sid,
      status: this.mapTwilioStatus(data.status),
      data,
    };
  }

  /**
   * Map Twilio call statuses to standard AgriConnect internal statuses
   */
  mapTwilioStatus(twilioStatus) {
    switch (twilioStatus?.toLowerCase()) {
      case 'queued':
      case 'initiated':
        return 'initiated';
      case 'ringing':
        return 'ringing';
      case 'in-progress':
        return 'answered';
      case 'completed':
        return 'completed';
      case 'busy':
        return 'busy';
      case 'no-answer':
        return 'no-answer';
      case 'failed':
        return 'failed';
      case 'canceled':
        return 'cancelled';
      default:
        return 'initiated';
    }
  }
}
