import { AppError } from '../utils/appError.js';
import { logger } from '../utils/logger.js';

const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}.`;
  return new AppError(message, 400);
};

const handleDuplicateFieldsDB = (err) => {
  const value = err.errmsg ? err.errmsg.match(/(["'])(\\?.)*?\1/)[0] : '';
  const message = `Duplicate field value: ${value}. Please use another value.`;
  return new AppError(message, 400);
};

const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors || {}).map((el) => el.message);
  const message = `Invalid input data: ${errors.join('. ')}`;
  return new AppError(message, 400);
};

const handleJWTError = () => {
  return new AppError('Invalid token. Please log in again.', 401);
};

const handleJWTExpiredError = () => {
  return new AppError('Your token has expired. Please log in again.', 401);
};

/**
 * Global Express Error Handling Middleware
 */
export const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  // Server-side Technical Log (Never sent to client)
  logger.error(
    `[ErrorHandler] ${err.statusCode} - ${err.message} - Code: ${err.code || 'N/A'} - Path: ${req.originalUrl} - Method: ${req.method} - Stack: ${err.stack}`
  );

  let error = { ...err, message: err.message, code: err.code };

  if (err.name === 'CastError') error = handleCastErrorDB(err);
  if (err.code === 11000) error = handleDuplicateFieldsDB(err);
  if (err.name === 'ValidationError') error = handleValidationErrorDB(err);
  if (err.name === 'JsonWebTokenError') error = handleJWTError();
  if (err.name === 'TokenExpiredError') error = handleJWTExpiredError();

  // Determine standardized error code if missing
  const responseCode = error.code || (error.statusCode === 403 ? 'FORBIDDEN' : 'INTERNAL_SERVER_ERROR');

  if (process.env.NODE_ENV === 'development') {
    return res.status(error.statusCode).json({
      success: false,
      message: error.message,
      code: responseCode,
      stack: error.stack,
    });
  }

  // Production Response (Zero Internal Stack Traces Exposed)
  if (error.isOperational) {
    return res.status(error.statusCode).json({
      success: false,
      message: error.message,
      code: responseCode,
    });
  }

  // Unhandled Server Errors Fallback
  return res.status(500).json({
    success: false,
    message: 'An internal server error occurred. Please try again later.',
    code: 'INTERNAL_SERVER_ERROR',
  });
};
