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
  loginUserService,
  refreshTokenService,
  logoutUserService,
  forgotPasswordService,
  resetPasswordService,
  sendOTPService,
  verifyOTPService,
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

export const registerFarmer = asyncHandler(async (req, res, next) => {
  const { fullName, name, email, phone, mobile, password, farmName, location } = req.body;
  if ((!fullName && !name) || !email || (!phone && !mobile) || !password || !farmName || !location) {
    return next(new AppError('Please provide required fields: name/fullName, email, mobile/phone, password, farmName, location', 400));
  }

  const user = await registerFarmerService(req.body);
  return await sendAuthTokenResponse(user, 201, 'Farmer registered successfully', res);
});

export const registerWorker = asyncHandler(async (req, res, next) => {
  const { fullName, name, email, phone, mobile, password, location } = req.body;
  if ((!fullName && !name) || !email || (!phone && !mobile) || !password || !location) {
    return next(new AppError('Please provide required fields: name/fullName, email, mobile/phone, password, location', 400));
  }

  const user = await registerWorkerService(req.body);
  return await sendAuthTokenResponse(user, 201, 'Worker registered successfully', res);
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

export const verifyOTP = asyncHandler(async (req, res, next) => {
  const { phone, mobile, email, otpCode } = req.body;
  const credential = phone || mobile || email;

  if (!credential || !otpCode) {
    return next(new AppError('Please provide mobile number/email and 6-digit OTP code.', 400));
  }

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