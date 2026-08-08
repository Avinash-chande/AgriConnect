import { User } from '../models/User.js';
import { Subscription } from '../models/Subscription.js';
import { Job } from '../models/Job.js';
import { Notification, NOTIFICATION_TYPE } from '../models/Notification.js';
import { createNotificationService } from './notificationService.js';
import { SUBSCRIPTION_STATUS } from '../constants/index.js';
import { logger } from '../utils/logger.js';

/**
 * Sweeps and updates expired premium subscriptions.
 * Sets isPremium = false, subscriptionStatus = 'expired', and dispatches notification.
 */
export const handleExpiredSubscriptionsService = async () => {
  const now = new Date();

  // 1. Find users with expired subscriptions
  const expiredUsers = await User.find({
    isPremium: true,
    subscriptionExpiresAt: { $lte: now },
  });

  if (expiredUsers.length === 0) {
    return { processedUsersCount: 0 };
  }

  const expiredUserIds = expiredUsers.map((u) => u._id);

  // 2. Batch Update Users to Free / Expired status
  await User.updateMany(
    { _id: { $in: expiredUserIds } },
    {
      $set: {
        isPremium: false,
        subscriptionStatus: SUBSCRIPTION_STATUS.EXPIRED,
      },
    }
  );

  // 3. Batch Update Subscriptions to Expired status
  await Subscription.updateMany(
    { user: { $in: expiredUserIds }, status: SUBSCRIPTION_STATUS.ACTIVE },
    { $set: { status: SUBSCRIPTION_STATUS.EXPIRED } }
  );

  // 4. Batch check: which users already received an expiry notification in the last 24h
  const recentNotifCutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const recentNotifs = await Notification.find({
    recipient: { $in: expiredUserIds },
    type: NOTIFICATION_TYPE.PREMIUM_EXPIRED,
    createdAt: { $gte: recentNotifCutoff },
  }).select('recipient');

  const alreadyNotifiedSet = new Set(recentNotifs.map((n) => n.recipient.toString()));

  // 5. Send Expiration Notifications (Idempotent per user — O(1) Set lookup)
  for (const user of expiredUsers) {
    if (!alreadyNotifiedSet.has(user._id.toString())) {
      await createNotificationService({
        type: NOTIFICATION_TYPE.PREMIUM_EXPIRED,
        recipientId: user._id,
        resourceKind: 'User',
        resourceId: user._id,
      });
    }
  }

  logger.info(`[ExpirationService] Processed ${expiredUsers.length} expired premium subscriptions.`);
  return { processedUsersCount: expiredUsers.length };
};

/**
 * Sends expiring subscription reminders for users whose subscription expires within 3 days.
 */
export const handleExpiringSubscriptionRemindersService = async () => {
  const now = new Date();
  const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

  const expiringUsers = await User.find({
    isPremium: true,
    subscriptionExpiresAt: { $gt: now, $lte: threeDaysLater },
  });

  let remindedCount = 0;

  for (const user of expiringUsers) {
    const daysRemaining = Math.ceil(
      (new Date(user.subscriptionExpiresAt).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Idempotent Guard: Check if a reminder was sent within the last 24 hours
    const existingReminder = await Notification.findOne({
      recipient: user._id,
      type: NOTIFICATION_TYPE.PREMIUM_EXPIRING,
      createdAt: { $gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
    });

    if (!existingReminder) {
      await createNotificationService({
        type: NOTIFICATION_TYPE.PREMIUM_EXPIRING,
        recipientId: user._id,
        resourceKind: 'User',
        resourceId: user._id,
        payload: { daysRemaining },
      });
      remindedCount++;
    }
  }

  logger.info(`[ExpirationService] Dispatched ${remindedCount} expiring subscription reminders.`);
  return { remindedUsersCount: remindedCount };
};

/**
 * Sweeps and updates expired featured job promotions.
 * Sets isFeatured = false when featuredEndDate <= now.
 */
export const handleExpiredFeaturedJobsService = async () => {
  const now = new Date();

  const expiredJobs = await Job.find({
    isFeatured: true,
    featuredEndDate: { $lte: now },
  });

  if (expiredJobs.length === 0) {
    return { expiredJobsCount: 0 };
  }

  const expiredJobIds = expiredJobs.map((j) => j._id);

  await Job.updateMany(
    { _id: { $in: expiredJobIds } },
    { $set: { isFeatured: false } }
  );

  logger.info(`[ExpirationService] Reset ${expiredJobs.length} expired featured job vacancies.`);
  return { expiredJobsCount: expiredJobs.length };
};

/**
 * Runs all server-side expiration checks idempotently.
 */
export const runAllExpirationChecksService = async () => {
  logger.info('[ExpirationService] Starting server-side expiration sweep...');
  
  const subsResult = await handleExpiredSubscriptionsService();
  const remindersResult = await handleExpiringSubscriptionRemindersService();
  const jobsResult = await handleExpiredFeaturedJobsService();

  const summary = {
    timestamp: new Date(),
    expiredSubscriptionsProcessed: subsResult.processedUsersCount,
    expiringRemindersDispatched: remindersResult.remindedUsersCount,
    expiredFeaturedJobsReset: jobsResult.expiredJobsCount,
  };

  logger.info('[ExpirationService] Server-side expiration sweep completed:', summary);
  return summary;
};
