import express from 'express';
import {
  registerFarmer,
  registerWorker,
  login,
  googleLogin,
  refreshToken,
  logout,
  forgotPassword,
  resetPassword,
  sendOTP,
  verifyOTP,
  resendRegistrationOTP,
  getCurrentUser,
} from '../controllers/authController.js';
import {
  validateFarmerRegistration,
  validateWorkerRegistration,
  validateLogin,
  validateForgotPassword,
  validateResetPassword,
  validateOTPVerification,
} from '../validators/authValidator.js';

import { authRateLimiter } from '../middleware/rateLimiter.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authRateLimiter);

router.post('/register/farmer', validateFarmerRegistration, registerFarmer);
router.post('/register/worker', validateWorkerRegistration, registerWorker);
router.post('/resend-registration-otp', resendRegistrationOTP);
router.post('/google', googleLogin);
router.post('/login', validateLogin, login);
router.post('/refresh-token', refreshToken);
router.post('/refresh', refreshToken);
router.post('/logout', protect, logout);
router.post('/forgot-password', validateForgotPassword, forgotPassword);
router.post('/reset-password', validateResetPassword, resetPassword);
router.post('/send-otp', sendOTP);
router.post('/verify-otp', validateOTPVerification, verifyOTP);
router.get('/me', protect, getCurrentUser);

export default router;
