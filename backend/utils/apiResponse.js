/**
 * Standardized API Response helper
 */
export const sendResponse = (res, statusCode, message, data = null, meta = null) => {
  return res.status(statusCode).json({
    success: statusCode >= 200 && statusCode < 300,
    message,
    ...(data !== null && { data }),
    ...(meta !== null && { meta }),
  });
};
