import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { Subscription } from '../models/Subscription.js';
import { requirePremiumAccess, requirePremium } from '../middleware/premiumMiddleware.js';
import { errorHandler } from '../middleware/errorMiddleware.js';
import { jwtConfig } from '../config/jwt.js';
import jwt from 'jsonwebtoken';

describe('Premium Authorization Middleware Integration Suite', () => {
  let app;
  let activeToken;
  let cancelledToken;
  let expiredToken;
  let graceToken;
  let freeToken;
  let activeUserId;
  let cancelledUserId;
  let expiredUserId;
  let graceUserId;
  let freeUserId;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(
        process.env.MONGODB_TEST_URI || 'mongodb://127.0.0.1:27017/agriconnect_test_db'
      );
    }

    // Dummy Express App setup with middleware routes
    app = express();
    app.use(express.json());

    // Mock Authentication Middleware
    app.use((req, res, next) => {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        try {
          const decoded = jwt.verify(token, jwtConfig.accessSecret);
          req.user = { _id: decoded.id, role: decoded.role };
        } catch {}
      }
      next();
    });

    // Test Routes
    app.get('/api/test/premium-any', requirePremiumAccess(), (req, res) => {
      res.json({ success: true, message: 'Welcome to Premium' });
    });

    app.get('/api/test/premium-yearly', requirePremiumAccess(['farmer_pro_yearly']), (req, res) => {
      res.json({ success: true, message: 'Welcome to Premium Yearly' });
    });

    app.use(errorHandler);

    // 1. Active User
    const activeU = await User.create({
      name: 'Auth Active User',
      email: `auth_active_${Date.now()}@agriconnect.com`,
      mobile: `+9198${Math.floor(10000000 + Math.random() * 90000000)}`,
      password: 'password123',
      role: 'Farmer',
    });
    activeUserId = activeU._id;
    activeToken = jwt.sign({ id: activeU._id, role: activeU.role }, jwtConfig.accessSecret, { expiresIn: '1h' });
    await Subscription.create({
      user: activeUserId,
      plan: 'farmer_pro_monthly',
      status: 'active',
      startDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000),
    });

    // 2. Cancelled User (within paid period)
    const cancelledU = await User.create({
      name: 'Auth Cancelled User',
      email: `auth_canc_${Date.now()}@agriconnect.com`,
      mobile: `+9198${Math.floor(10000000 + Math.random() * 90000000)}`,
      password: 'password123',
      role: 'Farmer',
    });
    cancelledUserId = cancelledU._id;
    cancelledToken = jwt.sign({ id: cancelledU._id, role: cancelledU.role }, jwtConfig.accessSecret, { expiresIn: '1h' });
    await Subscription.create({
      user: cancelledUserId,
      plan: 'farmer_pro_monthly',
      status: 'cancelled',
      startDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
      cancelledAt: new Date(),
    });

    // 3. Grace Period User (expired 1 day ago, within 3-day grace window)
    const graceU = await User.create({
      name: 'Auth Grace User',
      email: `auth_grace_${Date.now()}@agriconnect.com`,
      mobile: `+9198${Math.floor(10000000 + Math.random() * 90000000)}`,
      password: 'password123',
      role: 'Farmer',
    });
    graceUserId = graceU._id;
    graceToken = jwt.sign({ id: graceU._id, role: graceU.role }, jwtConfig.accessSecret, { expiresIn: '1h' });
    await Subscription.create({
      user: graceUserId,
      plan: 'farmer_pro_monthly',
      status: 'active',
      startDate: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    });

    // 4. Expired User (expired 10 days ago, past grace window)
    const expiredU = await User.create({
      name: 'Auth Expired User',
      email: `auth_exp_${Date.now()}@agriconnect.com`,
      mobile: `+9198${Math.floor(10000000 + Math.random() * 90000000)}`,
      password: 'password123',
      role: 'Farmer',
    });
    expiredUserId = expiredU._id;
    expiredToken = jwt.sign({ id: expiredU._id, role: expiredU.role }, jwtConfig.accessSecret, { expiresIn: '1h' });
    await Subscription.create({
      user: expiredUserId,
      plan: 'farmer_pro_monthly',
      status: 'active',
      startDate: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    });

    // 5. Free User (No subscription)
    const freeU = await User.create({
      name: 'Auth Free User',
      email: `auth_free_${Date.now()}@agriconnect.com`,
      mobile: `+9198${Math.floor(10000000 + Math.random() * 90000000)}`,
      password: 'password123',
      role: 'Worker',
    });
    freeUserId = freeU._id;
    freeToken = jwt.sign({ id: freeU._id, role: freeU.role }, jwtConfig.accessSecret, { expiresIn: '1h' });
  });

  afterAll(async () => {
    if (activeUserId) await User.findByIdAndDelete(activeUserId);
    if (cancelledUserId) await User.findByIdAndDelete(cancelledUserId);
    if (graceUserId) await User.findByIdAndDelete(graceUserId);
    if (expiredUserId) await User.findByIdAndDelete(expiredUserId);
    if (freeUserId) await User.findByIdAndDelete(freeUserId);
    await Subscription.deleteMany({});
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });

  it('should return 401 UNAUTHORIZED when no auth header is supplied', async () => {
    const res = await request(app).get('/api/test/premium-any');
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('UNAUTHORIZED');
  });

  it('should return 403 PREMIUM_REQUIRED for free user without subscription', async () => {
    const res = await request(app)
      .get('/api/test/premium-any')
      .set('Authorization', `Bearer ${freeToken}`);

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('PREMIUM_REQUIRED');
  });

  it('should grant access to active premium subscription user', async () => {
    const res = await request(app)
      .get('/api/test/premium-any')
      .set('Authorization', `Bearer ${activeToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('should grant access to cancelled user if still within paid period', async () => {
    const res = await request(app)
      .get('/api/test/premium-any')
      .set('Authorization', `Bearer ${cancelledToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('should grant access during 3-day grace period with X-Subscription-Grace-Period header', async () => {
    const res = await request(app)
      .get('/api/test/premium-any')
      .set('Authorization', `Bearer ${graceToken}`);

    expect(res.status).toBe(200);
    expect(res.headers['x-subscription-grace-period']).toBe('true');
  });

  it('should reject expired user past grace window with 403 SUBSCRIPTION_EXPIRED', async () => {
    const res = await request(app)
      .get('/api/test/premium-any')
      .set('Authorization', `Bearer ${expiredToken}`);

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('SUBSCRIPTION_EXPIRED');

    // Check DB status was lazily updated to expired
    const sub = await Subscription.findOne({ user: expiredUserId });
    expect(sub.status).toBe('expired');
  });

  it('should reject monthly user from yearly-restricted route with 403 PLAN_INSUFFICIENT', async () => {
    const res = await request(app)
      .get('/api/test/premium-yearly')
      .set('Authorization', `Bearer ${activeToken}`);

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('PLAN_INSUFFICIENT');
  });
});
