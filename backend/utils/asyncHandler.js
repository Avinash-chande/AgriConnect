/**
 * Async handler wrapper to catch unhandled promise rejections in Express controllers
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
