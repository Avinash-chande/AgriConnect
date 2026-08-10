import { body, param, query } from 'express-validator';
import { validate } from '../middleware/validationMiddleware.js';
import { ADMIN_PERMISSIONS, REPORT_CATEGORY } from '../constants/index.js';

export const validateModerateJob = validate([
  param('id').isMongoId().withMessage('Invalid job ID format'),
  body('action')
    .isIn(['approve', 'pause', 'close'])
    .withMessage('Action must be one of: approve, pause, close'),
  body('reason').optional().isString().trim(),
]);

export const validateFeatureJob = validate([
  param('id').isMongoId().withMessage('Invalid job ID format'),
  body('featured').isBoolean().withMessage('Featured must be a boolean value'),
  body('durationDays').optional().isInt({ min: 1, max: 365 }).withMessage('Duration must be 1 to 365 days'),
]);

export const validateReviewTrust = validate([
  param('id').isMongoId().withMessage('Invalid trust record ID format'),
  body('status').isIn(['verified', 'rejected']).withMessage('Status must be verified or rejected'),
  body('reviewNotes').optional().isString().trim(),
]);

export const validateReviewCert = validate([
  param('id').isMongoId().withMessage('Invalid certificate ID format'),
  body('status').isIn(['approved', 'rejected']).withMessage('Status must be approved or rejected'),
  body('reviewNotes').optional().isString().trim(),
]);

export const validateReviewKyc = validate([
  param('id').isMongoId().withMessage('Invalid KYC record ID format'),
  body('status').isIn(['verified', 'failed']).withMessage('Status must be verified or failed'),
  body('reviewNotes').optional().isString().trim(),
]);

export const validateCreateReport = validate([
  body('category').isIn(Object.values(REPORT_CATEGORY)).withMessage('Invalid report category'),
  body('title').isString().trim().isLength({ min: 5, max: 200 }).withMessage('Title must be between 5 and 200 characters'),
  body('description').isString().trim().isLength({ min: 10, max: 3000 }).withMessage('Description must be between 10 and 3000 characters'),
]);

export const validateResolveReport = validate([
  param('id').isMongoId().withMessage('Invalid report ID format'),
  body('status').isIn(['resolved', 'dismissed']).withMessage('Status must be resolved or dismissed'),
  body('resolution').optional().isString().trim(),
]);

export const validateGrantPremium = validate([
  body('userId').isMongoId().withMessage('Invalid user ID format'),
  body('durationDays').optional().isInt({ min: 1, max: 365 }).withMessage('Duration must be 1 to 365 days'),
]);

export const validateCreateRole = validate([
  body('name').isString().trim().isLength({ min: 3, max: 50 }).withMessage('Role name must be 3 to 50 characters'),
  body('permissions').isArray({ min: 1 }).withMessage('Permissions must be a non-empty array'),
  body('permissions.*').isIn(Object.values(ADMIN_PERMISSIONS)).withMessage('Invalid permission value'),
]);

export const validateBroadcastNotification = validate([
  body('title').isString().trim().isLength({ min: 3, max: 200 }).withMessage('Title must be 3 to 200 characters'),
  body('message').isString().trim().isLength({ min: 5, max: 1000 }).withMessage('Message must be 5 to 1000 characters'),
]);
