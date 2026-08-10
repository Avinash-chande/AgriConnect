import jwt from 'jsonwebtoken';

export const jwtConfig = {
  get accessSecret() {
    return process.env.JWT_ACCESS_SECRET || 'agriconnect_secret_key_access_2026_dev';
  },
  get accessExpiresIn() {
    return process.env.JWT_ACCESS_EXPIRES_IN || '15m';
  },
  get refreshSecret() {
    return process.env.JWT_REFRESH_SECRET || 'agriconnect_secret_key_refresh_2026_dev';
  },
  get refreshExpiresIn() {
    return process.env.JWT_REFRESH_EXPIRES_IN || '7d';
  },
};

/**
 * Generate Access Token
 */
export const generateAccessToken = (payload) => {
  return jwt.sign(payload, jwtConfig.accessSecret, {
    expiresIn: jwtConfig.accessExpiresIn,
  });
};

/**
 * Generate Refresh Token
 */
export const generateRefreshToken = (payload) => {
  return jwt.sign(payload, jwtConfig.refreshSecret, {
    expiresIn: jwtConfig.refreshExpiresIn,
  });
};

/**
 * Production Cookie Options for Short-Lived Access Token
 */
export const accessTokenCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
  maxAge: 15 * 60 * 1000, // 15 minutes
  path: '/',
};

/**
 * Production Cookie Options for Secure Refresh Token
 */
export const refreshTokenCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: '/',
};
