import { AppError } from './appError.js';
import { PAYMENT_ERROR_CODES } from '../constants/paymentErrorCodes.js';

/**
 * Standardized Payment Operational Error Class
 */
export class PaymentError extends AppError {
  constructor(message, statusCode = 400, code = PAYMENT_ERROR_CODES.PAYMENT_FAILED) {
    super(message, statusCode);
    this.code = code;
    this.name = 'PaymentError';
  }
}
