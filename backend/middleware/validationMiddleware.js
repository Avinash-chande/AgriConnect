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

/**
 * Higher-order middleware runner taking an array of express-validator checks
 */
export const validate = (validations) => {
  return async (req, res, next) => {
    if (Array.isArray(validations)) {
      for (const validation of validations) {
        const result = await validation.run(req);
        if (result.errors && result.errors.length) break;
      }
    }
    return validateRequest(req, res, next);
  };
};
