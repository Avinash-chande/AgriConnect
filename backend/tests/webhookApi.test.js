import request from 'supertest';
import mongoose from 'mongoose';
import app from '../app.js';
import { User } from '../models/User.js';
import { Payment } from '../models/Payment.js';
import { Transaction } from '../models/Transaction.js';
import { Subscription } from '../models/Subscription.js';
import { Refund } from '../models/Refund.js';
import { WebhookEvent } from '../models/WebhookEvent.js';
import crypto from 'crypto';

describe('Razorpay Webhook API System Test Suite', () => {
  let testUserId;
  let sampleOrder;
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || 'agriconnect_webhook_secret_2026';

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(
        process.env.MONGODB_TEST_URI || 'mongodb://127.0.0.1:27017/agriconnect_test_db'
      );
    }

    // Create test user
    const user = await User.create({
      name: 'Webhook Test User',
      email: `webhook_${Date.now()}@agriconnect.com`,
      mobile: `+9198${Math.floor(10000000 + Math.random() * 90000000)}`,
      password: 'password123',
      role: 'Farmer',
      isVerified: true,
    });
    testUserId = user._id;

    // Create sample Payment record in DB
    sampleOrder = await Payment.create({
      user: testUserId,
      orderId: `order_wh_test_${Date.now()}`,
      provider: 'razorpay',
      amount: 499,
      currency: 'INR',
      status: 'created',
      purpose: 'subscription',
      metadata: { planId: 'farmer_pro_monthly' },
    });
  });

  afterAll(async () => {
    if (testUserId) {
      await User.findByIdAndDelete(testUserId);
      await Payment.deleteMany({ user: testUserId });
      await Transaction.deleteMany({ user: testUserId });
      await Subscription.deleteMany({ user: testUserId });
      await Refund.deleteMany({ user: testUserId });
      await WebhookEvent.deleteMany({});
    }
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });

  it('should return 400 Bad Request when signature header is missing', async () => {
    const res = await request(app)
      .post('/api/v1/payments/webhook')
      .set('Content-Type', 'application/json')
      .send({ event: 'payment.captured' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('should return 400 Bad Request when signature is invalid', async () => {
    const res = await request(app)
      .post('/api/v1/payments/webhook')
      .set('Content-Type', 'application/json')
      .set('x-razorpay-signature', 'invalid_signature_hash_1234567890123456789012345678901234567890123456789012345678901234')
      .send({ event: 'payment.captured' });

    expect(res.status).toBe(400);
  });

  it('should process payment.captured event and activate premium membership', async () => {
    const payloadObj = {
      entity: 'event',
      account_id: 'acc_test_123',
      event: 'payment.captured',
      event_id: `evt_cap_${Date.now()}`,
      contains: ['payment'],
      payload: {
        payment: {
          entity: {
            id: `pay_wh_${Date.now()}`,
            entity: 'payment',
            amount: 49900,
            currency: 'INR',
            status: 'captured',
            order_id: sampleOrder.orderId,
            notes: {
              userId: testUserId.toString(),
              planId: 'farmer_pro_monthly',
            },
          },
        },
      },
      created_at: Math.floor(Date.now() / 1000),
    };

    const rawPayload = JSON.stringify(payloadObj);
    const signature = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawPayload)
      .digest('hex');

    const res = await request(app)
      .post('/api/v1/payments/webhook')
      .set('Content-Type', 'application/json')
      .set('x-razorpay-signature', signature)
      .send(rawPayload);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Verify User in DB became premium
    const updatedUser = await User.findById(testUserId);
    expect(updatedUser.isPremium).toBe(true);
    expect(updatedUser.subscriptionPlan).toBe('farmer_pro_monthly');

    // Verify Payment status updated to captured
    const updatedPayment = await Payment.findById(sampleOrder._id);
    expect(updatedPayment.status).toBe('captured');
  });

  it('should enforce idempotency for duplicate webhook event_id', async () => {
    const duplicateEventId = `evt_idempotent_${Date.now()}`;
    const payloadObj = {
      event: 'payment.failed',
      event_id: duplicateEventId,
      payload: {
        payment: {
          entity: {
            id: `pay_failed_${Date.now()}`,
            order_id: sampleOrder.orderId,
            error_description: 'Card declined by issuing bank',
          },
        },
      },
    };

    const rawPayload = JSON.stringify(payloadObj);
    const signature = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawPayload)
      .digest('hex');

    // First request
    const res1 = await request(app)
      .post('/api/v1/payments/webhook')
      .set('Content-Type', 'application/json')
      .set('x-razorpay-signature', signature)
      .send(rawPayload);

    expect(res1.status).toBe(200);

    // Second request with identical event_id
    const res2 = await request(app)
      .post('/api/v1/payments/webhook')
      .set('Content-Type', 'application/json')
      .set('x-razorpay-signature', signature)
      .send(rawPayload);

    expect(res2.status).toBe(200);
    expect(res2.body.data.status).toBe('ignored');
    expect(res2.body.data.message).toContain('already processed');
  });

  it('should handle unhandled/unknown events safely with HTTP 200', async () => {
    const payloadObj = {
      event: 'unknown.custom_test_event',
      event_id: `evt_unknown_${Date.now()}`,
      payload: {},
    };

    const rawPayload = JSON.stringify(payloadObj);
    const signature = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawPayload)
      .digest('hex');

    const res = await request(app)
      .post('/api/v1/payments/webhook')
      .set('Content-Type', 'application/json')
      .set('x-razorpay-signature', signature)
      .send(rawPayload);

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('ignored');
  });
});
