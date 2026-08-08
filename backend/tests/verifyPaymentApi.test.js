import request from 'supertest';
import mongoose from 'mongoose';
import app from '../app.js';
import { User } from '../models/User.js';
import { Payment } from '../models/Payment.js';
import { Transaction } from '../models/Transaction.js';
import { Subscription } from '../models/Subscription.js';
import { Invoice } from '../models/Invoice.js';
import { jwtConfig } from '../config/jwt.js';
import jwt from 'jsonwebtoken';

describe('Verify Razorpay Payment API Test Suite', () => {
  let userToken;
  let otherUserToken;
  let testUserId;
  let otherUserId;
  let testPaymentOrder;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(
        process.env.MONGODB_TEST_URI || 'mongodb://127.0.0.1:27017/agriconnect_test_db'
      );
    }

    // Create test user 1
    const user1 = await User.create({
      name: 'Verify Test Farmer',
      email: `verify_${Date.now()}@agriconnect.com`,
      mobile: `+9198${Math.floor(10000000 + Math.random() * 90000000)}`,
      password: 'password123',
      role: 'Farmer',
      isVerified: true,
    });
    testUserId = user1._id;
    userToken = jwt.sign({ id: user1._id, role: user1.role }, jwtConfig.accessSecret, {
      expiresIn: '1h',
    });

    // Create test user 2 (other user)
    const user2 = await User.create({
      name: 'Other Farmer',
      email: `other_${Date.now()}@agriconnect.com`,
      mobile: `+9198${Math.floor(10000000 + Math.random() * 90000000)}`,
      password: 'password123',
      role: 'Farmer',
      isVerified: true,
    });
    otherUserId = user2._id;
    otherUserToken = jwt.sign({ id: user2._id, role: user2.role }, jwtConfig.accessSecret, {
      expiresIn: '1h',
    });

    // Create a mock local Payment order for test user 1
    testPaymentOrder = await Payment.create({
      user: testUserId,
      orderId: `order_verify_test_${Date.now()}`,
      provider: 'razorpay',
      amount: 499,
      currency: 'INR',
      status: 'created',
      purpose: 'subscription',
      metadata: { planId: 'farmer_pro_monthly', amountInPaise: 49900 },
    });
  });

  afterAll(async () => {
    if (testUserId) {
      await User.findByIdAndDelete(testUserId);
      await Payment.deleteMany({ user: testUserId });
      await Transaction.deleteMany({ user: testUserId });
      await Subscription.deleteMany({ user: testUserId });
      await Invoice.deleteMany({ user: testUserId });
    }
    if (otherUserId) {
      await User.findByIdAndDelete(otherUserId);
    }
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });

  it('should return 401 Unauthorized when no token is provided', async () => {
    const res = await request(app)
      .post('/api/v1/payments/verify')
      .send({
        razorpay_order_id: testPaymentOrder.orderId,
        razorpay_payment_id: 'pay_test_123',
        razorpay_signature: 'sig_test',
      });

    expect(res.status).toBe(401);
  });

  it('should return 403 Forbidden if order belongs to a different user', async () => {
    const res = await request(app)
      .post('/api/v1/payments/verify')
      .set('Authorization', `Bearer ${otherUserToken}`)
      .send({
        razorpay_order_id: testPaymentOrder.orderId,
        razorpay_payment_id: 'pay_test_123',
        razorpay_signature: 'valid_mock_signature',
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('should return 400 Bad Request when signature is invalid', async () => {
    const res = await request(app)
      .post('/api/v1/payments/verify')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        razorpay_order_id: testPaymentOrder.orderId,
        razorpay_payment_id: 'pay_test_123',
        razorpay_signature: 'invalid_forged_signature_123',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);

    // Verify Payment document status was set to failed
    const updatedPayment = await Payment.findById(testPaymentOrder._id);
    expect(updatedPayment.status).toBe('failed');
  });

  it('should successfully verify payment, activate premium membership, create transaction and invoice', async () => {
    // Reset payment status for verification test
    testPaymentOrder.status = 'created';
    await testPaymentOrder.save();

    const paymentId = `pay_verify_valid_${Date.now()}`;
    const res = await request(app)
      .post('/api/v1/payments/verify')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        razorpay_order_id: testPaymentOrder.orderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: 'valid_mock_signature',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const data = res.body.data;
    expect(data.verified).toBe(true);
    expect(data.subscription.planId).toBe('farmer_pro_monthly');
    expect(data.user.isPremium).toBe(true);

    // Check DB states
    const userInDb = await User.findById(testUserId);
    expect(userInDb.isPremium).toBe(true);
    expect(userInDb.subscriptionPlan).toBe('farmer_pro_monthly');

    const transactionInDb = await Transaction.findOne({ razorpayPaymentId: paymentId });
    expect(transactionInDb).toBeDefined();
    expect(transactionInDb.status).toBe('success');

    const invoiceInDb = await Invoice.findOne({ user: testUserId });
    expect(invoiceInDb).toBeDefined();
    expect(invoiceInDb.items.length).toBeGreaterThan(0);
  });

  it('should enforce idempotency and prevent duplicate activation for already verified payment', async () => {
    const paymentId = `pay_idempotent_${Date.now()}`;

    // First call
    const res1 = await request(app)
      .post('/api/v1/payments/verify')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        razorpay_order_id: testPaymentOrder.orderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: 'valid_mock_signature',
      });

    expect(res1.status).toBe(200);

    // Second duplicate call
    const res2 = await request(app)
      .post('/api/v1/payments/verify')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        razorpay_order_id: testPaymentOrder.orderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: 'valid_mock_signature',
      });

    expect(res2.status).toBe(200);
    expect(res2.body.success).toBe(true);
    expect(res2.body.data.message).toContain('already verified');
  });
});
