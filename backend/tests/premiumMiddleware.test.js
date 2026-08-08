import request from 'supertest';
import mongoose from 'mongoose';
import app from '../app.js';
import { User } from '../models/User.js';
import { Subscription } from '../models/Subscription.js';
import { jwtConfig } from '../config/jwt.js';
import jwt from 'jsonwebtoken';

describe('Premium Membership & Middleware Test Suite', () => {
  let freeUserToken;
  let activePremiumUserToken;
  let expiredUserToken;
  let freeUserId;
  let activeUserId;
  let expiredUserId;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(
        process.env.MONGODB_TEST_URI || 'mongodb://127.0.0.1:27017/agriconnect_test_db'
      );
    }

    // 1. Free User
    const freeU = await User.create({
      name: 'Free User',
      email: `free_${Date.now()}@agriconnect.com`,
      mobile: `+9198${Math.floor(10000000 + Math.random() * 90000000)}`,
      password: 'password123',
      role: 'Farmer',
      isPremium: false,
      subscriptionStatus: 'none',
    });
    freeUserId = freeU._id;
    freeUserToken = jwt.sign({ id: freeU._id, role: freeU.role }, jwtConfig.accessSecret, {
      expiresIn: '1h',
    });

    // 2. Active Premium User
    const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const activeU = await User.create({
      name: 'Active Premium User',
      email: `active_${Date.now()}@agriconnect.com`,
      mobile: `+9198${Math.floor(10000000 + Math.random() * 90000000)}`,
      password: 'password123',
      role: 'Farmer',
      isPremium: true,
      subscriptionPlan: 'farmer_pro_monthly',
      subscriptionExpiresAt: futureDate,
      subscriptionStatus: 'active',
    });
    activeUserId = activeU._id;
    activePremiumUserToken = jwt.sign(
      { id: activeU._id, role: activeU.role },
      jwtConfig.accessSecret,
      { expiresIn: '1h' }
    );

    await Subscription.create({
      user: activeUserId,
      plan: 'farmer_pro_monthly',
      status: 'active',
      startDate: new Date(),
      endDate: futureDate,
      autoRenew: true,
    });

    // 3. Expired Premium User
    const pastDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
    const expiredU = await User.create({
      name: 'Expired User',
      email: `expired_${Date.now()}@agriconnect.com`,
      mobile: `+9198${Math.floor(10000000 + Math.random() * 90000000)}`,
      password: 'password123',
      role: 'Farmer',
      isPremium: true,
      subscriptionPlan: 'farmer_pro_monthly',
      subscriptionExpiresAt: pastDate,
      subscriptionStatus: 'active',
    });
    expiredUserId = expiredU._id;
    expiredUserToken = jwt.sign(
      { id: expiredU._id, role: expiredU.role },
      jwtConfig.accessSecret,
      { expiresIn: '1h' }
    );

    await Subscription.create({
      user: expiredUserId,
      plan: 'farmer_pro_monthly',
      status: 'active',
      startDate: new Date(pastDate.getTime() - 30 * 24 * 60 * 60 * 1000),
      endDate: pastDate,
      autoRenew: true,
    });
  });

  afterAll(async () => {
    if (freeUserId) await User.findByIdAndDelete(freeUserId);
    if (activeUserId) await User.findByIdAndDelete(activeUserId);
    if (expiredUserId) await User.findByIdAndDelete(expiredUserId);
    await Subscription.deleteMany({});
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });

  describe('Full Subscription Details API', () => {
    it('should return subscription details for active user', async () => {
      const res = await request(app)
        .get('/api/v1/payments/subscription/me')
        .set('Authorization', `Bearer ${activePremiumUserToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.isPremium).toBe(true);
      expect(res.body.data.subscription).toBeDefined();
    });

    it('should lazily detect expired user and revoke isPremium status in DB', async () => {
      const res = await request(app)
        .get('/api/v1/payments/subscription/me')
        .set('Authorization', `Bearer ${expiredUserToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.user.isPremium).toBe(false);
      expect(res.body.data.user.subscriptionStatus).toBe('expired');

      const updatedDbUser = await User.findById(expiredUserId);
      expect(updatedDbUser.isPremium).toBe(false);
      expect(updatedDbUser.subscriptionStatus).toBe('expired');
    });
  });

  describe('Subscription Control Actions', () => {
    it('should toggle auto-renew status', async () => {
      const res = await request(app)
        .post('/api/v1/payments/subscription/auto-renew')
        .set('Authorization', `Bearer ${activePremiumUserToken}`)
        .send({ autoRenew: false });

      expect(res.status).toBe(200);
      expect(res.body.data.autoRenew).toBe(false);
    });

    it('should cancel active subscription', async () => {
      const res = await request(app)
        .post('/api/v1/payments/subscription/cancel')
        .set('Authorization', `Bearer ${activePremiumUserToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.cancelled).toBe(true);

      const dbSub = await Subscription.findOne({ user: activeUserId });
      expect(dbSub.status).toBe('cancelled');
    });
  });
});
