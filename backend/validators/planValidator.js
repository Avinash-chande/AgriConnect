import { query, param, body } from 'express-validator';
import { validateRequest } from '../middleware/validationMiddleware.js';

export const validateGetPlans = [
  query('role')
    .optional()
    .isIn(['farmer', 'worker', 'all', 'Farmer', 'Worker', 'Admin'])
    .withMessage('Role filter must be farmer, worker, or all'),
  validateRequest,
];

export const validatePlanId = [
  param('planId')
    .trim()
    .notEmpty()
    .withMessage('Plan ID parameter is required')
    .isSlug()
    .withMessage('Plan ID must be a valid slug format (e.g. farmer_pro_monthly)'),
  validateRequest,
];

export const validateUpsertPlan = [
  body('planId')
    .trim()
    .notEmpty()
    .withMessage('Plan ID is required')
    .isSlug()
    .withMessage('Plan ID must be a valid slug'),
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Plan name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('price')
    .isFloat({ min: 0 })
    .withMessage('Price must be a non-negative number'),
  body('currency')
    .optional()
    .isString()
    .isLength({ min: 3, max: 3 })
    .withMessage('Currency code must be 3 letters (e.g., INR)'),
  body('billingPeriod')
    .isIn(['monthly', 'yearly', 'lifetime', 'one_time'])
    .withMessage('Billing period must be monthly, yearly, lifetime, or one_time'),
  body('targetRole')
    .optional()
    .isIn(['farmer', 'worker', 'all'])
    .withMessage('Target role must be farmer, worker, or all'),
  body('features')
    .optional()
    .isArray()
    .withMessage('Features must be an array of feature strings'),
  validateRequest,
];
