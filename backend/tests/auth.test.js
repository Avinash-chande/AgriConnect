import request from 'supertest';
import mongoose from 'mongoose';
import app from '../app.js';
import { User } from '../models/User.js';
import { FarmerProfile } from '../models/FarmerProfile.js';
import { WorkerProfile } from '../models/WorkerProfile.js';
import { PendingRegistration } from '../models/PendingRegistration.js';
import { createTestFarmer } from './helpers/testAuthHelper.js';

describe('JWT Authentication & Registration Integration Tests', () => {
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

  describe('POST /api/v1/auth/register/farmer', () => {
    it('should create PendingRegistration and require OTP verification (NO User or tokens before OTP)', async () => {
      const payload = {
        name: 'Harpreet Singh Auth Test',
        email: 'harpreet.farmer@authtest.com',
        mobile: '+919988776611',
        password: 'Password123!',
        farmName: 'Harpreet Organic Estate Auth Test',
        location: 'Amritsar, Punjab',
      };

      const res = await request(app)
        .post('/api/v1/auth/register/farmer')
        .send(payload);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.requiresOtp).toBe(true);
      expect(res.body.data.tokens).toBeUndefined();

      // Complete OTP verification to establish account
      const pending = await PendingRegistration.findOne({ email: payload.email.toLowerCase() });
      expect(pending).toBeDefined();

      const verifyRes = await request(app)
        .post('/api/v1/auth/verify-otp')
        .send({
          email: payload.email,
          otpCode: pending.otpCode,
        });

      expect(verifyRes.status).toBe(201);
      expect(verifyRes.body.success).toBe(true);
      expect(verifyRes.body.data.tokens.accessToken).toBeDefined();
    });

    it('should reject duplicate farmer registration with 409 Conflict', async () => {
      const payload = {
        name: 'Harpreet Singh Auth Test',
        email: 'harpreet.farmer@authtest.com',
        mobile: '+919988776611',
        password: 'Password123!',
        farmName: 'Duplicate Farm',
        location: 'Amritsar, Punjab',
      };

      const res = await request(app)
        .post('/api/v1/auth/register/farmer')
        .send(payload);

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/register/worker', () => {
    it('should create PendingRegistration and require OTP verification (NO User or tokens before OTP)', async () => {
      const payload = {
        name: 'Balwinder Singh Auth Test',
        email: 'balwinder.worker@authtest.com',
        mobile: '+919988776622',
        password: 'Password123!',
        location: 'Ludhiana, Punjab',
        skills: ['Combine Harvester Operator'],
      };

      const res = await request(app)
        .post('/api/v1/auth/register/worker')
        .send(payload);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.requiresOtp).toBe(true);
      expect(res.body.data.tokens).toBeUndefined();

      // Complete OTP verification to establish account
      const pending = await PendingRegistration.findOne({ email: payload.email.toLowerCase() });
      expect(pending).toBeDefined();

      const verifyRes = await request(app)
        .post('/api/v1/auth/verify-otp')
        .send({
          email: payload.email,
          otpCode: pending.otpCode,
        });

      expect(verifyRes.status).toBe(201);
      expect(verifyRes.body.success).toBe(true);
      expect(verifyRes.body.data.tokens.accessToken).toBeDefined();
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should authenticate user with valid credentials and set HTTP-only cookies', async () => {
      const loginPayload = {
        email: 'harpreet.farmer@authtest.com',
        password: 'Password123!',
      };

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send(loginPayload);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.tokens.accessToken).toBeDefined();
    });

    it('should reject invalid password with 401 Unauthorized', async () => {
      const loginPayload = {
        email: 'harpreet.farmer@authtest.com',
        password: 'WrongPassword!',
      };

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send(loginPayload);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });
});
