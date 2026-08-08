import { body } from 'express-validator';
import { validateRequest } from '../middleware/validationMiddleware.js';

export const validateCreateOrder = [
  body('planId')
    .trim()
    .notEmpty()
    .withMessage('Plan ID is required to create a payment order'),
  body('purpose')
    .optional()
    .isString()
    .trim(),
  body('idempotencyKey')
    .optional()
    .isString()
    .trim(),
  body('notes')
    .optional()
    .isObject()
    .withMessage('Notes must be a valid key-value object'),
  validateRequest,
];

export const validateVerifyPayment = [
  body('razorpay_order_id')
    .trim()
    .notEmpty()
    .withMessage('razorpay_order_id is required'),
  body('razorpay_payment_id')
    .trim()
    .notEmpty()
    .withMessage('razorpay_payment_id is required'),
  body('razorpay_signature')
    .trim()
    .notEmpty()
    .withMessage('razorpay_signature is required'),
  validateRequest,
];
