import mongoose from 'mongoose';
import { Payment } from '../models/Payment.js';
import { Transaction } from '../models/Transaction.js';
import { Subscription } from '../models/Subscription.js';
import { Invoice } from '../models/Invoice.js';
import { Refund } from '../models/Refund.js';
import { User } from '../models/User.js';
import {
  PAYMENT_STATUS,
  SUBSCRIPTION_STATUS,
  TRANSACTION_TYPE,
  TRANSACTION_STATUS,
  INVOICE_STATUS,
  REFUND_STATUS,
} from '../constants/index.js';

describe('Phase 9 Database Models Test Suite', () => {
  let sampleUserId;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(
        process.env.MONGODB_TEST_URI || 'mongodb://127.0.0.1:27017/agriconnect_test_db'
      );
    }
    sampleUserId = new mongoose.Types.ObjectId();
  });

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });

  describe('Payment Model', () => {
    it('should validate required fields and create a valid Payment document', () => {
      const paymentData = {
        user: sampleUserId,
        orderId: 'order_test_12345',
        amount: 99900,
        currency: 'INR',
        provider: 'razorpay',
        status: PAYMENT_STATUS.CREATED,
        metadata: { planId: 'FARMER_PRO_MONTHLY', cardNumber: '4111111111111111' },
      };

      const payment = new Payment(paymentData);
      const validationError = payment.validateSync();
      expect(validationError).toBeUndefined();
      expect(payment.status).toBe('created');
      expect(payment.amount).toBe(99900);
    });

    it('should fail validation if orderId or amount is missing', () => {
      const payment = new Payment({
        user: sampleUserId,
      });

      const err = payment.validateSync();
      expect(err.errors.orderId).toBeDefined();
      expect(err.errors.amount).toBeDefined();
    });

    it('should strip sensitive credit card information in pre-save hook', async () => {
      const payment = new Payment({
        user: sampleUserId,
        orderId: 'order_security_check_' + Date.now(),
        amount: 500,
        metadata: {
          planId: 'WORKER_PRO_MONTHLY',
          cardNumber: '1234567890123456',
          cvv: '999',
        },
      });

      // Execute pre-save hook manually
      await new Promise((resolve) => payment.schema.s.hooks.execPre('save', payment, resolve));

      expect(payment.metadata.cardNumber).toBeUndefined();
      expect(payment.metadata.cvv).toBeUndefined();
      expect(payment.metadata.planId).toBe('WORKER_PRO_MONTHLY');
    });
  });

  describe('Transaction Model', () => {
    it('should create and validate a Transaction document', () => {
      const samplePaymentId = new mongoose.Types.ObjectId();
      const transaction = new Transaction({
        transactionId: 'txn_test_' + Date.now(),
        user: sampleUserId,
        payment: samplePaymentId,
        type: TRANSACTION_TYPE.PAYMENT,
        amount: 999,
        currency: 'INR',
        status: TRANSACTION_STATUS.SUCCESS,
        razorpayPaymentId: 'pay_test_9999',
        razorpayOrderId: 'order_test_12345',
        razorpaySignature: 'sample_sig',
      });

      const err = transaction.validateSync();
      expect(err).toBeUndefined();
      expect(transaction.status).toBe('success');
      expect(transaction.type).toBe('payment');
    });

    it('should reject invalid transaction type or status', () => {
      const transaction = new Transaction({
        transactionId: 'txn_invalid',
        user: sampleUserId,
        payment: new mongoose.Types.ObjectId(),
        amount: 100,
        type: 'invalid_type',
        status: 'invalid_status',
      });

      const err = transaction.validateSync();
      expect(err.errors.type).toBeDefined();
      expect(err.errors.status).toBeDefined();
    });
  });

  describe('Subscription Model', () => {
    it('should validate and create a Subscription document with active status virtual', () => {
      const startDate = new Date();
      const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      const subscription = new Subscription({
        user: sampleUserId,
        plan: 'FARMER_PRO_MONTHLY',
        status: SUBSCRIPTION_STATUS.ACTIVE,
        startDate,
        endDate,
        autoRenew: false,
      });

      const err = subscription.validateSync();
      expect(err).toBeUndefined();
      expect(subscription.isActive).toBe(true);
    });

    it('should fail validation if endDate is before startDate', () => {
      const startDate = new Date();
      const endDate = new Date(Date.now() - 10000);

      const subscription = new Subscription({
        user: sampleUserId,
        plan: 'FARMER_PRO_MONTHLY',
        status: SUBSCRIPTION_STATUS.ACTIVE,
        startDate,
        endDate,
      });

      const err = subscription.validateSync();
      expect(err.errors.endDate).toBeDefined();
    });
  });

  describe('Invoice Model', () => {
    it('should validate and create an Invoice with line items', () => {
      const invoice = new Invoice({
        invoiceNumber: 'INV-202608-0001',
        user: sampleUserId,
        transaction: new mongoose.Types.ObjectId(),
        amount: 1178.82,
        tax: 179.82,
        currency: 'INR',
        status: INVOICE_STATUS.PAID,
        items: [
          {
            description: 'Farmer Pro Annual Membership',
            quantity: 1,
            unitPrice: 999,
            amount: 999,
          },
        ],
      });

      const err = invoice.validateSync();
      expect(err).toBeUndefined();
      expect(invoice.items.length).toBe(1);
      expect(invoice.amount).toBe(1178.82);
    });

    it('should require at least one line item', () => {
      const invoice = new Invoice({
        invoiceNumber: 'INV-EMPTY',
        user: sampleUserId,
        transaction: new mongoose.Types.ObjectId(),
        amount: 100,
        items: [],
      });

      const err = invoice.validateSync();
      expect(err.errors.items).toBeDefined();
    });
  });

  describe('Refund Model', () => {
    it('should create and validate a Refund document', () => {
      const refund = new Refund({
        refundId: 'rfnd_test_123',
        providerRefundId: 'rfnd_rzp_999',
        payment: new mongoose.Types.ObjectId(),
        transaction: new mongoose.Types.ObjectId(),
        user: sampleUserId,
        amount: 999,
        reason: 'Customer requested cancellation',
        status: REFUND_STATUS.PROCESSED,
      });

      const err = refund.validateSync();
      expect(err).toBeUndefined();
      expect(refund.status).toBe('processed');
    });
  });
});
