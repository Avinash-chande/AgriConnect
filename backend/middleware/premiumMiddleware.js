import { AppError } from '../utils/appError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { User } from '../models/User.js';
import { Subscription } from '../models/Subscription.js';
import { SUBSCRIPTION_STATUS } from '../constants/index.js';
import { logger } from '../utils/logger.js';

// Default Grace Period: 3 days in milliseconds
export const DEFAULT_GRACE_PERIOD_DAYS = 3;
export const DEFAULT_GRACE_PERIOD_MS = DEFAULT_GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000;

/**
 * Check if subscription is within configurable grace period
 */
export const checkGracePeriod = (subscription, gracePeriodDays = DEFAULT_GRACE_PERIOD_DAYS) => {
  if (!subscription || !subscription.endDate) return false;
  const nowMs = Date.now();
  const endMs = new Date(subscription.endDate).getTime();
  const graceMs = gracePeriodDays * 24 * 60 * 60 * 1000;

  return nowMs > endMs && nowMs <= endMs + graceMs;
};

/**
 * Production-Ready Premium Authorization Middleware
 *
 * Verifies membership state directly from database Subscription records:
 * Checks: status, startDate, endDate, plan, and grace period window.
 * DOES NOT rely solely on boolean flags (e.g. `isPremium`).
 *
 * @param {Array<string>|string|Function} allowedPlans Optional plan ID(s) or standard req handler
 * @param {Object} options Configuration options ({ gracePeriodDays: 3 })
 */
export const requirePremiumAccess = (allowedPlans = [], options = {}) => {
  const targetPlans = Array.isArray(allowedPlans)
    ? allowedPlans
    : typeof allowedPlans === 'string' && allowedPlans.trim() !== ''
    ? [allowedPlans]
    : [];

  const graceDays = options.gracePeriodDays ?? DEFAULT_GRACE_PERIOD_DAYS;
  const graceMs = graceDays * 24 * 60 * 60 * 1000;

  return asyncHandler(async (req, res, next) => {
    // 1. Ensure User is Authenticated
    if (!req.user) {
      const error = new AppError('Authentication required. Please log in.', 401);
      error.code = 'UNAUTHORIZED';
      return next(error);
    }

    const userId = req.user._id;
    const now = new Date();
    const nowMs = now.getTime();

    // 2. Query MongoDB for latest Subscription record for this user
    const subscription = await Subscription.findOne({ user: userId }).sort({ createdAt: -1 });

    if (!subscription) {
      const error = new AppError(
        'Premium membership required. Please upgrade your plan to access this feature.',
        403
      );
      error.code = 'PREMIUM_REQUIRED';
      return next(error);
    }

    const { status, startDate, endDate, plan } = subscription;
    const startMs = new Date(startDate).getTime();
    const endMs = new Date(endDate).getTime();

    // 3. Verify Start Date
    if (startMs > nowMs) {
      const error = new AppError('Your subscription is scheduled to start at a future date.', 403);
      error.code = 'SUBSCRIPTION_PENDING';
      return next(error);
    }

    // 4. Verify Plan Tier (if specific plans are restricted by route)
    if (targetPlans.length > 0 && !targetPlans.includes(plan)) {
      const error = new AppError(
        `This feature requires one of the following plans: ${targetPlans.join(', ')}.`,
        403
      );
      error.code = 'PLAN_INSUFFICIENT';
      return next(error);
    }

    // 5. Evaluate Paid Active Period vs Grace Period vs Expiry
    const isWithinPaidPeriod = nowMs <= endMs;
    const isWithinGracePeriodWindow = nowMs > endMs && nowMs <= endMs + graceMs;

    // ACTIVE or CANCELLED within paid duration
    if (status === SUBSCRIPTION_STATUS.ACTIVE || status === SUBSCRIPTION_STATUS.CANCELLED) {
      if (isWithinPaidPeriod) {
        req.subscription = subscription;
        return next();
      }

      if (isWithinGracePeriodWindow) {
        logger.warn(`[PremiumMiddleware] User ${userId} accessing feature during ${graceDays}-day grace period.`);
        res.setHeader('X-Subscription-Grace-Period', 'true');
        req.subscription = subscription;
        req.isInGracePeriod = true;
        return next();
      }
    }

    // 6. Handle Expired State & Lazy Database Sync
    if (nowMs > endMs + graceMs) {
      if (subscription.status !== SUBSCRIPTION_STATUS.EXPIRED) {
        subscription.status = SUBSCRIPTION_STATUS.EXPIRED;
        await subscription.save();

        await User.findByIdAndUpdate(userId, {
          isPremium: false,
          subscriptionStatus: SUBSCRIPTION_STATUS.EXPIRED,
        });
      }

      const errorCode =
        status === SUBSCRIPTION_STATUS.CANCELLED ? 'SUBSCRIPTION_CANCELLED' : 'SUBSCRIPTION_EXPIRED';

      const error = new AppError(
        'Your premium subscription has expired. Please renew your plan to continue.',
        403
      );
      error.code = errorCode;
      return next(error);
    }

    // 7. Handle Paused State
    if (status === SUBSCRIPTION_STATUS.PAUSED) {
      const error = new AppError('Your subscription is currently paused.', 403);
      error.code = 'SUBSCRIPTION_PAUSED';
      return next(error);
    }

    // Fallback: Default Premium Required Error
    const error = new AppError(
      'Premium membership required. Please upgrade your plan to access this feature.',
      403
    );
    error.code = 'PREMIUM_REQUIRED';
    return next(error);
  });
};

/**
 * Standard Express Middleware wrapper for simple `requirePremium` usage
 */
export const requirePremium = (req, res, next) => {
  if (typeof req === 'function' || (!req && !res)) {
    return requirePremiumAccess();
  }
  return requirePremiumAccess()(req, res, next);
};

/**
 * Require Active Non-Expired Subscription
 */
export const requireActiveSubscription = (req, res, next) => {
  if (typeof req === 'function' || (!req && !res)) {
    return requirePremiumAccess();
  }
  return requirePremiumAccess()(req, res, next);
};
