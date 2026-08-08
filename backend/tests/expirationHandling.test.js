import request from 'supertest';
import mongoose from 'mongoose';
import app from '../app.js';
import { User } from '../models/User.js';
import { Subscription } from '../models/Subscription.js';
import { Job } from '../models/Job.js';
import { Notification, NOTIFICATION_TYPE } from '../models/Notification.js';
import { FarmerProfile } from '../models/FarmerProfile.js';
import {
  handleExpiredSubscriptionsService,
  handleExpiringSubscriptionRemindersService,
  handleExpiredFeaturedJobsService,
  runAllExpirationChecksService,
} from '../services/expirationService.js';
import { SUBSCRIPTION_STATUS } from '../constants/index.js';
import { jwtConfig } from '../config/jwt.js';
import jwt from 'jsonwebtoken';

describe('Server-Side Expiration Handling Integration Test Suite', () => {
  let expiredUserId;
  let expiringUserId;
  let expiredJobId;
  let adminToken;
  let adminId;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(
        process.env.MONGODB_TEST_URI || 'mongodb://127.0.0.1:27017/agriconnect_test_db'
      );
    }

    // 1. Expired Premium User
    const expiredU = await User.create({
      name: 'Expired Member',
      email: `expired_${Date.now()}@agriconnect.com`,
      mobile: `+9198${Math.floor(10000000 + Math.random() * 90000000)}`,
      password: 'password123',
      role: 'Farmer',
      isPremium: true,
      subscriptionPlan: 'farmer_pro_monthly',
      subscriptionStatus: SUBSCRIPTION_STATUS.ACTIVE,
      subscriptionExpiresAt: new Date(Date.now() - 3600000), // 1 hour ago
    });
    expiredUserId = expiredU._id;

    await Subscription.create({
      user: expiredUserId,
      plan: 'farmer_pro_monthly',
      status: SUBSCRIPTION_STATUS.ACTIVE,
      startDate: new Date(Date.now() - 30 * 24 * 3600000),
      endDate: expiredU.subscriptionExpiresAt,
      providerSubscriptionId: 'sub_expired_123',
    });

    // 2. Expiring Soon Premium User (2 days remaining)
    const expiringU = await User.create({
      name: 'Expiring Soon Member',
      email: `expiring_${Date.now()}@agriconnect.com`,
      mobile: `+9198${Math.floor(10000000 + Math.random() * 90000000)}`,
      password: 'password123',
      role: 'Farmer',
      isPremium: true,
      subscriptionPlan: 'farmer_pro_monthly',
      subscriptionStatus: SUBSCRIPTION_STATUS.ACTIVE,
      subscriptionExpiresAt: new Date(Date.now() + 2 * 24 * 3600000), // 2 days in future
    });
    expiringUserId = expiringU._id;

    // 3. Expired Featured Job
    const fProfile = await FarmerProfile.create({
      user: expiredUserId,
      owner: expiredUserId,
      farmSize: 12,
      farmName: 'Expired Acres',
      location: { type: 'Point', coordinates: [75.8573, 31.634] },
      farmAddress: { village: 'Rampur', district: 'Ludhiana', state: 'Punjab', pincode: '141001' },
    });

    const job = await Job.create({
      farmer: expiredUserId,
      title: 'Expired Featured Job Vacancy',
      description: 'Harvesting work on farm.',
      category: 'Harvesting',
      workType: 'Full-Time',
      numberOfWorkers: 3,
      requiredSkills: ['Harvesting'],
      wageType: 'Daily',
      dailyWage: 600,
      startDate: new Date(Date.now() + 86400000),
      isFeatured: true,
      featuredStartDate: new Date(Date.now() - 7 * 86400000),
      featuredEndDate: new Date(Date.now() - 3600000), // 1 hour ago
      jobAddress: { village: 'Rampur', district: 'Ludhiana', state: 'Punjab', pincode: '141001' },
    });
    expiredJobId = job._id;

    // 4. Admin User for On-Demand Maintenance Route Test
    const adm = await User.create({
      name: 'Maintenance Admin',
      email: `maint_admin_${Date.now()}@agriconnect.com`,
      mobile: `+9198${Math.floor(10000000 + Math.random() * 90000000)}`,
      password: 'password123',
      role: 'Admin',
    });
    adminId = adm._id;
    adminToken = jwt.sign({ id: adm._id, role: adm.role }, jwtConfig.accessSecret, { expiresIn: '1h' });
  });

  afterAll(async () => {
    if (expiredUserId) {
      await User.findByIdAndDelete(expiredUserId);
      await FarmerProfile.deleteMany({ user: expiredUserId });
    }
    if (expiringUserId) await User.findByIdAndDelete(expiringUserId);
    if (adminId) await User.findByIdAndDelete(adminId);
    if (expiredJobId) await Job.findByIdAndDelete(expiredJobId);
    await Subscription.deleteMany({ user: { $in: [expiredUserId, expiringUserId] } });
    await Notification.deleteMany({ recipient: { $in: [expiredUserId, expiringUserId] } });
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });

  describe('handleExpiredSubscriptionsService()', () => {
    it('should detect expired users, revoke premium access, and send PREMIUM_EXPIRED notification', async () => {
      const result = await handleExpiredSubscriptionsService();
      expect(result.processedUsersCount).toBeGreaterThanOrEqual(1);

      // Check User database state
      const updatedUser = await User.findById(expiredUserId);
      expect(updatedUser.isPremium).toBe(false);
      expect(updatedUser.subscriptionStatus).toBe(SUBSCRIPTION_STATUS.EXPIRED);

      // Check Subscription document
      const sub = await Subscription.findOne({ user: expiredUserId });
      expect(sub.status).toBe(SUBSCRIPTION_STATUS.EXPIRED);

      // Check Notification
      const notif = await Notification.findOne({
        recipient: expiredUserId,
        type: NOTIFICATION_TYPE.PREMIUM_EXPIRED,
      });
      expect(notif).toBeDefined();
    });
  });

  describe('handleExpiringSubscriptionRemindersService()', () => {
    it('should send PREMIUM_EXPIRING notification and stay idempotent', async () => {
      // First run -> Dispatches reminder
      const result1 = await handleExpiringSubscriptionRemindersService();
      expect(result1.remindedUsersCount).toBeGreaterThanOrEqual(1);

      const notif = await Notification.findOne({
        recipient: expiringUserId,
        type: NOTIFICATION_TYPE.PREMIUM_EXPIRING,
      });
      expect(notif).toBeDefined();

      // Second immediate run -> Idempotent check prevents duplicate reminder within 24 hours
      const result2 = await handleExpiringSubscriptionRemindersService();
      expect(result2.remindedUsersCount).toBe(0);
    });
  });

  describe('handleExpiredFeaturedJobsService()', () => {
    it('should reset isFeatured = false for expired job promotions', async () => {
      const result = await handleExpiredFeaturedJobsService();
      expect(result.expiredJobsCount).toBeGreaterThanOrEqual(1);

      const updatedJob = await Job.findById(expiredJobId);
      expect(updatedJob.isFeatured).toBe(false);
    });
  });

  describe('POST /api/v1/payments/expiration/run-maintenance', () => {
    it('should trigger complete sweep via Admin maintenance endpoint', async () => {
      const res = await request(app)
        .post('/api/v1/payments/expiration/run-maintenance')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.timestamp).toBeDefined();
    });
  });
});
