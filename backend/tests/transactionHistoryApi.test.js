import request from 'supertest';
import mongoose from 'mongoose';
import app from '../app.js';
import { User } from '../models/User.js';
import { Payment } from '../models/Payment.js';
import { Transaction } from '../models/Transaction.js';
import { Invoice } from '../models/Invoice.js';
import { jwtConfig } from '../config/jwt.js';
import jwt from 'jsonwebtoken';

describe('Transaction History API Test Suite', () => {
  let user1Token;
  let user2Token;
  let adminToken;
  let user1Id;
  let user2Id;
  let adminId;
  let user1TxnId;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(
        process.env.MONGODB_TEST_URI || 'mongodb://127.0.0.1:27017/agriconnect_test_db'
      );
    }

    // User 1
    const u1 = await User.create({
      name: 'History User 1',
      email: `history1_${Date.now()}@agriconnect.com`,
      mobile: `+9198${Math.floor(10000000 + Math.random() * 90000000)}`,
      password: 'password123',
      role: 'Farmer',
      isVerified: true,
    });
    user1Id = u1._id;
    user1Token = jwt.sign({ id: u1._id, role: u1.role }, jwtConfig.accessSecret, { expiresIn: '1h' });

    // User 2
    const u2 = await User.create({
      name: 'History User 2',
      email: `history2_${Date.now()}@agriconnect.com`,
      mobile: `+9198${Math.floor(10000000 + Math.random() * 90000000)}`,
      password: 'password123',
      role: 'Worker',
      isVerified: true,
    });
    user2Id = u2._id;
    user2Token = jwt.sign({ id: u2._id, role: u2.role }, jwtConfig.accessSecret, { expiresIn: '1h' });

    // Admin
    const admin = await User.create({
      name: 'Platform Admin',
      email: `admin_${Date.now()}@agriconnect.com`,
      mobile: `+9198${Math.floor(10000000 + Math.random() * 90000000)}`,
      password: 'password123',
      role: 'Admin',
      isVerified: true,
    });
    adminId = admin._id;
    adminToken = jwt.sign({ id: admin._id, role: admin.role }, jwtConfig.accessSecret, { expiresIn: '1h' });

    // Payment 1 & Txn 1 for User 1
    const p1 = await Payment.create({
      user: user1Id,
      orderId: `order_hist_1_${Date.now()}`,
      provider: 'razorpay',
      amount: 499,
      currency: 'INR',
      status: 'captured',
      purpose: 'subscription',
    });
    user1TxnId = `txn_hist_user1_${Date.now()}`;
    const t1 = await Transaction.create({
      transactionId: user1TxnId,
      user: user1Id,
      payment: p1._id,
      type: 'payment',
      amount: 499,
      currency: 'INR',
      status: 'success',
      razorpayPaymentId: `pay_h1_${Date.now()}`,
      razorpayOrderId: p1.orderId,
    });

    await Invoice.create({
      invoiceNumber: `INV-TEST-001`,
      user: user1Id,
      transaction: t1._id,
      amount: 588.82,
      tax: 89.82,
      currency: 'INR',
      items: [{ description: 'Farmer Pro Plan', quantity: 1, unitPrice: 499, amount: 499 }],
      status: 'paid',
    });

    // Payment 2 & Txn 2 for User 2
    const p2 = await Payment.create({
      user: user2Id,
      orderId: `order_hist_2_${Date.now()}`,
      provider: 'razorpay',
      amount: 199,
      currency: 'INR',
      status: 'captured',
      purpose: 'subscription',
    });
    await Transaction.create({
      transactionId: `txn_hist_user2_${Date.now()}`,
      user: user2Id,
      payment: p2._id,
      type: 'payment',
      amount: 199,
      currency: 'INR',
      status: 'success',
      razorpayPaymentId: `pay_h2_${Date.now()}`,
      razorpayOrderId: p2.orderId,
    });
  });

  afterAll(async () => {
    if (user1Id) await User.findByIdAndDelete(user1Id);
    if (user2Id) await User.findByIdAndDelete(user2Id);
    if (adminId) await User.findByIdAndDelete(adminId);
    await Payment.deleteMany({});
    await Transaction.deleteMany({});
    await Invoice.deleteMany({});
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });

  it('should fetch user 1 transactions and isolate from user 2', async () => {
    const res = await request(app)
      .get('/api/v1/payments/history')
      .set('Authorization', `Bearer ${user1Token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const txs = res.body.data.transactions;
    expect(txs.length).toBe(1);
    expect(txs[0].transactionId).toBe(user1TxnId);
    expect(txs[0].invoice).toBeDefined();
    expect(txs[0].invoice.invoiceNumber).toBe('INV-TEST-001');
  });

  it('should filter transactions by search query', async () => {
    const res = await request(app)
      .get(`/api/v1/payments/history?search=${user1TxnId}`)
      .set('Authorization', `Bearer ${user1Token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.transactions.length).toBe(1);
    expect(res.body.data.transactions[0].transactionId).toBe(user1TxnId);
  });

  it('should allow Admin to view all transactions or target specific userId', async () => {
    const resAll = await request(app)
      .get('/api/v1/payments/history')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(resAll.status).toBe(200);
    expect(resAll.body.data.transactions.length).toBeGreaterThanOrEqual(2);

    const resUser2 = await request(app)
      .get(`/api/v1/payments/history?targetUserId=${user2Id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(resUser2.status).toBe(200);
    expect(resUser2.body.data.transactions.length).toBe(1);
  });
});
