import { AppError } from '../utils/appError.js';

/**
 * Generate 6-digit OTP code, attach 10-minute expiry to user document, and save
 */
export const generateAndSaveOTP = async (user) => {
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

  user.otpCode = otpCode;
  user.otpExpiresAt = otpExpiresAt;
  await user.save({ validateBeforeSave: false });

  return { otpCode, otpExpiresAt };
};

/**
 * Verify candidate OTP code against user's stored OTP and check expiration
 */
export const verifyOTPCode = (user, candidateCode) => {
  if (!user.otpCode || user.otpCode !== candidateCode) {
    throw new AppError('Invalid OTP verification code.', 400);
  }

  if (new Date() > user.otpExpiresAt) {
    throw new AppError('OTP verification code has expired. Please request a new code.', 400);
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
