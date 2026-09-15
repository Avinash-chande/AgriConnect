import { asyncHandler } from '../utils/asyncHandler.js';
import { sendResponse } from '../utils/apiResponse.js';
import { AppError } from '../utils/appError.js';
import { OAuth2Client } from 'google-auth-library';
import { registerGoogleUserService, findUserByEmailOrGoogleId } from '../services/authService.js';
import { setAuthCookies, clearAuthCookies } from '../services/jwtService.js';
import { accessTokenCookieOptions, refreshTokenCookieOptions } from '../config/jwt.js';
import {
  registerFarmerService,
  registerWorkerService,
  verifyRegistrationOTPService,
  resendRegistrationOTPService,
  loginUserService,
  refreshTokenService,
  logoutUserService,
  forgotPasswordService,
  resetPasswordService,
  sendOTPService,
  verifyOTPService,
  verifyPasswordResetOTPService,
  googleLoginService,
} from '../services/authService.js';
import { calculateProfileCompletion } from '../utils/profileCalculator.js';

const sendAuthTokenResponse = async (user, statusCode, message, res) => {
  const tokens = setAuthCookies(res, user);

  user.refreshToken = tokens.refreshToken;
  await user.save({ validateBeforeSave: false });

  const userObject = user.toObject ? user.toObject() : { ...user };
  delete userObject.password;
  delete userObject.otpCode;
  delete userObject.otpExpiresAt;
  delete userObject.refreshToken;

  const profile = userObject.farmerProfile || userObject.workerProfile;
  const completionPercentage = calculateProfileCompletion(userObject, profile);

  return sendResponse(res, statusCode, message, {
    user: {
      ...userObject,
      completionPercentage,
    },
    tokens,
  });
};

/**
 * Register Farmer — OTP Gated:
 * Creates PendingRegistration and sends OTP.
 * MUST NOT create User, FarmerProfile, or issue JWT.
 */
export const registerFarmer = asyncHandler(async (req, res, next) => {
  const { fullName, name, email, phone, mobile, password, farmName, location } = req.body;
  if ((!fullName && !name) || !email || (!phone && !mobile) || !password || !farmName || !location) {
    return next(
      new AppError(
        'Please provide required fields: name/fullName, email, mobile/phone, password, farmName, location',
        400
      )
    );
  }

  const result = await registerFarmerService(req.body);
  return sendResponse(res, 200, 'OTP sent. Please verify your email to complete registration.', result);
});

/**
 * Register Worker — OTP Gated:
 * Creates PendingRegistration and sends OTP.
 * MUST NOT create User, WorkerProfile, or issue JWT.
 */
export const registerWorker = asyncHandler(async (req, res, next) => {
  const { fullName, name, email, phone, mobile, password, location } = req.body;
  if ((!fullName && !name) || !email || (!phone && !mobile) || !password || !location) {
    return next(
      new AppError(
        'Please provide required fields: name/fullName, email, mobile/phone, password, location',
        400
      )
    );
  }

  const result = await registerWorkerService(req.body);
  return sendResponse(res, 200, 'OTP sent. Please verify your email to complete registration.', result);
});

/**
 * Resend OTP for Pending Registration
 */
export const resendRegistrationOTP = asyncHandler(async (req, res, next) => {
  const { email } = req.body;
  if (!email) {
    return next(new AppError('Please provide email address.', 400));
  }

  const result = await resendRegistrationOTPService(email);
  return sendResponse(res, 200, 'A new OTP verification code has been sent to your email.', result);
});

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export const googleAuth = asyncHandler(async (req, res, next) => {
  const { credential, role } = req.body;

  if (!credential) {
    return next(new AppError('Google credential is required.', 400));
  }
  if (!['farmer', 'worker'].includes(role)) {
    return next(new AppError('Role must be farmer or worker.', 400));
  }

  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    payload = ticket.getPayload();
  } catch (err) {
    return next(new AppError('Invalid Google token.', 401));
  }

  const { email, name, sub: googleId, email_verified } = payload;
  if (!email_verified) {
    return next(new AppError('Google email is not verified.', 400));
  }

  const existingUser = await findUserByEmailOrGoogleId(email, googleId);
  if (existingUser) {
    return await sendAuthTokenResponse(existingUser, 200, 'Sign in successful', res);
  }

  const newUser = await registerGoogleUserService({ email, name, googleId, role });
  return await sendAuthTokenResponse(newUser, 201, 'Account created successfully', res);
});

export const login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return next(new AppError('Please provide email and password.', 400));
  }

  const user = await loginUserService(email, password);
  return await sendAuthTokenResponse(user, 200, 'Sign in successful', res);
});

export const refreshToken = asyncHandler(async (req, res, next) => {
  const incomingRefreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
  if (!incomingRefreshToken) {
    return next(new AppError('Refresh token is required.', 401));
  }

  const result = await refreshTokenService(incomingRefreshToken);

  res.cookie('accessToken', result.accessToken, accessTokenCookieOptions);
  res.cookie('refreshToken', result.refreshToken, refreshTokenCookieOptions);

  return sendResponse(res, 200, 'Access token refreshed successfully', {
    tokens: {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    },
  });
});

export const logout = asyncHandler(async (req, res) => {
  if (req.user?._id) {
    await logoutUserService(req.user._id);
  }
  clearAuthCookies(res);
  return sendResponse(res, 200, 'Logged out successfully');
});

export const forgotPassword = asyncHandler(async (req, res, next) => {
  const { email, phone, mobile } = req.body;
  const credential = email || phone || mobile;

  if (!credential) {
    return next(new AppError('Please provide email address or mobile number.', 400));
  }

  const result = await forgotPasswordService(credential);
  return sendResponse(res, 200, 'Password reset OTP code generated and sent.', {
    otpCode: result.otpCode,
    expiresAt: result.otpExpiresAt,
  });
});

export const resetPassword = asyncHandler(async (req, res, next) => {
  const { email, phone, mobile, otpCode, newPassword } = req.body;
  const credential = email || phone || mobile;

  if (!credential || !otpCode || !newPassword) {
    return next(new AppError('Please provide email/mobile, 6-digit OTP code, and new password.', 400));
  }

  await resetPasswordService(credential, otpCode, newPassword);
  return sendResponse(res, 200, 'Password reset successful. You may now log in with your new password.');
});

export const sendOTP = asyncHandler(async (req, res, next) => {
  const { phone, mobile, email } = req.body;
  const credential = phone || mobile || email;

  if (!credential) {
    return next(new AppError('Please provide mobile number or email.', 400));
  }

  const result = await sendOTPService(credential);
  return sendResponse(res, 200, 'OTP verification code generated and sent.', {
    otpCode: result.otpCode,
    expiresAt: result.otpExpiresAt,
  });
});

/**
 * Verify Password-Reset OTP controller
 */
export const verifyPasswordResetOTP = asyncHandler(async (req, res, next) => {
  const { phone, mobile, email, otpCode } = req.body;
  const credential = email || phone || mobile;

  if (!credential || !otpCode) {
    return next(new AppError('Please provide mobile number/email and 6-digit OTP code.', 400));
  }

  const result = await verifyPasswordResetOTPService(credential, otpCode);
  return sendResponse(res, 200, result.message || 'OTP verified successfully.', { verified: true, email: result.email });
});

/**
 * Verify OTP:
 * Handles registration OTP verification (creates User and establishes authentication session)
 * or password reset verification based on explicit purpose parameter ('registration' vs 'password_reset')
 */
export const verifyOTP = asyncHandler(async (req, res, next) => {
  const { phone, mobile, email, otpCode, purpose } = req.body;
  const credential = email || phone || mobile;

  if (!credential || !otpCode) {
    return next(new AppError('Please provide mobile number/email and 6-digit OTP code.', 400));
  }

  // Explicit Purpose Handling
  if (purpose === 'password_reset') {
    const result = await verifyPasswordResetOTPService(credential, otpCode);
    return sendResponse(res, 200, result.message || 'OTP verified successfully.', { verified: true, email: result.email });
  }

  if (purpose === 'registration') {
    if (!email) {
      return next(new AppError('Registration verification requires a valid email address.', 400));
    }
    const user = await verifyRegistrationOTPService(email, otpCode);
    return await sendAuthTokenResponse(user, 201, 'Account created and verified successfully.', res);
  }

  // Fallback if purpose is omitted: Check PendingRegistration first, then existing User
  if (email) {
    try {
      const user = await verifyRegistrationOTPService(email, otpCode);
      return await sendAuthTokenResponse(user, 201, 'Account created and verified successfully.', res);
    } catch (err) {
      if (err.statusCode !== 404) {
        return next(err);
      }
      try {
        const result = await verifyPasswordResetOTPService(credential, otpCode);
        return sendResponse(res, 200, result.message || 'OTP verified successfully.', { verified: true, email: result.email });
      } catch {
        return next(err);
      }
    }
  }

  // Legacy verification path for existing user accounts
  await verifyOTPService(credential, otpCode);
  return sendResponse(res, 200, 'Account verified successfully.', { isVerified: true });
});

export const getCurrentUser = asyncHandler(async (req, res) => {
  const profile = req.user.farmerProfile || req.user.workerProfile;
  const completionPercentage = calculateProfileCompletion(req.user, profile);

  return sendResponse(res, 200, 'Authenticated user profile retrieved', {
    user: {
      ...req.user.toObject(),
      completionPercentage,
    },
  });
});

export const googleLogin = asyncHandler(async (req, res, next) => {
  const { idToken, credential, token, role } = req.body;
  const authToken = idToken || credential || token;

  if (!authToken) {
    return next(new AppError('Google authentication token is required.', 400));
  }

  const user = await googleLoginService(authToken, role);
  return await sendAuthTokenResponse(user, 200, 'Google Sign-In successful', res);
});
