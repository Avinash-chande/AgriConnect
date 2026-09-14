import request from 'supertest';
import mongoose from 'mongoose';
import app from '../app.js';
import { User } from '../models/User.js';
import { FarmerProfile } from '../models/FarmerProfile.js';
import { WorkerProfile } from '../models/WorkerProfile.js';
import { PendingRegistration } from '../models/PendingRegistration.js';
import { createTestFarmer } from './helpers/testAuthHelper.js';

describe('OTP-Gated Registration Security Suite', () => {
  beforeAll(async () => {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/agriconnect_test_db';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }
    await User.deleteMany({ email: /@authtest\.com$/ });
    await PendingRegistration.deleteMany({ email: /@authtest\.com$/ });
    await FarmerProfile.deleteMany({});
    await WorkerProfile.deleteMany({});
  });

  afterAll(async () => {
    await User.deleteMany({ email: /@authtest\.com$/ });
    await PendingRegistration.deleteMany({ email: /@authtest\.com$/ });
    await FarmerProfile.deleteMany({});
    await WorkerProfile.deleteMany({});
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });

  describe('TEST A: Farmer registration without OTP', () => {
    const farmerPayload = {
      name: 'Harpreet Singh Auth Test',
      email: 'harpreet.farmer@authtest.com',
      mobile: '+919988776611',
      password: 'Password123!',
      farmName: 'Harpreet Organic Estate Auth Test',
      location: 'Amritsar, Punjab',
    };

    it('should create PendingRegistration only; NO User, NO FarmerProfile, NO tokens, NO cookies', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register/farmer')
        .send(farmerPayload);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.requiresOtp).toBe(true);
      expect(res.body.data.email).toBe(farmerPayload.email.toLowerCase());

      // Absolute Invariant Check: NO User document
      const userInDb = await User.findOne({ email: farmerPayload.email.toLowerCase() });
      expect(userInDb).toBeNull();

      // NO FarmerProfile
      const profileInDb = await FarmerProfile.findOne({ farmName: farmerPayload.farmName });
      expect(profileInDb).toBeNull();

      // NO auth tokens in response
      expect(res.body.data.tokens).toBeUndefined();

      // PendingRegistration MUST exist
      const pendingInDb = await PendingRegistration.findOne({ email: farmerPayload.email.toLowerCase() });
      expect(pendingInDb).toBeDefined();
      expect(pendingInDb.otpCode).toBeDefined();
      expect(pendingInDb.otpExpiresAt).toBeDefined();
      expect(pendingInDb.otpAttempts).toBe(0);
    });
  });

  describe('TEST B: Worker registration without OTP', () => {
    const workerPayload = {
      name: 'Balwinder Singh Auth Test',
      email: 'balwinder.worker@authtest.com',
      mobile: '+919988776622',
      password: 'Password123!',
      location: 'Ludhiana, Punjab',
      skills: ['Combine Harvester Operator'],
    };

    it('should create PendingRegistration only; NO User, NO WorkerProfile, NO tokens', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register/worker')
        .send(workerPayload);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.requiresOtp).toBe(true);

      const userInDb = await User.findOne({ email: workerPayload.email.toLowerCase() });
      expect(userInDb).toBeNull();

      const profileInDb = await WorkerProfile.findOne({});
      expect(profileInDb).toBeNull();

      const pendingInDb = await PendingRegistration.findOne({ email: workerPayload.email.toLowerCase() });
      expect(pendingInDb).toBeDefined();
    });
  });

  describe('TEST C: Wrong OTP', () => {
    it('should reject with 400 Invalid OTP and increment otpAttempts', async () => {
      const res = await request(app)
        .post('/api/v1/auth/verify-otp')
        .send({
          email: 'harpreet.farmer@authtest.com',
          otpCode: '000000',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);

      const pending = await PendingRegistration.findOne({ email: 'harpreet.farmer@authtest.com' });
      expect(pending).toBeDefined();
      expect(pending.otpAttempts).toBe(1);

      // User still must not exist
      const user = await User.findOne({ email: 'harpreet.farmer@authtest.com' });
      expect(user).toBeNull();
    });
  });

  describe('TEST D: Five failed OTP attempts', () => {
    it('should lock out, delete PendingRegistration, and return 429', async () => {
      const email = 'balwinder.worker@authtest.com';

      // Attempts 1 to 4
      for (let i = 0; i < 4; i++) {
        await request(app)
          .post('/api/v1/auth/verify-otp')
          .send({ email, otpCode: '111111' });
      }

      // Attempt 5
      const res5 = await request(app)
        .post('/api/v1/auth/verify-otp')
        .send({ email, otpCode: '111111' });

      expect(res5.status).toBe(429);
      expect(res5.body.message).toMatch(/too many failed attempts/i);

      // PendingRegistration must be deleted
      const pending = await PendingRegistration.findOne({ email });
      expect(pending).toBeNull();

      // User still must not exist
      const user = await User.findOne({ email });
      expect(user).toBeNull();
    });
  });

  describe('TEST E: Expired OTP', () => {
    it('should reject expired OTP with 400 and not create an account', async () => {
      // Create pending with expired date
      await PendingRegistration.findOneAndUpdate(
        { email: 'harpreet.farmer@authtest.com' },
        { otpExpiresAt: new Date(Date.now() - 60000) }
      );

      const pending = await PendingRegistration.findOne({ email: 'harpreet.farmer@authtest.com' });

      const res = await request(app)
        .post('/api/v1/auth/verify-otp')
        .send({
          email: 'harpreet.farmer@authtest.com',
          otpCode: pending.otpCode,
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/expired/i);

      const user = await User.findOne({ email: 'harpreet.farmer@authtest.com' });
      expect(user).toBeNull();
    });
  });

  describe('TEST F: Correct OTP Verification', () => {
    it('should create User, create FarmerProfile, delete PendingRegistration, and return JWT tokens', async () => {
      // Re-register or refresh OTP to get a valid code
      await request(app)
        .post('/api/v1/auth/resend-registration-otp')
        .send({ email: 'harpreet.farmer@authtest.com' });

      const pending = await PendingRegistration.findOne({ email: 'harpreet.farmer@authtest.com' });
      expect(pending).toBeDefined();
      const validOtp = pending.otpCode;

      const res = await request(app)
        .post('/api/v1/auth/verify-otp')
        .send({
          email: 'harpreet.farmer@authtest.com',
          otpCode: validOtp,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.tokens.accessToken).toBeDefined();
      expect(res.body.data.user).toBeDefined();
      expect(res.body.data.user.isVerified).toBe(true);

      // Verify in DB
      const userInDb = await User.findOne({ email: 'harpreet.farmer@authtest.com' });
      expect(userInDb).toBeDefined();
      expect(userInDb.isVerified).toBe(true);
      expect(userInDb.emailVerifiedAt).toBeDefined();

      // Verify FarmerProfile created
      const profileInDb = await FarmerProfile.findOne({ owner: userInDb._id });
      expect(profileInDb).toBeDefined();

      // Verify PendingRegistration deleted
      const pendingAfter = await PendingRegistration.findOne({ email: 'harpreet.farmer@authtest.com' });
      expect(pendingAfter).toBeNull();

      // Verify login works with password (proves no double-hashing!)
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'harpreet.farmer@authtest.com',
          password: 'Password123!',
        });
      expect(loginRes.status).toBe(200);
      expect(loginRes.body.success).toBe(true);
      expect(loginRes.body.data.tokens.accessToken).toBeDefined();
    });
  });

  describe('TEST G: Reuse OTP', () => {
    it('should reject reused OTP because account is already created and verified', async () => {
      const res = await request(app)
        .post('/api/v1/auth/verify-otp')
        .send({
          email: 'harpreet.farmer@authtest.com',
          otpCode: '123456',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/already been verified/i);

      // Verify no duplicate User exists
      const userCount = await User.countDocuments({ email: 'harpreet.farmer@authtest.com' });
      expect(userCount).toBe(1);

      // Verify no duplicate Profile exists
      const profileCount = await FarmerProfile.countDocuments({});
      expect(profileCount).toBe(1);
    });
  });

  describe('TEST H: Duplicate Registration', () => {
    it('should reject registration of already-verified email with 409', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register/farmer')
        .send({
          name: 'Harpreet Duplicate',
          email: 'harpreet.farmer@authtest.com',
          mobile: '+919988776699',
          password: 'Password123!',
          farmName: 'Another Farm',
          location: 'Amritsar, Punjab',
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });
  });

  describe('TEST J: Login Unverified Account', () => {
    it('should reject login for unverified user (isVerified = false) with 403', async () => {
      const unverifiedUser = new User({
        name: 'Unverified Test',
        email: 'unverified@authtest.com',
        mobile: '+919988112233',
        password: 'Password123!',
        role: 'Farmer',
        isVerified: false,
      });
      await unverifiedUser.save();

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'unverified@authtest.com',
          password: 'Password123!',
        });

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/not verified/i);
    });
  });
});
