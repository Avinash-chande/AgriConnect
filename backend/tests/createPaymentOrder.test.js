import request from 'supertest';
import mongoose from 'mongoose';
import app from '../app.js';
import { User } from '../models/User.js';
import { Payment } from '../models/Payment.js';
import { jwtConfig } from '../config/jwt.js';
import jwt from 'jsonwebtoken';

describe('Create Payment Order API Test Suite', () => {
  let userToken;
  let testUserId;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(
        process.env.MONGODB_TEST_URI || 'mongodb://127.0.0.1:27017/agriconnect_test_db'
      );
    }

    // Create a mock authenticated user
    const user = await User.create({
      name: 'Test Farmer Order',
      email: `testorder_${Date.now()}@agriconnect.com`,
      mobile: `+9198${Math.floor(10000000 + Math.random() * 90000000)}`,
      password: 'password123',
      role: 'Farmer',
      isVerified: true,
    });

    testUserId = user._id;
    userToken = jwt.sign({ id: user._id, role: user.role }, jwtConfig.accessSecret, {
      expiresIn: '1h',
    });
  });

  afterAll(async () => {
    if (testUserId) {
      await User.findByIdAndDelete(testUserId);
      await Payment.deleteMany({ user: testUserId });
    }
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });

  it('should return 401 Unauthorized when no auth token is provided', async () => {
    const res = await request(app)
      .post('/api/v1/payments/orders')
      .send({ planId: 'farmer_pro_monthly' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('should return 400 Bad Request when planId is missing', async () => {
    const res = await request(app)
      .post('/api/v1/payments/orders')
      .set('Authorization', `Bearer ${userToken}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('should create Razorpay payment order and return ONLY safe fields', async () => {
    const res = await request(app)
      .post('/api/v1/payments/orders')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        planId: 'farmer_pro_monthly',
        // Frontend attempts to tamper price - MUST BE IGNORED BY BACKEND!
        amount: 1,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);

    const data = res.body.data;
    expect(data.orderId).toBeDefined();
    expect(data.orderId).toMatch(/^order_/);
    expect(data.amount).toBe(49900); // 499 INR = 49900 paise computed server-side
    expect(data.currency).toBe('INR');
    expect(data.keyId).toBeDefined();
    expect(data.paymentId).toBeDefined();

    // Security check: NEVER expose secret key
    expect(data.keySecret).toBeUndefined();
    expect(data.secret).toBeUndefined();
    expect(JSON.stringify(res.body)).not.toContain(process.env.RAZORPAY_KEY_SECRET || 'secret');
  });

  it('should enforce idempotency when same idempotencyKey is sent', async () => {
    const idempotencyKey = `idemp_key_${Date.now()}`;

    const res1 = await request(app)
      .post('/api/v1/payments/orders')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        planId: 'farmer_pro_monthly',
        idempotencyKey,
      });

    expect(res1.status).toBe(201);
    const order1 = res1.body.data;

    const res2 = await request(app)
      .post('/api/v1/payments/orders')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        planId: 'farmer_pro_monthly',
        idempotencyKey,
      });

    expect(res2.status).toBe(201);
    const order2 = res2.body.data;

    expect(order2.orderId).toBe(order1.orderId);
  });
});
