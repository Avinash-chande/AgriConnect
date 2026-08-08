import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { Notification, NOTIFICATION_TYPE } from '../models/Notification.js';
import { createNotificationService } from '../services/notificationService.js';
import { getUnreadCountRepo } from '../repositories/notificationRepository.js';

describe('Payment & Premium Notifications Integration Test Suite', () => {
  let testUserId;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(
        process.env.MONGODB_TEST_URI || 'mongodb://127.0.0.1:27017/agriconnect_test_db'
      );
    }

    const u = await User.create({
      name: 'Notif User',
      email: `notif_user_${Date.now()}@agriconnect.com`,
      mobile: `+9198${Math.floor(10000000 + Math.random() * 90000000)}`,
      password: 'password123',
      role: 'Farmer',
    });
    testUserId = u._id;
  });

  afterAll(async () => {
    if (testUserId) await User.findByIdAndDelete(testUserId);
    await Notification.deleteMany({ recipient: testUserId });
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });

  it('should create and persist PAYMENT_SUCCESSFUL notification', async () => {
    const notif = await createNotificationService({
      type: NOTIFICATION_TYPE.PAYMENT_SUCCESSFUL,
      recipientId: testUserId,
      payload: { amount: 499, planName: 'Farmer Pro', transactionId: 'txn_12345' },
    });

    expect(notif).toBeDefined();
    expect(notif.title).toContain('Payment Successful');
    expect(notif.message).toContain('₹499');
    expect(notif.isRead).toBe(false);
  });

  it('should create and persist PREMIUM_ACTIVATED notification', async () => {
    const notif = await createNotificationService({
      type: NOTIFICATION_TYPE.PREMIUM_ACTIVATED,
      recipientId: testUserId,
      payload: { planName: 'Farmer Pro Monthly', expiryDate: '08/09/2026' },
    });

    expect(notif).toBeDefined();
    expect(notif.title).toContain('Premium Pro Activated');
    expect(notif.meta.icon).toBe('crown');
  });

  it('should create and persist REFUND_PROCESSED notification', async () => {
    const notif = await createNotificationService({
      type: NOTIFICATION_TYPE.REFUND_PROCESSED,
      recipientId: testUserId,
      payload: { amount: 499, refundId: 'rfnd_999' },
    });

    expect(notif).toBeDefined();
    expect(notif.title).toContain('Refund Processed');
    expect(notif.message).toContain('rfnd_999');
  });

  it('should create and persist FEATURED_JOB_ACTIVATED notification', async () => {
    const notif = await createNotificationService({
      type: NOTIFICATION_TYPE.FEATURED_JOB_ACTIVATED,
      recipientId: testUserId,
      payload: { jobTitle: 'Paddy Harvesting', durationDays: 14, jobId: testUserId },
    });

    expect(notif).toBeDefined();
    expect(notif.title).toContain('Featured Job Activated');
    expect(notif.message).toContain('Paddy Harvesting');
  });

  it('should correctly increment unread notification count', async () => {
    const unreadCount = await getUnreadCountRepo(testUserId);
    expect(unreadCount).toBeGreaterThanOrEqual(4);
  });
});
