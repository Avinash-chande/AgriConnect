import request from 'supertest';
import mongoose from 'mongoose';
import app from '../app.js';
import { User } from '../models/User.js';
import { Payment } from '../models/Payment.js';
import { Transaction } from '../models/Transaction.js';
import { Subscription } from '../models/Subscription.js';
import { Invoice } from '../models/Invoice.js';
import { WebhookEvent } from '../models/WebhookEvent.js';
import { generateInvoiceService } from '../services/invoiceService.js';
import { jwtConfig } from '../config/jwt.js';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

describe('Payment Idempotency Test Suite', () => {
  let userToken;
  let testUserId;
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || 'agriconnect_webhook_secret_2026';

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(
        process.env.MONGODB_TEST_URI || 'mongodb://127.0.0.1:27017/agriconnect_test_db'
      );
    }

    const user = await User.create({
      name: 'Idempotency Test Farmer',
      email: `idemp_${Date.now()}@agriconnect.com`,
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
      await Transaction.deleteMany({ user: testUserId });
      await Subscription.deleteMany({ user: testUserId });
      await Invoice.deleteMany({ user: testUserId });
      await WebhookEvent.deleteMany({});
    }
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });

  describe('Order Creation Idempotency', () => {
    it('should return existing order when identical idempotencyKey is used', async () => {
      const idempotencyKey = `idemp_order_${Date.now()}`;

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
      expect(order2.paymentId).toBe(order1.paymentId);

      // Verify only 1 Payment document exists in DB for this idempotencyKey
      const count = await Payment.countDocuments({
        user: testUserId,
        'metadata.idempotencyKey': idempotencyKey,
      });
      expect(count).toBe(1);
    });
  });

  describe('Payment Verification & Activation Idempotency', () => {
    it('should safely return existing transaction on duplicate verification calls', async () => {
      const paymentOrder = await Payment.create({
        user: testUserId,
        orderId: `order_idemp_verify_${Date.now()}`,
        provider: 'razorpay',
        amount: 499,
        currency: 'INR',
        status: 'created',
        purpose: 'subscription',
        metadata: { planId: 'farmer_pro_monthly' },
      });

      const paymentId = `pay_idemp_${Date.now()}`;

      // First verification call
      const res1 = await request(app)
        .post('/api/v1/payments/verify')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          razorpay_order_id: paymentOrder.orderId,
          razorpay_payment_id: paymentId,
          razorpay_signature: 'valid_mock_signature',
        });

      expect(res1.status).toBe(200);
      expect(res1.body.data.verified).toBe(true);

      // Duplicate verification call
      const res2 = await request(app)
        .post('/api/v1/payments/verify')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          razorpay_order_id: paymentOrder.orderId,
          razorpay_payment_id: paymentId,
          razorpay_signature: 'valid_mock_signature',
        });

      expect(res2.status).toBe(200);
      expect(res2.body.data.message).toContain('already verified');

      // Verify only 1 Transaction was created for this paymentId
      const txCount = await Transaction.countDocuments({ razorpayPaymentId: paymentId });
      expect(txCount).toBe(1);
    });
  });

  describe('Webhook Processing Idempotency', () => {
    it('should ignore duplicate webhook events with same event_id', async () => {
      const eventId = `evt_idemp_${Date.now()}`;
      const payloadObj = {
        event: 'payment.captured',
        event_id: eventId,
        payload: {
          payment: {
            entity: {
              id: `pay_wh_idemp_${Date.now()}`,
              amount: 49900,
              currency: 'INR',
              order_id: `order_wh_idemp_${Date.now()}`,
              notes: {
                userId: testUserId.toString(),
                planId: 'farmer_pro_monthly',
              },
            },
          },
        },
      };

      const rawPayload = JSON.stringify(payloadObj);
      const signature = crypto
        .createHmac('sha256', webhookSecret)
        .update(rawPayload)
        .digest('hex');

      const res1 = await request(app)
        .post('/api/v1/payments/webhook')
        .set('Content-Type', 'application/json')
        .set('x-razorpay-signature', signature)
        .send(rawPayload);

      expect(res1.status).toBe(200);

      const res2 = await request(app)
        .post('/api/v1/payments/webhook')
        .set('Content-Type', 'application/json')
        .set('x-razorpay-signature', signature)
        .send(rawPayload);

      expect(res2.status).toBe(200);
      expect(res2.body.data.status).toBe('ignored');

      // Check DB contains exactly 1 WebhookEvent record
      const eventCount = await WebhookEvent.countDocuments({ eventId });
      expect(eventCount).toBe(1);
    });
  });

  describe('Invoice Generation Idempotency', () => {
    it('should return existing invoice when called twice for same transaction', async () => {
      const mockPayment = await Payment.create({
        user: testUserId,
        orderId: `order_inv_idemp_${Date.now()}`,
        amount: 499,
        currency: 'INR',
        status: 'captured',
      });

      const mockTx = await Transaction.create({
        transactionId: `txn_inv_idemp_${Date.now()}`,
        user: testUserId,
        payment: mockPayment._id,
        amount: 499,
        currency: 'INR',
        status: 'success',
      });

      const inv1 = await generateInvoiceService({
        user: { _id: testUserId },
        transaction: mockTx,
        payment: mockPayment,
        planDetails: { name: 'Farmer Pro' },
      });

      const inv2 = await generateInvoiceService({
        user: { _id: testUserId },
        transaction: mockTx,
        payment: mockPayment,
        planDetails: { name: 'Farmer Pro' },
      });

      expect(inv1.invoiceNumber).toBe(inv2.invoiceNumber);
      expect(inv1._id.toString()).toBe(inv2._id.toString());

      const invCount = await Invoice.countDocuments({ transaction: mockTx._id });
      expect(invCount).toBe(1);
    });
  });
});
