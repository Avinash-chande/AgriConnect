import crypto from 'crypto';
import { AppError } from '../utils/appError.js';

/**
 * Generate a cryptographically secure 6-digit OTP code without modifying any document
 */
export const generateOTPCode = () => {
  const otpCode = crypto.randomInt(100000, 1000000).toString();
  const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  return { otpCode, otpExpiresAt };
};

/**
 * Generate 6-digit OTP code, attach 10-minute expiry to user document, and save
 * (Used for existing user accounts, e.g. forgot-password flow)
 */
export const generateAndSaveOTP = async (user) => {
  const { otpCode, otpExpiresAt } = generateOTPCode();

  user.otpCode = otpCode;
  user.otpExpiresAt = otpExpiresAt;
  await user.save({ validateBeforeSave: false });

  return { otpCode, otpExpiresAt };
};

/**
 * Verify candidate OTP code against user's stored OTP and check expiration (throws on failure)
 */
export const verifyOTPCode = (user, candidateCode) => {
  if (!user.otpCode || user.otpCode !== candidateCode) {
    throw new AppError('Invalid OTP verification code.', 400);
  }

  if (new Date() > user.otpExpiresAt) {
    throw new AppError(
      'OTP verification code has expired. Please request a new code.',
      400
    );
  }

  return true;
};

/**
 * Check if candidate OTP matches pending registration's stored OTP without throwing.
 * Returns boolean so calling service can track and count failed attempts.
 */
export const verifyPendingOTPCode = (pending, candidateCode) => {
  if (!pending.otpCode || pending.otpCode !== candidateCode) {
    return false;
  }
  return true;
};

/**
 * Clear OTP credentials from user document
 */
export const clearOTP = async (user) => {
  user.otpCode = undefined;
  user.otpExpiresAt = undefined;
  await user.save({ validateBeforeSave: false });
};
