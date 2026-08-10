import { Notification, NOTIFICATION_TYPE } from '../models/Notification.js';
import { User } from '../models/User.js';
import { AppError } from '../utils/appError.js';
import { logAuditEvent } from './auditLogger.js';
import { AUDIT_CATEGORY, AUDIT_SEVERITY } from '../constants/index.js';

/**
 * Admin Notification Service — Broadcast & Targeted Announcements
 */

export const broadcastNotification = async ({ title, message, targetRole = 'ALL' }, adminUser) => {
  if (!title || !message) {
    throw new AppError('Title and message are required', 400);
  }

  const userFilter = {};
  if (targetRole !== 'ALL') {
    userFilter.role = targetRole;
  }

  const users = await User.find(userFilter).select('_id').lean();
  if (users.length === 0) {
    throw new AppError('No matching users found for broadcast', 404);
  }

  const notifications = users.map((u) => ({
    recipient: u._id,
    sender: adminUser._id,
    type: NOTIFICATION_TYPE.SYSTEM,
    title,
    message,
    meta: { isBroadcast: true, targetRole },
  }));

  // Bulk insert notifications
  await Notification.insertMany(notifications);

  await logAuditEvent({
    actor: adminUser._id,
    action: 'ADMIN_NOTIFICATION_BROADCAST',
    status: 'SUCCESS',
    details: { title, targetRole, recipientCount: users.length },
    category: AUDIT_CATEGORY.ADMIN,
    severity: AUDIT_SEVERITY.INFO,
  });

  return { recipientCount: users.length, title };
};

export const sendTargetedNotification = async ({ recipientIds, title, message }, adminUser) => {
  if (!Array.isArray(recipientIds) || recipientIds.length === 0) {
    throw new AppError('Recipient IDs array is required', 400);
  }
  if (!title || !message) {
    throw new AppError('Title and message are required', 400);
  }

  const notifications = recipientIds.map((userId) => ({
    recipient: userId,
    sender: adminUser._id,
    type: NOTIFICATION_TYPE.SYSTEM,
    title,
    message,
    meta: { isTargeted: true },
  }));

  await Notification.insertMany(notifications);

  await logAuditEvent({
    actor: adminUser._id,
    action: 'ADMIN_NOTIFICATION_TARGETED',
    status: 'SUCCESS',
    details: { title, recipientCount: recipientIds.length },
    category: AUDIT_CATEGORY.ADMIN,
    severity: AUDIT_SEVERITY.INFO,
  });

  return { recipientCount: recipientIds.length, title };
};
