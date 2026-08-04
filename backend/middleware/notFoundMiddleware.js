import { AppError } from '../utils/appError.js';

/**
 * 404 Route Not Found Middleware
 */
export const notFound = (req, res, next) => {
  next(new AppError(`Resource not found: ${req.originalUrl}`, 404));
};
