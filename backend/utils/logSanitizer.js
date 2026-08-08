import winston from 'winston';

const SENSITIVE_KEYS = [
  'card',
  'cardnumber',
  'card_number',
  'cvv',
  'cvc',
  'razorpay_signature',
  'razorpay_key_secret',
  'razorpay_webhook_secret',
  'razorpay_key_id',
  'razorpay_environment',
  'premium_monthly_plan_id',
  'premium_yearly_plan_id',
  'secret',
  'key_secret',
  'webhook_secret',
  'password',
  'token',
  'authorization',
  'cookie',
];

/**
 * Deeply sanitizes sensitive payment credentials, secrets, cards, and CVVs from objects/strings.
 */
export const sanitizeData = (data) => {
  if (!data) return data;

  if (typeof data === 'string') {
    let sanitizedString = data;
    SENSITIVE_KEYS.forEach((key) => {
      const regex = new RegExp(`("${key}"|'${key}'|${key})\\s*[:=]\\s*["']?([^"\\s,&]+)["']?`, 'gi');
      sanitizedString = sanitizedString.replace(regex, `$1: "[REDACTED]"`);
    });
    return sanitizedString;
  }

  if (typeof data === 'object') {
    if (Array.isArray(data)) {
      return data.map(sanitizeData);
    }

    const sanitizedObj = {};
    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase();
      if (SENSITIVE_KEYS.some((sKey) => lowerKey.includes(sKey))) {
        sanitizedObj[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        sanitizedObj[key] = sanitizeData(value);
      } else {
        sanitizedObj[key] = value;
      }
    }
    return sanitizedObj;
  }

  return data;
};

/**
 * Custom Winston Log Formatter for Automatic Secret & Credential Redaction
 */
export const sanitizeLogFormat = winston.format((info) => {
  if (typeof info.message === 'string') {
    info.message = sanitizeData(info.message);
  } else if (typeof info.message === 'object') {
    info.message = sanitizeData(info.message);
  }

  if (info.meta) {
    info.meta = sanitizeData(info.meta);
  }

  return info;
});
