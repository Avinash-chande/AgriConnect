import { body, param, query } from 'express-validator';
import { validateRequest } from '../middleware/validationMiddleware.js';
import { APPLICATION_STATUS } from '../constants/index.js';

/**
 * Custom Validator: Ensure Mongo ID format
 */
const isValidMongoId = (val) => {
  return /^[0-9a-fA-F]{24}$/.test(val);
};

/**
 * Custom Validator: Ensure Date is today or in the future
 */
const isPresentOrFutureDate = (val) => {
  if (!val) return true;
  const date = new Date(val);
  if (isNaN(date.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date >= today;
};

/**
 * Express Validator Chain for Applying to a Job Posting
 */
export const validateApplyJobInput = [
  param('id')
    .optional()
    .custom(isValidMongoId)
    .withMessage('Invalid Job Mongo ID parameter'),

  param('jobId')
    .optional()
    .custom(isValidMongoId)
    .withMessage('Invalid Job Mongo ID parameter'),

  body('coverLetter')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Cover letter text cannot exceed 2000 characters'),

  body('expectedJoiningDate')
    .optional()
    .isISO8601()
    .withMessage('Expected joining date must be a valid ISO date')
    .custom(isPresentOrFutureDate)
    .withMessage('Expected joining date must be today or a future date'),

  body('expectedDailyWage')
    .optional()
    .isNumeric()
    .withMessage('Expected daily wage must be a valid number')
    .custom((val) => Number(val) > 0 && Number(val) <= 100000)
    .withMessage('Expected daily wage must be a positive number up to ₹1,00,000/day'),

  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Notes cannot exceed 1000 characters'),

  validateRequest,
];

/**
 * Express Validator Chain for Application Query Parameters
 */
export const validateApplicationQuery = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('status')
    .optional()
    .custom((val) => val === 'ALL' || Object.values(APPLICATION_STATUS).includes(val))
    .withMessage(`Status must be ALL or one of: ${Object.values(APPLICATION_STATUS).join(', ')}`),
  query('sort')
    .optional()
    .isIn(['newest', 'oldest', 'createdAt_desc', 'createdAt_asc'])
    .withMessage('Sort option must be one of: newest, oldest, createdAt_desc, createdAt_asc'),
  query('search')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Search query string cannot exceed 100 characters'),
  query('jobId')
    .optional()
    .custom(isValidMongoId)
    .withMessage('Invalid Job Mongo ID parameter'),
  validateRequest,
];

/**
 * Express Validator Chain for Withdrawing an Application
 */
export const validateWithdrawApplicationInput = [
  param('id')
    .optional()
    .custom(isValidMongoId)
    .withMessage('Invalid Application Mongo ID parameter'),
  param('applicationId')
    .optional()
    .custom(isValidMongoId)
    .withMessage('Invalid Application Mongo ID parameter'),
  validateRequest,
];

/**
 * Express Validator Chain for Accepting an Application
 */
export const validateAcceptApplicationInput = [
  param('id')
    .optional()
    .custom(isValidMongoId)
    .withMessage('Invalid Application Mongo ID parameter'),
  param('applicationId')
    .optional()
    .custom(isValidMongoId)
    .withMessage('Invalid Application Mongo ID parameter'),
  body('farmerFeedback')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Farmer feedback cannot exceed 1000 characters'),
  body('rejectOthers')
    .optional()
    .isBoolean()
    .withMessage('rejectOthers must be a boolean flag'),
  body('rejectionFeedback')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Rejection feedback text cannot exceed 1000 characters'),
  validateRequest,
];

/**
 * Express Validator Chain for Rejecting an Application
 */
export const validateRejectApplicationInput = [
  param('id')
    .optional()
    .custom(isValidMongoId)
    .withMessage('Invalid Application Mongo ID parameter'),
  param('applicationId')
    .optional()
    .custom(isValidMongoId)
    .withMessage('Invalid Application Mongo ID parameter'),
  body('reason')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Rejection reason cannot exceed 1000 characters'),
  body('farmerFeedback')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Farmer feedback cannot exceed 1000 characters'),
  validateRequest,
];

/**
 * Express Validator Chain for Shortlisting an Application
 */
export const validateShortlistApplicationInput = [
  param('id')
    .optional()
    .custom(isValidMongoId)
    .withMessage('Invalid Application Mongo ID parameter'),
  param('applicationId')
    .optional()
    .custom(isValidMongoId)
    .withMessage('Invalid Application Mongo ID parameter'),
  validateRequest,
];

/**
 * Express Validator Chain for Cancelling a Hiring
 */
export const validateCancelHiringInput = [
  param('id')
    .optional()
    .custom(isValidMongoId)
    .withMessage('Invalid Application Mongo ID parameter'),
  param('applicationId')
    .optional()
    .custom(isValidMongoId)
    .withMessage('Invalid Application Mongo ID parameter'),
  body('reason')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Cancellation reason cannot exceed 1000 characters'),
  body('cancellationReason')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Cancellation reason cannot exceed 1000 characters'),
  validateRequest,
];
