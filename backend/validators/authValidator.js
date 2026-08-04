import { body } from 'express-validator';
import { validateRequest } from '../middleware/validationMiddleware.js';

export const emailValidator = body('email')
  .trim()
  .notEmpty()
  .withMessage('Email address is required')
  .isEmail()
  .withMessage('Please enter a valid email address')
  .normalizeEmail();

export const phoneValidator = body().custom((value, { req }) => {
  const phoneVal = req.body.phone || req.body.mobile;
  if (!phoneVal || phoneVal.toString().trim() === '') {
    throw new Error('Phone or mobile number is required');
  }
  if (!/^[0-9+\-\s]{8,15}$/.test(phoneVal.toString().trim())) {
    throw new Error('Phone/mobile number must be between 8 and 15 digits');
  }
  return true;
});

export const nameValidator = body().custom((value, { req }) => {
  const nameVal = req.body.name || req.body.fullName;
  if (!nameVal || nameVal.toString().trim() === '') {
    throw new Error('Full name is required');
  }
  return true;
});

export const passwordValidator = body('password')
  .notEmpty()
  .withMessage('Password is required')
  .isLength({ min: 6 })
  .withMessage('Password must be at least 6 characters long');

export const farmNameValidator = body('farmName')
  .trim()
  .notEmpty()
  .withMessage('Farm name is required')
  .isLength({ min: 2, max: 120 })
  .withMessage('Farm name must be between 2 and 120 characters');

export const locationValidator = body('location')
  .trim()
  .notEmpty()
  .withMessage('Farm or preferred working location is required');

export const skillsValidator = body('skills')
  .optional()
  .isArray()
  .withMessage('Skills must be an array');

export const otpValidator = body('otpCode')
  .trim()
  .notEmpty()
  .withMessage('OTP verification code is required')
  .isLength({ min: 6, max: 6 })
  .withMessage('OTP code must be exactly 6 digits')
  .isNumeric()
  .withMessage('OTP code must contain only numbers');

export const validateFarmerRegistration = [
  nameValidator,
  emailValidator,
  phoneValidator,
  passwordValidator,
  farmNameValidator,
  locationValidator,
  validateRequest,
];

export const validateWorkerRegistration = [
  nameValidator,
  emailValidator,
  phoneValidator,
  passwordValidator,
  locationValidator,
  skillsValidator,
  validateRequest,
];

export const validateLogin = [
  emailValidator,
  passwordValidator,
  validateRequest,
];

export const validateForgotPassword = [
  body('email').optional().isEmail().withMessage('Enter a valid email address'),
  body('mobile').optional().isLength({ min: 8 }).withMessage('Enter a valid mobile number'),
  body('phone').optional().isLength({ min: 8 }).withMessage('Enter a valid phone number'),
  validateRequest,
];

export const validateResetPassword = [
  otpValidator,
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters long'),
  validateRequest,
];

export const validateOTPVerification = [
  otpValidator,
  validateRequest,
];
