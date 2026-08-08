import request from 'supertest';
import mongoose from 'mongoose';
import app from '../app.js';
import { User } from '../models/User.js';
import { Payment } from '../models/Payment.js';
import { Transaction } from '../models/Transaction.js';
import { Invoice } from '../models/Invoice.js';
import { jwtConfig } from '../config/jwt.js';
import jwt from 'jsonwebtoken';

describe('Payment Details API Test Suite', () => {
  let user1Token;
  let user2Token;
  let user1Id;
  let user2Id;
  let sampleTxnId;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(
        process.env.MONGODB_TEST_URI || 'mongodb://127.0.0.1:27017/agriconnect_test_db'
      );
    }

    const u1 = await User.create({
      name: 'Owner User',
      email: `owner_${Date.now()}@agriconnect.com`,
      mobile: `+9198${Math.floor(10000000 + Math.random() * 90000000)}`,
      password: 'password123',
      role: 'Farmer',
      isVerified: true,
    });
    user1Id = u1._id;
    user1Token = jwt.sign({ id: u1._id, role: u1.role }, jwtConfig.accessSecret, { expiresIn: '1h' });

    const u2 = await User.create({
      name: 'Unauthorized User',
      email: `unauth_${Date.now()}@agriconnect.com`,
      mobile: `+9198${Math.floor(10000000 + Math.random() * 90000000)}`,
      password: 'password123',
      role: 'Worker',
      isVerified: true,
    });
    user2Id = u2._id;
    user2Token = jwt.sign({ id: u2._id, role: u2.role }, jwtConfig.accessSecret, { expiresIn: '1h' });

    const p = await Payment.create({
      user: user1Id,
      orderId: `order_details_${Date.now()}`,
      provider: 'razorpay',
      amount: 499,
      currency: 'INR',
      status: 'captured',
      purpose: 'subscription',
      metadata: { planName: 'Farmer Pro (Monthly)' },
    });

    sampleTxnId = `txn_det_${Date.now()}`;
    const t = await Transaction.create({
      transactionId: sampleTxnId,
      user: user1Id,
      payment: p._id,
      type: 'payment',
      amount: 499,
      currency: 'INR',
      status: 'success',
      razorpayPaymentId: `pay_det_${Date.now()}`,
      razorpayOrderId: p.orderId,
      gatewayResponse: { cardNumber: '4111-XXXX-XXXX-1111', cvv: '123' },
    });

    await Invoice.create({
      invoiceNumber: `INV-DET-001`,
      user: user1Id,
      transaction: t._id,
      amount: 588.82,
      tax: 89.82,
      currency: 'INR',
      items: [{ description: 'Farmer Pro Plan', quantity: 1, unitPrice: 499, amount: 499 }],
      status: 'paid',
    });
  });

  afterAll(async () => {
    if (user1Id) await User.findByIdAndDelete(user1Id);
    if (user2Id) await User.findByIdAndDelete(user2Id);
    await Payment.deleteMany({});
    await Transaction.deleteMany({});
    await Invoice.deleteMany({});
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });

  it('should return 401 Unauthorized if request has no auth token', async () => {
    const res = await request(app).get(`/api/v1/payments/details/${sampleTxnId}`);
    expect(res.status).toBe(401);
  });

  it('should return 403 Forbidden if user is not transaction owner', async () => {
    const res = await request(app)
      .get(`/api/v1/payments/details/${sampleTxnId}`)
      .set('Authorization', `Bearer ${user2Token}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('should return 404 Not Found for non-existent transaction ID', async () => {
    const res = await request(app)
      .get('/api/v1/payments/details/txn_non_existent_999')
      .set('Authorization', `Bearer ${user1Token}`);

    expect(res.status).toBe(404);
  });

  it('should return transaction details and strip PCI sensitive fields', async () => {
    const res = await request(app)
      .get(`/api/v1/payments/details/${sampleTxnId}`)
      .set('Authorization', `Bearer ${user1Token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const data = res.body.data;
    expect(data.transaction.transactionId).toBe(sampleTxnId);
    expect(data.invoice.invoiceNumber).toBe('INV-DET-001');

    // PCI Secrecy Check
    expect(data.transaction.gatewayResponse?.cardNumber).toBeUndefined();
    expect(data.transaction.gatewayResponse?.cvv).toBeUndefined();
  });
});
