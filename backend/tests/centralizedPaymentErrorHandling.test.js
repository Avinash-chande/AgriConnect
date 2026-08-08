import request from 'supertest';
import mongoose from 'mongoose';
import app from '../app.js';
import { User } from '../models/User.js';
import { PaymentError } from '../utils/paymentError.js';
import { PAYMENT_ERROR_CODES } from '../constants/paymentErrorCodes.js';
import { jwtConfig } from '../config/jwt.js';
import jwt from 'jsonwebtoken';

describe('Centralized Payment Error Handling Integration Test Suite', () => {
  let freeUserToken;
  let freeUserId;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(
        process.env.MONGODB_TEST_URI || 'mongodb://127.0.0.1:27017/agriconnect_test_db'
      );
    }

    const freeUser = await User.create({
      name: 'Free Member Error Test',
      email: `err_free_${Date.now()}@agriconnect.com`,
      mobile: `+9198${Math.floor(10000000 + Math.random() * 90000000)}`,
      password: 'password123',
      role: 'Farmer',
      isPremium: false,
    });
    freeUserId = freeUser._id;
    freeUserToken = jwt.sign({ id: freeUser._id, role: freeUser.role }, jwtConfig.accessSecret, { expiresIn: '1h' });
  });

  afterAll(async () => {
    if (freeUserId) await User.findByIdAndDelete(freeUserId);
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });

  it('should instantiate PaymentError with correct code and statusCode', () => {
    const err = new PaymentError('Invalid membership plan', 400, PAYMENT_ERROR_CODES.INVALID_PLAN);
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe('INVALID_PLAN');
    expect(err.isOperational).toBe(true);
  });

  it('should return standardized JSON response format on invalid payment order request', async () => {
    const res = await request(app)
      .post('/api/v1/payments/orders')
      .send({}); // Missing Authorization header

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBeDefined();
  });

  it('should return standardized JSON error response code for non-existent payment order verification', async () => {
    const res = await request(app)
      .post('/api/v1/payments/verify')
      .set('Authorization', `Bearer ${freeUserToken}`)
      .send({
        razorpay_order_id: 'order_invalid_123',
        razorpay_payment_id: 'pay_invalid_123',
        razorpay_signature: 'invalid_signature_hash',
      });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBeDefined();
  });

  it('should return standardized JSON error response for invalid plan order creation', async () => {
    const res = await request(app)
      .post('/api/v1/payments/orders')
      .set('Authorization', `Bearer ${freeUserToken}`)
      .send({ planId: 'invalid_nonexistent_plan' });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('invalid');
  });
});
