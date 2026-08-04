/**
 * NoSQL Injection Protection Middleware
 * Recursively sanitizes request body, query parameters, and route parameters
 * by stripping MongoDB operators (e.g. $gt, $ne, $where, $regex) starting with '$'.
 */

const sanitize = (obj) => {
  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      sanitize(obj[i]);
    }
  } else if (obj !== null && typeof obj === 'object') {
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        if (key.startsWith('$')) {
          delete obj[key];
        } else {
          sanitize(obj[key]);
        }
      }
    }
  }
  return obj;
};

export const sanitizeNoSQL = (req, res, next) => {
  if (req.body) sanitize(req.body);
  if (req.query) sanitize(req.query);
  if (req.params) sanitize(req.params);
  next();
};
