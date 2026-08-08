import { verifyWebhookSignature } from '../config/razorpay.js';
import { WebhookEvent } from '../models/WebhookEvent.js';
import { Payment } from '../models/Payment.js';
import { Transaction } from '../models/Transaction.js';
import { Subscription } from '../models/Subscription.js';
import { Refund } from '../models/Refund.js';
import { User } from '../models/User.js';
import { getResolvedPlanPriceService } from './planService.js';
import { generateInvoiceService } from './invoiceService.js';
import { createNotificationService } from './notificationService.js';
import { createNotificationRepo } from '../repositories/notificationRepository.js';
import { AppError } from '../utils/appError.js';
import { logger } from '../utils/logger.js';
import {
  PAYMENT_STATUS,
  SUBSCRIPTION_STATUS,
  TRANSACTION_TYPE,
  TRANSACTION_STATUS,
  REFUND_STATUS,
} from '../constants/index.js';
import { NOTIFICATION_TYPE } from '../models/Notification.js';

/**
 * Extensible Event Handler Dictionary
 */
const EVENT_HANDLERS = {
  // 1. Payment Captured Event
  'payment.captured': async (entity, eventData) => {
    const orderId = entity.order_id;
    const paymentId = entity.id;
    const amount = entity.amount ? entity.amount / 100 : 0;

    let payment = await Payment.findOne({ orderId });
    if (!payment) {
      logger.warn(`[WebhookService] Payment record for order ${orderId} not found. Creating webhook recovery payment record.`);
      const userId = entity.notes?.userId;
      if (!userId) return;

      payment = await Payment.create({
        user: userId,
        orderId,
        paymentId,
        provider: 'razorpay',
        amount,
        currency: entity.currency || 'INR',
        status: PAYMENT_STATUS.CAPTURED,
        paidAt: new Date(),
        metadata: { notes: entity.notes },
      });
    } else {
      payment.status = PAYMENT_STATUS.CAPTURED;
      payment.paymentId = paymentId;
      payment.paidAt = new Date();
      await payment.save();
    }

    // Check if Transaction exists
    let transaction = await Transaction.findOne({ razorpayPaymentId: paymentId });
    if (!transaction) {
      transaction = await Transaction.create({
        transactionId: `txn_wh_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        user: payment.user,
        payment: payment._id,
        type: TRANSACTION_TYPE.PAYMENT,
        amount: payment.amount,
        currency: payment.currency,
        status: TRANSACTION_STATUS.SUCCESS,
        razorpayPaymentId: paymentId,
        razorpayOrderId: orderId,
        gatewayResponse: entity,
      });
    }

    // Activate User Subscription if plan metadata present
    const planId = payment.metadata?.planId || entity.notes?.planId;
    if (planId) {
      const resolvedPlan = await getResolvedPlanPriceService(planId);
      const startDate = new Date();
      const durationDays = resolvedPlan.durationDays || 30;
      const endDate = new Date(startDate.getTime() + durationDays * 24 * 60 * 60 * 1000);

      await Subscription.findOneAndUpdate(
        { user: payment.user },
        {
          user: payment.user,
          plan: resolvedPlan.planId,
          status: SUBSCRIPTION_STATUS.ACTIVE,
          startDate,
          endDate,
          providerSubscriptionId: paymentId,
        },
        { upsert: true, new: true }
      );

      const userObj = await User.findByIdAndUpdate(
        payment.user,
        {
          isPremium: true,
          subscriptionPlan: resolvedPlan.planId,
          subscriptionExpiresAt: endDate,
          subscriptionStatus: SUBSCRIPTION_STATUS.ACTIVE,
        },
        { new: true }
      );

      // Generate Invoice
      if (userObj) {
        await generateInvoiceService({
          user: userObj,
          transaction,
          payment,
          planDetails: resolvedPlan,
        });
      }
    }
  },

  // 2. Payment Failed Event
  'payment.failed': async (entity) => {
    const orderId = entity.order_id;
    const paymentId = entity.id;
    const failureReason = entity.error_description || entity.error_reason || 'Payment failed at gateway';

    const payment = await Payment.findOne({ orderId });
    if (payment) {
      payment.status = PAYMENT_STATUS.FAILED;
      payment.failureReason = failureReason;
      await payment.save();

      await Transaction.create({
        transactionId: `txn_fail_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        user: payment.user,
        payment: payment._id,
        type: TRANSACTION_TYPE.PAYMENT,
        amount: payment.amount,
        currency: payment.currency,
        status: TRANSACTION_STATUS.FAILED,
        razorpayPaymentId: paymentId || '',
        razorpayOrderId: orderId || '',
        gatewayResponse: entity,
      });
      await createNotificationService({
        type: NOTIFICATION_TYPE.PAYMENT_FAILED,
        recipientId: payment.user,
        resourceKind: 'Payment',
        resourceId: payment._id,
        payload: {
          amount: payment.amount,
          planName: 'AgriConnect Subscription',
          orderId,
          reason: failureReason,
        },
      });
    }
  },

  // 3. Refund Processed Event
  'refund.processed': async (entity) => {
    const refundId = entity.id;
    const paymentId = entity.payment_id;
    const amount = entity.amount ? entity.amount / 100 : 0;

    const payment = await Payment.findOne({ paymentId });
    if (!payment) return;

    payment.status = PAYMENT_STATUS.REFUNDED;
    await payment.save();

    const transaction = await Transaction.findOne({ razorpayPaymentId: paymentId });

    await Refund.findOneAndUpdate(
      { refundId },
      {
        refundId: `rfnd_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        providerRefundId: refundId,
        payment: payment._id,
        transaction: transaction ? transaction._id : null,
        user: payment.user,
        amount: amount,
        currency: payment.currency,
        reason: entity.notes?.reason || 'Refund processed via webhook',
        status: REFUND_STATUS.PROCESSED,
        metadata: entity,
      },
      { upsert: true, new: true }
    );

    // Cancel active subscription on full refund
    await Subscription.findOneAndUpdate(
      { user: payment.user, status: SUBSCRIPTION_STATUS.ACTIVE },
      { status: SUBSCRIPTION_STATUS.CANCELLED, cancelledAt: new Date() }
    );

    await User.findByIdAndUpdate(payment.user, {
      isPremium: false,
      subscriptionStatus: SUBSCRIPTION_STATUS.CANCELLED,
    });
  },

  // 4. Subscription Cancelled Event
  'subscription.cancelled': async (entity) => {
    const userId = entity.notes?.userId;
    if (!userId) return;

    await Subscription.findOneAndUpdate(
      { user: userId, status: SUBSCRIPTION_STATUS.ACTIVE },
      { status: SUBSCRIPTION_STATUS.CANCELLED, cancelledAt: new Date() }
    );

    await User.findByIdAndUpdate(userId, {
      isPremium: false,
      subscriptionStatus: SUBSCRIPTION_STATUS.CANCELLED,
    });
  },
};

/**
 * Process Razorpay Webhook Event with Raw Body HMAC Signature & Idempotency
 */
export const processRazorpayWebhookService = async ({ rawBody, signature }) => {
  if (!rawBody || !signature) {
    throw new AppError('Missing webhook payload body or x-razorpay-signature header.', 400);
  }

  // 1. Verify Webhook HMAC SHA256 Signature
  const isValidSignature = verifyWebhookSignature({ rawBody, signature });
  if (!isValidSignature) {
    logger.error('[WebhookService] Razorpay webhook signature verification failed.');
    throw new AppError('Invalid webhook cryptographic signature.', 400);
  }

  // 2. Parse JSON Payload from Raw Buffer
  let webhookPayload;
  try {
    const bodyStr = Buffer.isBuffer(rawBody) ? rawBody.toString('utf-8') : rawBody;
    webhookPayload = JSON.parse(bodyStr);
  } catch (err) {
    throw new AppError('Invalid JSON payload in webhook body.', 400);
  }

  const eventName = webhookPayload.event;
  const eventId = webhookPayload.event_id || `${eventName}_${webhookPayload.created_at || Date.now()}`;
  const containsEntity = webhookPayload.payload;
  const entity = containsEntity
    ? containsEntity.payment?.entity || containsEntity.refund?.entity || containsEntity.subscription?.entity || {}
    : {};

  logger.info(`[WebhookService] Received Razorpay Webhook Event: '${eventName}' (ID: ${eventId})`);

  // 3. Idempotency Check: Prevent duplicate webhook processing
  const existingEvent = await WebhookEvent.findOne({ eventId });
  if (existingEvent) {
    logger.info(`[WebhookService] Duplicate webhook event ${eventId} already processed. Skipping.`);
    return {
      status: 'ignored',
      message: `Webhook event '${eventId}' already processed.`,
    };
  }

  // 4. Execute Extensible Event Handler
  const handler = EVENT_HANDLERS[eventName];
  let processingStatus = 'processed';
  let errorDetails = '';

  if (handler) {
    try {
      await handler(entity, webhookPayload);
      logger.info(`[WebhookService] Successfully executed handler for '${eventName}'`);
    } catch (err) {
      processingStatus = 'failed';
      errorDetails = err.message;
      logger.error(`[WebhookService] Error executing handler for '${eventName}': ${err.message}`);
    }
  } else {
    processingStatus = 'ignored';
    logger.warn(`[WebhookService] No custom handler registered for event type '${eventName}'. Safely ignoring.`);
  }

  // 5. Store Webhook Event Log in MongoDB for Auditing & Idempotency
  await WebhookEvent.create({
    eventId,
    event: eventName,
    payload: {
      event: eventName,
      entityId: entity.id,
      amount: entity.amount,
    },
    status: processingStatus,
    errorDetails,
  });

  return {
    status: processingStatus,
    event: eventName,
    eventId,
    message: 'Webhook processed successfully.',
  };
};
