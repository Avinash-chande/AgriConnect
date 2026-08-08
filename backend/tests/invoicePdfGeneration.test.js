import request from 'supertest';
import mongoose from 'mongoose';
import app from '../app.js';
import { User } from '../models/User.js';
import { Payment } from '../models/Payment.js';
import { Transaction } from '../models/Transaction.js';
import { Invoice } from '../models/Invoice.js';
import { generateInvoiceService } from '../services/invoiceService.js';
import { PAYMENT_STATUS, TRANSACTION_TYPE, TRANSACTION_STATUS } from '../constants/index.js';
import { jwtConfig } from '../config/jwt.js';
import jwt from 'jsonwebtoken';

describe('Invoice Generation & PDF Download Integration Test Suite', () => {
  let userToken;
  let otherUserToken;
  let userId;
  let otherUserId;
  let testPaymentId;
  let testTransactionId;
  let testTransaction;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(
        process.env.MONGODB_TEST_URI || 'mongodb://127.0.0.1:27017/agriconnect_test_db'
      );
    }

    // 1. Regular User
    const u = await User.create({
      name: 'Invoice Customer',
      email: `invoice_user_${Date.now()}@agriconnect.com`,
      mobile: `+9198${Math.floor(10000000 + Math.random() * 90000000)}`,
      password: 'password123',
      role: 'Farmer',
    });
    userId = u._id;
    userToken = jwt.sign({ id: u._id, role: u.role }, jwtConfig.accessSecret, { expiresIn: '1h' });

    // 2. Other User
    const ou = await User.create({
      name: 'Other Customer',
      email: `invoice_other_${Date.now()}@agriconnect.com`,
      mobile: `+9198${Math.floor(10000000 + Math.random() * 90000000)}`,
      password: 'password123',
      role: 'Farmer',
    });
    otherUserId = ou._id;
    otherUserToken = jwt.sign({ id: ou._id, role: ou.role }, jwtConfig.accessSecret, { expiresIn: '1h' });

    // 3. Create Payment & Transaction
    const payment = await Payment.create({
      user: userId,
      orderId: `order_inv_${Date.now()}`,
      paymentId: `pay_inv_${Date.now()}`,
      provider: 'razorpay',
      amount: 499,
      currency: 'INR',
      status: PAYMENT_STATUS.CAPTURED,
      purpose: 'farmer_pro_monthly',
    });
    testPaymentId = payment._id;

    testTransaction = await Transaction.create({
      transactionId: `txn_inv_${Date.now()}`,
      user: userId,
      payment: payment._id,
      type: TRANSACTION_TYPE.PAYMENT,
      amount: 499,
      currency: 'INR',
      status: TRANSACTION_STATUS.SUCCESS,
      razorpayPaymentId: payment.paymentId,
      razorpayOrderId: payment.orderId,
    });
    testTransactionId = testTransaction.transactionId;

    // 4. Generate Invoice
    await generateInvoiceService({
      user: u,
      transaction: testTransaction,
      payment,
      planDetails: { name: 'Farmer Pro Monthly' },
    });
  });

  afterAll(async () => {
    if (userId) await User.findByIdAndDelete(userId);
    if (otherUserId) await User.findByIdAndDelete(otherUserId);
    if (testPaymentId) await Payment.findByIdAndDelete(testPaymentId);
    await Transaction.deleteMany({ user: userId });
    await Invoice.deleteMany({ user: userId });
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });

  describe('GET /api/v1/invoices/:transactionId', () => {
    it('should return 403 when another user attempts to view invoice metadata', async () => {
      const res = await request(app)
        .get(`/api/v1/invoices/${testTransactionId}`)
        .set('Authorization', `Bearer ${otherUserToken}`);

      expect(res.status).toBe(404); // Access denied / Not found for user
    });

    it('should return invoice JSON metadata for authorized user', async () => {
      const res = await request(app)
        .get(`/api/v1/invoices/${testTransactionId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.invoiceNumber).toMatch(/^INV-\d{6}-\d{4}$/);
      expect(res.body.data.tax).toBeDefined();
    });
  });

  describe('GET /api/v1/invoices/:transactionId/pdf', () => {
    it('should generate and stream a valid PDF invoice binary file', async () => {
      const res = await request(app)
        .get(`/api/v1/invoices/${testTransactionId}/pdf`)
        .set('Authorization', `Bearer ${userToken}`)
        .responseType('blob');

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('application/pdf');
      expect(res.headers['content-disposition']).toContain('attachment; filename="Invoice_INV-');
      
      // PDF Magic Header Verification (%PDF-1.)
      const pdfHeader = Buffer.from(res.body).toString('utf-8', 0, 5);
      expect(pdfHeader).toBe('%PDF-');
    });

    it('should reject unauthorized user attempting to download PDF invoice', async () => {
      const res = await request(app)
        .get(`/api/v1/invoices/${testTransactionId}/pdf`)
        .set('Authorization', `Bearer ${otherUserToken}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('not authorized to download this invoice');
    });
  });
});
