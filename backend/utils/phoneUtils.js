/**
 * AgriConnect Phone Number Utilities
 * Normalizes phone numbers to standard E.164 format and validates phone patterns.
 */

/**
 * Normalizes an Indian or International phone number into E.164 format (+91XXXXXXXXXX)
 * @param {string} phone - Input phone number
 * @returns {string} E.164 formatted phone number
 */
export const normalizePhoneNumber = (phone) => {
  if (!phone || typeof phone !== 'string') return '';

  // Remove spaces, dashes, parentheses, dots
  let cleaned = phone.replace(/[\s\-\(\)\.]/g, '').trim();

  // If already starts with '+', keep it and clean any internal non-digits
  if (cleaned.startsWith('+')) {
    return '+' + cleaned.substring(1).replace(/\D/g, '');
  }

  // If starts with '00', replace with '+'
  if (cleaned.startsWith('00')) {
    return '+' + cleaned.substring(2).replace(/\D/g, '');
  }

  // If starts with leading '0' (e.g. 09876543210 in India), remove '0' and add '+91'
  if (cleaned.startsWith('0') && cleaned.length === 11) {
    cleaned = cleaned.substring(1);
  }

  // If 10-digit Indian number, prepend '+91'
  if (/^\d{10}$/.test(cleaned)) {
    return `+91${cleaned}`;
  }

  // If 12-digit starting with 91, prepend '+'
  if (/^91\d{10}$/.test(cleaned)) {
    return `+${cleaned}`;
  }

  // Default fallback: prepend '+' if digits only
  return `+${cleaned.replace(/\D/g, '')}`;
};

/**
 * Validates whether a phone number matches valid international / Indian E.164 patterns
 * @param {string} phone
 * @returns {boolean}
 */
export const isValidPhoneNumber = (phone) => {
  if (!phone || typeof phone !== 'string') return false;
  const normalized = normalizePhoneNumber(phone);
  // Standard E.164 format: + followed by 8 to 15 digits
  return /^\+[1-9]\d{7,14}$/.test(normalized);
};
