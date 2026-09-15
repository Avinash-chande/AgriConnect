import request from 'supertest';
import mongoose from 'mongoose';
import app from '../app.js';
import { User } from '../models/User.js';
import { PendingRegistration } from '../models/PendingRegistration.js';
import { createTestFarmer } from './helpers/testAuthHelper.js';

import { connectDB } from '../config/db.js';

describe('Forgot Password & Password Reset OTP Security Suite', () => {
  const testUserEmail = 'forgotpass.testuser@authtest.com';
  const testUserPassword = 'InitialPassword123!';
  const newPassword = 'NewPassword456!';
  let existingUser;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await connectDB();
    }
    await User.deleteMany({ email: /@authtest\.com$/ });
    await PendingRegistration.deleteMany({ email: /@authtest\.com$/ });

    // Create real existing user for testing forgot password
    existingUser = await createTestFarmer({
      email: testUserEmail,
      password: testUserPassword,
      name: 'Forgot Pass Test User',
    });
  });

  afterAll(async () => {
    await User.deleteMany({ email: /@authtest\.com$/ });
    await PendingRegistration.deleteMany({ email: /@authtest\.com$/ });
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });

  describe('1. Forgot Password OTP Request & Isolation', () => {
    it('should generate password reset OTP on existing User document and NOT create PendingRegistration', async () => {
      const res = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: testUserEmail });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.otpCode).toBeDefined();

      // Check User in DB
      const userInDb = await User.findOne({ email: testUserEmail }).select('+otpCode +otpExpiresAt +otpAttempts +otpPurpose');
      expect(userInDb).toBeDefined();
      expect(userInDb.otpCode).toBeDefined();
      expect(userInDb.otpPurpose).toBe('password_reset');
      expect(userInDb.otpAttempts).toBe(0);

      // Verify PendingRegistration was NOT created
      const pendingInDb = await PendingRegistration.findOne({ email: testUserEmail });
      expect(pendingInDb).toBeNull();
    });
  });

  describe('2. Password Reset OTP Verification Error Handling', () => {
    it('should return 400 Invalid OTP when entering wrong OTP', async () => {
      const res = await request(app)
        .post('/api/v1/auth/verify-password-reset-otp')
        .send({
          email: testUserEmail,
          otpCode: '000000',
          purpose: 'password_reset',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Invalid OTP/i);
      expect(res.body.message).not.toMatch(/Registration session/i);

      // Verify attempts incremented
      const userInDb = await User.findOne({ email: testUserEmail }).select('+otpAttempts');
      expect(userInDb.otpAttempts).toBe(1);
    });

    it('should return 400 OTP expired if OTP has expired', async () => {
      // Set expiration in past
      await User.updateOne({ email: testUserEmail }, { otpExpiresAt: new Date(Date.now() - 1000) });

      const res = await request(app)
        .post('/api/v1/auth/verify-password-reset-otp')
        .send({
          email: testUserEmail,
          otpCode: '123456',
          purpose: 'password_reset',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/expired/i);
      expect(res.body.message).not.toMatch(/Registration session/i);
    });

    it('should lock out after 5 failed attempt limit (returns 429)', async () => {
      // Request fresh OTP
      const forgotRes = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: testUserEmail });

      const realOtp = forgotRes.body.data.otpCode;
      expect(realOtp).toBeDefined();

      // Submit 4 failed attempts
      for (let i = 0; i < 4; i++) {
        await request(app)
          .post('/api/v1/auth/verify-password-reset-otp')
          .send({
            email: testUserEmail,
            otpCode: '999999',
            purpose: 'password_reset',
          });
      }

      // 5th attempt with wrong OTP should trigger 429 limit lockout
      const fifthRes = await request(app)
        .post('/api/v1/auth/verify-password-reset-otp')
        .send({
          email: testUserEmail,
          otpCode: '999999',
          purpose: 'password_reset',
        });

      expect(fifthRes.status).toBe(429);
      expect(fifthRes.body.message).toMatch(/Too many failed attempts/i);

      // Verify OTP was cleared upon reaching 5 failed attempts
      const userInDb = await User.findOne({ email: testUserEmail }).select('+otpCode');
      expect(userInDb.otpCode).toBeUndefined();
    });
  });

  describe('3. Successful Password Reset & Login End-to-End', () => {
    let validOtp;

    it('should successfully verify valid password reset OTP', async () => {
      // Request fresh OTP
      const forgotRes = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: testUserEmail });

      validOtp = forgotRes.body.data.otpCode;
      expect(validOtp).toBeDefined();

      const verifyRes = await request(app)
        .post('/api/v1/auth/verify-password-reset-otp')
        .send({
          email: testUserEmail,
          otpCode: validOtp,
          purpose: 'password_reset',
        });

      expect(verifyRes.status).toBe(200);
      expect(verifyRes.body.success).toBe(true);
      expect(verifyRes.body.data.verified).toBe(true);
    });

    it('should complete password reset and allow user to log in with new password', async () => {
      const resetRes = await request(app)
        .post('/api/v1/auth/reset-password')
        .send({
          email: testUserEmail,
          otpCode: validOtp,
          newPassword: newPassword,
        });

      expect(resetRes.status).toBe(200);
      expect(resetRes.body.success).toBe(true);

      // Try login with old password - MUST FAIL
      const oldLogin = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUserEmail,
          password: testUserPassword,
        });

      expect(oldLogin.status).toBe(401);

      // Try login with new password - MUST SUCCEED
      const newLogin = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUserEmail,
          password: newPassword,
        });

      expect(newLogin.status).toBe(200);
      expect(newLogin.body.success).toBe(true);
      expect(newLogin.body.data.tokens.accessToken).toBeDefined();
    });
  });
});
