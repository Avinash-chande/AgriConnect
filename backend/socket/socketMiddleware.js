import { verifyToken } from '../services/jwtService.js';
import { User } from '../models/User.js';
import { logger } from '../utils/logger.js';

/**
 * Socket.IO JWT Authentication Middleware
 * Authenticates incoming socket connections via JWT token provided in auth payload, headers, or cookies.
 */
export const socketAuthMiddleware = async (socket, next) => {
  try {
    let token = null;

    // 1. Check socket.handshake.auth.token
    if (socket.handshake.auth && socket.handshake.auth.token) {
      token = socket.handshake.auth.token;
    }

    // 2. Check Authorization header
    if (!token && socket.handshake.headers && socket.handshake.headers.authorization) {
      const authHeader = socket.handshake.headers.authorization;
      if (authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
      }
    }

    // 3. Check cookies if available
    if (!token && socket.handshake.headers && socket.handshake.headers.cookie) {
      const cookies = socket.handshake.headers.cookie.split(';').reduce((acc, cookie) => {
        const [key, value] = cookie.trim().split('=');
        acc[key] = value;
        return acc;
      }, {});
      token = cookies.accessToken;
    }

    if (!token) {
      logger.warn(`🔌 Socket auth failed: No token provided (socket ID: ${socket.id})`);
      return next(new Error('Authentication failed: Token missing'));
    }

    // Verify JWT Token
    const decoded = verifyToken(token);
    if (!decoded || !decoded.id) {
      logger.warn(`🔌 Socket auth failed: Token invalid or missing ID (socket ID: ${socket.id})`);
      return next(new Error('Authentication failed: Invalid token structure'));
    }

    // Verify user exists in database
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      logger.warn(`🔌 Socket auth failed: User not found for ID ${decoded.id}`);
      return next(new Error('Authentication failed: User non-existent'));
    }

    // Attach user payload to socket instance
    socket.user = {
      id: user._id.toString(),
      _id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
    };

    logger.info(`🔌 Socket authenticated successfully: User ${user.name} (${user._id}) on socket ${socket.id}`);
    next();
  } catch (err) {
    logger.error(`🔌 Socket authentication error: ${err.message}`);
    return next(new Error(`Authentication failed: ${err.message}`));
  }
};
