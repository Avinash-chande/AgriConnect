import request from 'supertest';
import mongoose from 'mongoose';
import app from '../app.js';
import { User } from '../models/User.js';
import { Payment } from '../models/Payment.js';
import { Transaction } from '../models/Transaction.js';
import { Refund } from '../models/Refund.js';
import { PAYMENT_STATUS, TRANSACTION_TYPE, TRANSACTION_STATUS, REFUND_STATUS } from '../constants/index.js';
import { jwtConfig } from '../config/jwt.js';
import jwt from 'jsonwebtoken';

describe('Secure Refund Management API Integration Test Suite', () => {
  let userToken;
  let otherUserToken;
  let adminToken;
  let userId;
  let otherUserId;
  let adminId;
  let testPaymentId;
  let testTransactionId;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(
        process.env.MONGODB_TEST_URI || 'mongodb://127.0.0.1:27017/agriconnect_test_db'
      );
    }

    // 1. Regular User (Buyer)
    const u = await User.create({
      name: 'Refund Requester',
      email: `refund_user_${Date.now()}@agriconnect.com`,
      mobile: `+9198${Math.floor(10000000 + Math.random() * 90000000)}`,
      password: 'password123',
      role: 'Farmer',
    });
    userId = u._id;
    userToken = jwt.sign({ id: u._id, role: u.role }, jwtConfig.accessSecret, { expiresIn: '1h' });

    // 2. Other User
    const ou = await User.create({
      name: 'Other User',
      email: `other_user_${Date.now()}@agriconnect.com`,
      mobile: `+9198${Math.floor(10000000 + Math.random() * 90000000)}`,
      password: 'password123',
      role: 'Farmer',
    });
    otherUserId = ou._id;
    otherUserToken = jwt.sign({ id: ou._id, role: ou.role }, jwtConfig.accessSecret, { expiresIn: '1h' });

    // 3. Admin User
    const adm = await User.create({
      name: 'Platform Admin',
      email: `admin_user_${Date.now()}@agriconnect.com`,
      mobile: `+9198${Math.floor(10000000 + Math.random() * 90000000)}`,
      password: 'password123',
      role: 'Admin',
    });
    adminId = adm._id;
    adminToken = jwt.sign({ id: adm._id, role: adm.role }, jwtConfig.accessSecret, { expiresIn: '1h' });

    // 4. Create Captured Payment & Success Transaction
    const payment = await Payment.create({
      user: userId,
      orderId: `order_rfnd_test_${Date.now()}`,
      paymentId: `pay_rfnd_test_${Date.now()}`,
      provider: 'razorpay',
      amount: 499,
      currency: 'INR',
      status: PAYMENT_STATUS.CAPTURED,
      purpose: 'farmer_pro_monthly',
    });
    testPaymentId = payment._id;

    const txn = await Transaction.create({
      transactionId: `txn_rfnd_test_${Date.now()}`,
      user: userId,
      payment: payment._id,
      type: TRANSACTION_TYPE.PAYMENT,
      amount: 499,
      currency: 'INR',
      status: TRANSACTION_STATUS.SUCCESS,
      razorpayPaymentId: payment.paymentId,
      razorpayOrderId: payment.orderId,
    });
    testTransactionId = txn.transactionId;
  });

  afterAll(async () => {
    if (userId) await User.findByIdAndDelete(userId);
    if (otherUserId) await User.findByIdAndDelete(otherUserId);
    if (adminId) await User.findByIdAndDelete(adminId);
    if (testPaymentId) await Payment.findByIdAndDelete(testPaymentId);
    await Transaction.deleteMany({ user: userId });
    await Refund.deleteMany({ user: userId });
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });

  describe('POST /api/v1/payments/refund/request', () => {
    it('should reject unauthorized user trying to request refund for another user transaction', async () => {
      const res = await request(app)
        .post('/api/v1/payments/refund/request')
        .set('Authorization', `Bearer ${otherUserToken}`)
        .send({ transactionId: testTransactionId, amount: 499, reason: 'Duplicate billing' });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('not authorized to request a refund');
    });

    it('should create pending refund request for transaction owner', async () => {
      const res = await request(app)
        .post('/api/v1/payments/refund/request')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ transactionId: testTransactionId, amount: 499, reason: 'Accidental purchase' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe(REFUND_STATUS.PENDING);
      expect(res.body.data.amount).toBe(499);
    });

    it('should prevent duplicate pending refund requests', async () => {
      const res = await request(app)
        .post('/api/v1/payments/refund/request')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ transactionId: testTransactionId, amount: 499, reason: 'Second request' });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('pending refund request already exists');
    });
  });

  describe('POST /api/v1/payments/refund/process (Admin)', () => {
    it('should reject non-admin attempting to process refund', async () => {
      const pendingRefund = await Refund.findOne({ user: userId, status: REFUND_STATUS.PENDING });

      const res = await request(app)
        .post('/api/v1/payments/refund/process')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ refundId: pendingRefund.refundId, action: 'approve' });

      expect(res.status).toBe(403);
    });

    it('should allow admin to process and approve refund via Razorpay API', async () => {
      const pendingRefund = await Refund.findOne({ user: userId, status: REFUND_STATUS.PENDING });

      const res = await request(app)
        .post('/api/v1/payments/refund/process')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ refundId: pendingRefund.refundId, action: 'approve' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe(REFUND_STATUS.PROCESSED);
      expect(res.body.data.paymentStatus).toBe(PAYMENT_STATUS.REFUNDED);

      // Verify payment status updated in database
      const updatedPayment = await Payment.findById(testPaymentId);
      expect(updatedPayment.status).toBe(PAYMENT_STATUS.REFUNDED);
    });
  });
});
