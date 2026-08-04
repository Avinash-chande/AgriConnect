import jwt from 'jsonwebtoken';
import {
  jwtConfig,
  accessTokenCookieOptions,
  refreshTokenCookieOptions,
} from '../config/jwt.js';

/**
 * Sign JWT Access Token
 */
export const signAccessToken = (payload) => {
  const sanitizedPayload = typeof payload === 'object' && payload.id
    ? { ...payload, id: payload.id.toString() }
    : payload;
  return jwt.sign(sanitizedPayload, jwtConfig.accessSecret, {
    expiresIn: jwtConfig.accessExpiresIn,
  });
};

/**
 * Sign JWT Refresh Token
 */
export const signRefreshToken = (payload) => {
  const sanitizedPayload = typeof payload === 'object' && payload.id
    ? { ...payload, id: payload.id.toString() }
    : payload;
  return jwt.sign(sanitizedPayload, jwtConfig.refreshSecret, {
    expiresIn: jwtConfig.refreshExpiresIn,
  });
};

/**
 * Verify JWT Token
 */
export const verifyToken = (token, isRefresh = false) => {
  const secret = isRefresh ? jwtConfig.refreshSecret : jwtConfig.accessSecret;
  return jwt.verify(token, secret);
};

/**
 * Attach JWT Tokens to HTTP-only cookies and return token object
 */
export const setAuthCookies = (res, user) => {
  const userId = user._id ? user._id.toString() : user.id;
  const payload = { id: userId, role: user.role, email: user.email };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  res.cookie('accessToken', accessToken, accessTokenCookieOptions);
  res.cookie('refreshToken', refreshToken, refreshTokenCookieOptions);

  return { accessToken, refreshToken };
};

/**
 * Clear JWT HTTP-only cookies
 */
export const clearAuthCookies = (res) => {
  res.clearCookie('accessToken');
  res.clearCookie('refreshToken');
};
