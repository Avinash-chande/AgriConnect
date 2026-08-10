import request from 'supertest';
import mongoose from 'mongoose';
import app from '../app.js';
import { User } from '../models/User.js';
import { generateAccessToken, generateRefreshToken } from '../config/jwt.js';

describe('Production Authentication & Token Lifecycle Security Suite', () => {
  let testUser;

  beforeAll(async () => {
    const mongoUri = process.env.MONGODB_TEST_URI || 'mongodb://127.0.0.1:27017/agriconnect_test_db';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }
  });

  beforeEach(async () => {
    await User.deleteMany({ email: /auth_test_/ });

    testUser = await User.create({
      name: 'Auth Security User',
      email: 'auth_test_security@agriconnect.com',
      mobile: '9876543210',
      password: 'Password123!',
      role: 'Farmer',
      isVerified: true,
    });
  });

  afterAll(async () => {
    await User.deleteMany({ email: /auth_test_/ });
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });

  describe('1. Login & Token Cookie Security', () => {
    it('should login user and return short-lived access token and set HttpOnly cookies', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'auth_test_security@agriconnect.com',
          password: 'Password123!',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.tokens.accessToken).toBeDefined();
      expect(res.body.data.tokens.refreshToken).toBeDefined();

      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies.some((c) => c.includes('accessToken'))).toBe(true);
      expect(cookies.some((c) => c.includes('refreshToken'))).toBe(true);
      expect(cookies.some((c) => c.includes('HttpOnly'))).toBe(true);
    });

    it('should reject login with incorrect credentials', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'auth_test_security@agriconnect.com',
          password: 'WrongPassword!',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Invalid email address or password');
    });
  });

  describe('2. Protected Resource Authorization', () => {
    it('should grant access to protected endpoint with valid access token', async () => {
      const token = generateAccessToken({ id: testUser._id, role: testUser.role });

      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe(testUser.email);
    });

    it('should reject access when no token is provided', async () => {
      const res = await request(app).get('/api/v1/auth/me');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Not authorized');
    });

    it('should reject access when an invalid token signature is provided', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid_tampered_token_string');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('3. Refresh Token Rotation & Reuse Detection', () => {
    it('should rotate refresh token on valid refresh request', async () => {
      const initialRefreshToken = generateRefreshToken({ id: testUser._id, role: testUser.role });
      testUser.refreshToken = initialRefreshToken;
      await testUser.save({ validateBeforeSave: false });

      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', [`refreshToken=${initialRefreshToken}`])
        .send({ refreshToken: initialRefreshToken });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const newAccessToken = res.body.data.tokens.accessToken;
      const newRefreshToken = res.body.data.tokens.refreshToken;

      expect(newAccessToken).toBeDefined();
      expect(newRefreshToken).toBeDefined();
      expect(newRefreshToken).not.toBe(initialRefreshToken);

      // Verify DB stored token updated to rotated token
      const updatedUser = await User.findById(testUser._id).select('+refreshToken');
      expect(updatedUser.refreshToken).toBe(newRefreshToken);
    });

    it('should trigger reuse detection and invalidate sessions if an old rotated refresh token is presented', async () => {
      const oldRefreshToken = generateRefreshToken({ id: testUser._id, role: testUser.role, tokenVersion: 1 });
      const currentRefreshToken = generateRefreshToken({ id: testUser._id, role: testUser.role, tokenVersion: 2 });

      // DB holds current rotated token
      testUser.refreshToken = currentRefreshToken;
      await testUser.save({ validateBeforeSave: false });

      // Attacker presents oldRefreshToken
      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: oldRefreshToken });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('reuse detected');

      // Verify that user session was revoked in DB
      const revokedUser = await User.findById(testUser._id).select('+refreshToken');
      expect(revokedUser.refreshToken).toBeNull();
    });
  });

  describe('4. Logout & Session Invalidation', () => {
    it('should clear cookies and nullify refreshToken in database on logout', async () => {
      const token = generateAccessToken({ id: testUser._id, role: testUser.role });
      const refreshToken = generateRefreshToken({ id: testUser._id, role: testUser.role });

      testUser.refreshToken = refreshToken;
      await testUser.save({ validateBeforeSave: false });

      const res = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .set('Cookie', [`accessToken=${token}`, `refreshToken=${refreshToken}`]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Check DB user refresh token cleared
      const loggedOutUser = await User.findById(testUser._id).select('+refreshToken');
      expect(loggedOutUser.refreshToken).toBeNull();
    });
  });
});
