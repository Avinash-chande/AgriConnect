import { validationResult } from 'express-validator';
import { sendResponse } from '../utils/apiResponse.js';

/**
 * Express middleware to capture express-validator results and format error response
 */
export const validateRequest = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map((err) => ({
      field: err.path || err.param,
      message: err.msg,
    }));

    return sendResponse(res, 400, 'Validation Error: Invalid input parameters', null, {
      errors: formattedErrors,
    });
  }

  next();
};
