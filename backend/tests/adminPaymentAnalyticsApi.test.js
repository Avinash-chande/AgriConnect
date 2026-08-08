import request from 'supertest';
import mongoose from 'mongoose';
import app from '../app.js';
import { User } from '../models/User.js';
import { Payment } from '../models/Payment.js';
import { Transaction } from '../models/Transaction.js';
import { PAYMENT_STATUS, TRANSACTION_TYPE, TRANSACTION_STATUS } from '../constants/index.js';
import { jwtConfig } from '../config/jwt.js';
import jwt from 'jsonwebtoken';

describe('Admin Payment Analytics Integration Test Suite', () => {
  let adminToken;
  let farmerToken;
  let adminId;
  let farmerId;
  let testPaymentId;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(
        process.env.MONGODB_TEST_URI || 'mongodb://127.0.0.1:27017/agriconnect_test_db'
      );
    }

    // 1. Admin User
    const adminU = await User.create({
      name: 'Analytics Admin',
      email: `analytics_admin_${Date.now()}@agriconnect.com`,
      mobile: `+9198${Math.floor(10000000 + Math.random() * 90000000)}`,
      password: 'password123',
      role: 'Admin',
    });
    adminId = adminU._id;
    adminToken = jwt.sign({ id: adminU._id, role: adminU.role }, jwtConfig.accessSecret, { expiresIn: '1h' });

    // 2. Farmer User
    const farmerU = await User.create({
      name: 'Regular Farmer',
      email: `analytics_farmer_${Date.now()}@agriconnect.com`,
      mobile: `+9198${Math.floor(10000000 + Math.random() * 90000000)}`,
      password: 'password123',
      role: 'Farmer',
      isPremium: true,
    });
    farmerId = farmerU._id;
    farmerToken = jwt.sign({ id: farmerU._id, role: farmerU.role }, jwtConfig.accessSecret, { expiresIn: '1h' });

    // 3. Create Sample Captured Payments
    const pay1 = await Payment.create({
      user: farmerId,
      orderId: `order_analytics_${Date.now()}_1`,
      paymentId: `pay_analytics_${Date.now()}_1`,
      provider: 'razorpay',
      amount: 499,
      currency: 'INR',
      status: PAYMENT_STATUS.CAPTURED,
      purpose: 'farmer_pro_monthly',
      paidAt: new Date(),
    });
    testPaymentId = pay1._id;

    await Payment.create({
      user: farmerId,
      orderId: `order_analytics_${Date.now()}_2`,
      paymentId: `pay_analytics_${Date.now()}_2`,
      provider: 'razorpay',
      amount: 199,
      currency: 'INR',
      status: PAYMENT_STATUS.CAPTURED,
      purpose: 'job_promotion_7d',
      paidAt: new Date(),
    });
  });

  afterAll(async () => {
    if (adminId) await User.findByIdAndDelete(adminId);
    if (farmerId) await User.findByIdAndDelete(farmerId);
    await Payment.deleteMany({ user: farmerId });
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });

  it('should block non-admin users from accessing financial analytics (403 Forbidden)', async () => {
    const res = await request(app)
      .get('/api/v1/payments/analytics/admin')
      .set('Authorization', `Bearer ${farmerToken}`);

    expect(res.status).toBe(403);
  });

  it('should return complete financial metrics and chart aggregations for Admin', async () => {
    const res = await request(app)
      .get('/api/v1/payments/analytics/admin')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.summary).toBeDefined();
    expect(res.body.data.summary.totalRevenue).toBeGreaterThanOrEqual(698);
    expect(res.body.data.summary.featuredJobRevenue).toBeGreaterThanOrEqual(199);
    expect(res.body.data.summary.successfulPaymentsCount).toBeGreaterThanOrEqual(2);
    expect(res.body.data.summary.activePremiumUsersCount).toBeGreaterThanOrEqual(1);
    expect(res.body.data.charts.revenueOverTime).toBeDefined();
    expect(res.body.data.charts.planDistribution).toBeDefined();
  });

  it('should support date range filtering on admin analytics', async () => {
    const startDate = new Date(Date.now() - 7 * 24 * 3600000).toISOString();
    const endDate = new Date().toISOString();

    const res = await request(app)
      .get(`/api/v1/payments/analytics/admin?startDate=${startDate}&endDate=${endDate}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.filter.startDate).toBeDefined();
  });
});
