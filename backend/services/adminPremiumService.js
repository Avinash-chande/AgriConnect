import { Subscription } from '../models/Subscription.js';
import { User } from '../models/User.js';
import { AppError } from '../utils/appError.js';
import { logAuditEvent } from './auditLogger.js';
import { SUBSCRIPTION_STATUS, AUDIT_CATEGORY, AUDIT_SEVERITY } from '../constants/index.js';

/**
 * Admin Premium & Subscription Management Service
 */

export const getSubscriptions = async ({
  page = 1,
  limit = 20,
  status = '',
  plan = '',
  sortBy = 'createdAt',
  sortOrder = 'desc',
} = {}) => {
  const filter = {};
  if (status) filter.status = status;
  if (plan) filter.plan = plan;

  const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };
  const skip = (page - 1) * limit;

  const [subscriptions, total] = await Promise.all([
    Subscription.find(filter)
      .populate('user', 'name email role profileImage mobile isPremium')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    Subscription.countDocuments(filter),
  ]);

  return {
    subscriptions,
    pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / limit) },
  };
};

export const grantPremium = async ({ userId, planName = 'gold_monthly', durationDays = 30 }, adminUser) => {
  const user = await User.findById(userId);
  if (!user) throw new AppError('User not found', 404);

  const startDate = new Date();
  const endDate = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);

  // Deactivate any existing active subscriptions
  await Subscription.updateMany(
    { user: userId, status: SUBSCRIPTION_STATUS.ACTIVE },
    { status: SUBSCRIPTION_STATUS.CANCELLED, cancelledAt: startDate }
  );

  const subscription = await Subscription.create({
    user: userId,
    plan: planName,
    status: SUBSCRIPTION_STATUS.ACTIVE,
    startDate,
    endDate,
    autoRenew: false,
  });

  user.isPremium = true;
  user.subscriptionPlan = planName;
  user.subscriptionExpiresAt = endDate;
  user.subscriptionStatus = SUBSCRIPTION_STATUS.ACTIVE;
  await user.save();

  await logAuditEvent({
    actor: adminUser._id,
    action: 'PREMIUM_GRANTED',
    status: 'SUCCESS',
    details: { targetUser: userId, planName, durationDays, endDate },
    resource: { kind: 'User', id: userId },
    category: AUDIT_CATEGORY.ADMIN,
    severity: AUDIT_SEVERITY.INFO,
  });

  return { user, subscription };
};

export const revokePremium = async (subscriptionId, adminUser) => {
  const subscription = await Subscription.findById(subscriptionId);
  if (!subscription) throw new AppError('Subscription record not found', 404);

  subscription.status = SUBSCRIPTION_STATUS.CANCELLED;
  subscription.cancelledAt = new Date();
  await subscription.save();

  await User.findByIdAndUpdate(subscription.user, {
    isPremium: false,
    subscriptionStatus: SUBSCRIPTION_STATUS.CANCELLED,
  });

  await logAuditEvent({
    actor: adminUser._id,
    action: 'PREMIUM_REVOKED',
    status: 'SUCCESS',
    details: { subscriptionId, userId: subscription.user },
    resource: { kind: 'User', id: subscription.user },
    category: AUDIT_CATEGORY.ADMIN,
    severity: AUDIT_SEVERITY.WARNING,
  });

  return subscription;
};

export const extendSubscription = async (subscriptionId, { additionalDays = 30 }, adminUser) => {
  const subscription = await Subscription.findById(subscriptionId);
  if (!subscription) throw new AppError('Subscription record not found', 404);

  const currentEndDate = subscription.endDate ? new Date(subscription.endDate) : new Date();
  const newEndDate = new Date(currentEndDate.getTime() + additionalDays * 24 * 60 * 60 * 1000);

  subscription.endDate = newEndDate;
  subscription.status = SUBSCRIPTION_STATUS.ACTIVE;
  await subscription.save();

  await User.findByIdAndUpdate(subscription.user, {
    isPremium: true,
    subscriptionExpiresAt: newEndDate,
    subscriptionStatus: SUBSCRIPTION_STATUS.ACTIVE,
  });

  await logAuditEvent({
    actor: adminUser._id,
    action: 'PREMIUM_EXTENDED',
    status: 'SUCCESS',
    details: { subscriptionId, additionalDays, newEndDate },
    resource: { kind: 'User', id: subscription.user },
    category: AUDIT_CATEGORY.ADMIN,
    severity: AUDIT_SEVERITY.INFO,
  });

  return subscription;
};
