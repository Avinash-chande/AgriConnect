import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { AppError } from '../utils/appError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { jwtConfig } from '../config/jwt.js';

/**
 * Protect routes: Verify JWT access token from Authorization header or HTTP-only cookie
 */
export const protect = asyncHandler(async (req, res, next) => {
  let token;

  // 1. Check for Bearer Token in Authorization header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  // 2. Fallback to HTTP-only cookie
  else if (req.cookies && req.cookies.accessToken) {
    token = req.cookies.accessToken;
  }

  if (!token) {
    return next(new AppError('Not authorized. Please log in to access this resource.', 401));
  }
  try {
    // 3. Verify JWT Access Token
    const decoded = jwt.verify(token, jwtConfig.accessSecret);
    const userId = decoded.id || decoded._id;

    // 4. Find user by ID and attach to request
    const currentUser = await User.findOne({ _id: userId, isDeleted: { $ne: true } });

    if (!currentUser) {
      return next(new AppError('The user belonging to this token no longer exists.', 401));
    }

    req.user = currentUser;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return next(new AppError('Access token expired. Please refresh your session.', 401));
    }
    return next(new AppError('Invalid authentication token.', 401));
  }
});

/**
 * Optional Auth Middleware: Attaches req.user if authenticated, or a guest user object if unauthenticated/token invalid
 */
const GUEST_USER_ID = '000000000000000000000000';

export const protectOrGuest = asyncHandler(async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.accessToken) {
    token = req.cookies.accessToken;
  }

  if (!token) {
    req.user = { _id: GUEST_USER_ID, role: 'guest', fullName: 'Guest Visitor' };
    return next();
  }

  try {
    const decoded = jwt.verify(token, jwtConfig.accessSecret);
    const userId = decoded.id || decoded._id;
    const currentUser = await User.findOne({ _id: userId, isDeleted: { $ne: true } });
    req.user = currentUser || { _id: GUEST_USER_ID, role: 'guest', fullName: 'Guest Visitor' };
    next();
  } catch (error) {
    req.user = { _id: GUEST_USER_ID, role: 'guest', fullName: 'Guest Visitor' };
    next();
  }
});

/**
 * Authorize roles middleware
 */
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.map(r => r.toLowerCase()).includes(req.user.role.toLowerCase())) {
      return next(
        new AppError(`User role '${req.user?.role}' is not authorized to perform this action.`, 403)
      );
    }
    next();
  };
};
