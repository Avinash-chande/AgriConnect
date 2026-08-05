import {
  createNotificationRepo,
  getNotificationsByRecipientRepo,
  countNotificationsRepo,
  getUnreadCountRepo,
  markNotificationReadRepo,
  markAllNotificationsReadRepo,
  deleteNotificationRepo,
} from '../repositories/notificationRepository.js';
import { NOTIFICATION_TYPE } from '../models/Notification.js';
import { emitToUser } from '../socket/socketService.js';
import { SOCKET_EVENTS } from '../socket/socketEvents.js';
import { AppError } from '../utils/appError.js';
import { HTTP_STATUS } from '../constants/index.js';
import { logger } from '../utils/logger.js';

const NOTIFICATION_BUILDERS = {
  [NOTIFICATION_TYPE.APPLICATION_APPLIED]: ({ workerName, jobTitle, applicationId, jobId }) => ({
    title: 'New Job Application Received',
    message: `${workerName} has applied for your job posting: "${jobTitle}".`,
    meta: { icon: 'send', color: 'indigo', jobTitle, applicationId, jobId },
  }),

  [NOTIFICATION_TYPE.APPLICATION_ACCEPTED]: ({ farmerName, jobTitle, applicationId, jobId }) => ({
    title: 'Application Accepted 🎉',
    message: `Congratulations! ${farmerName} has accepted your application for "${jobTitle}".`,
    meta: { icon: 'check-circle', color: 'emerald', jobTitle, applicationId, jobId },
  }),

  [NOTIFICATION_TYPE.APPLICATION_REJECTED]: ({ farmerName, jobTitle, applicationId, jobId, reason }) => ({
    title: 'Application Update',
    message: `${farmerName} has reviewed your application for "${jobTitle}" and it was not selected.${reason ? ` Reason: "${reason}"` : ''}`,
    meta: { icon: 'x-circle', color: 'rose', jobTitle, applicationId, jobId, reason },
  }),

  [NOTIFICATION_TYPE.APPLICATION_SHORTLISTED]: ({ farmerName, jobTitle, applicationId, jobId }) => ({
    title: 'You\'ve Been Shortlisted! ⭐',
    message: `${farmerName} shortlisted your profile for "${jobTitle}". You\'re one step closer!`,
    meta: { icon: 'star', color: 'blue', jobTitle, applicationId, jobId },
  }),

  [NOTIFICATION_TYPE.APPLICATION_WITHDRAWN]: ({ workerName, jobTitle, applicationId, jobId }) => ({
    title: 'Application Withdrawn',
    message: `${workerName} has withdrawn their application for "${jobTitle}".`,
    meta: { icon: 'log-out', color: 'slate', jobTitle, applicationId, jobId },
  }),

  [NOTIFICATION_TYPE.APPLICATION_CANCELLED]: ({ farmerName, jobTitle, applicationId, jobId, reason }) => ({
    title: 'Hiring Arrangement Cancelled',
    message: `${farmerName} has cancelled your hiring for "${jobTitle}".${reason ? ` Reason: "${reason}"` : ''}`,
    meta: { icon: 'ban', color: 'amber', jobTitle, applicationId, jobId, reason },
  }),

  [NOTIFICATION_TYPE.APPLICATION_HIRED]: ({ farmerName, jobTitle, applicationId, jobId }) => ({
    title: 'You\'re Hired! 🎊',
    message: `Welcome aboard! ${farmerName} has officially hired you for "${jobTitle}".`,
    meta: { icon: 'briefcase', color: 'emerald', jobTitle, applicationId, jobId },
  }),

  [NOTIFICATION_TYPE.CHAT_MESSAGE]: ({ senderName, messageSnippet, conversationId }) => ({
    title: `New Message from ${senderName}`,
    message: messageSnippet ? `"${messageSnippet}"` : 'Sent you a message.',
    meta: { icon: 'message-square', color: 'emerald', conversationId, senderName },
  }),

  [NOTIFICATION_TYPE.JOB_CLOSED]: ({ farmerName, jobTitle, jobId }) => ({
    title: 'Job Posting Closed',
    message: `The job posting "${jobTitle}" has been closed by ${farmerName}.`,
    meta: { icon: 'lock', color: 'slate', jobTitle, jobId },
  }),

  [NOTIFICATION_TYPE.USER_VERIFIED]: ({ userName }) => ({
    title: 'Verification Approved ✔️',
    message: `Congratulations ${userName}! Your profile verification request has been approved.`,
    meta: { icon: 'shield-check', color: 'emerald' },
  }),
};

export const createNotificationService = async ({
  type,
  recipientId,
  senderId = null,
  resourceId = null,
  resourceKind = null,
  payload = {},
}) => {
  try {
    const builder = NOTIFICATION_BUILDERS[type];
    if (!builder) throw new AppError(`Unknown notification type: ${type}`, HTTP_STATUS.BAD_REQUEST);

    const { title, message, meta } = builder(payload);

    const notification = await createNotificationRepo({
      recipient: recipientId,
      sender: senderId || null,
      type,
      title,
      message,
      resource: {
        kind: resourceKind,
        id: resourceId,
      },
      meta,
    });

    logger.info(`[Notification] ${type} → user:${recipientId}`);

    // Socket.IO real-time notification dispatch hook via socketService
    emitToUser(recipientId, SOCKET_EVENTS.NOTIFICATION_NEW, notification);

    return notification;
  } catch (err) {
    logger.warn(`[Notification] Failed to create ${type} notification: ${err.message}`);
    return null;
  }
};

export const getNotificationsService = async (userId, query = {}) => {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(50, parseInt(query.limit) || 20);
  const skip = (page - 1) * limit;

  const filter = {};
  if (query.unreadOnly === 'true') filter.isRead = false;
  if (query.type) filter.type = query.type;

  const [notifications, total, unreadCount] = await Promise.all([
    getNotificationsByRecipientRepo(userId, filter, skip, limit),
    countNotificationsRepo(userId, filter),
    getUnreadCountRepo(userId),
  ]);

  return {
    notifications,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page * limit < total,
      hasPrevPage: page > 1,
    },
    unreadCount,
  };
};

export const getUnreadCountService = async (userId) => {
  return await getUnreadCountRepo(userId);
};

export const markNotificationReadService = async (notificationId, userId) => {
  const notification = await markNotificationReadRepo(notificationId, userId);
  if (!notification) {
    throw new AppError('Notification not found or not owned by you', HTTP_STATUS.NOT_FOUND);
  }
  return notification;
};

export const markAllNotificationsReadService = async (userId) => {
  const result = await markAllNotificationsReadRepo(userId);
  return { modifiedCount: result.modifiedCount };
};

export const deleteNotificationService = async (notificationId, userId) => {
  const deleted = await deleteNotificationRepo(notificationId, userId);
  if (!deleted) {
    throw new AppError('Notification not found or not owned by you', HTTP_STATUS.NOT_FOUND);
  }
  return deleted;
};

export const notifyApplicationApplied = (opts) =>
  createNotificationService({ type: NOTIFICATION_TYPE.APPLICATION_APPLIED, ...opts });

export const notifyApplicationAccepted = (opts) =>
  createNotificationService({ type: NOTIFICATION_TYPE.APPLICATION_ACCEPTED, ...opts });

export const notifyApplicationRejected = (opts) =>
  createNotificationService({ type: NOTIFICATION_TYPE.APPLICATION_REJECTED, ...opts });

export const notifyApplicationShortlisted = (opts) =>
  createNotificationService({ type: NOTIFICATION_TYPE.APPLICATION_SHORTLISTED, ...opts });

export const notifyApplicationWithdrawn = (opts) =>
  createNotificationService({ type: NOTIFICATION_TYPE.APPLICATION_WITHDRAWN, ...opts });

export const notifyApplicationCancelled = (opts) =>
  createNotificationService({ type: NOTIFICATION_TYPE.APPLICATION_CANCELLED, ...opts });

export const notifyApplicationHired = (opts) =>
  createNotificationService({ type: NOTIFICATION_TYPE.APPLICATION_HIRED, ...opts });

export const notifyChatMessage = (opts) =>
  createNotificationService({ type: NOTIFICATION_TYPE.CHAT_MESSAGE, ...opts });

export const notifyJobClosed = (opts) =>
  createNotificationService({ type: NOTIFICATION_TYPE.JOB_CLOSED, ...opts });

export const notifyVerificationApproved = (opts) =>
  createNotificationService({ type: NOTIFICATION_TYPE.USER_VERIFIED, ...opts });
