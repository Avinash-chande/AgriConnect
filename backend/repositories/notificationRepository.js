import { Notification } from '../models/Notification.js';

/**
 * Notification Repository — Data Access Interface
 */

export const createNotificationRepo = async (data) => {
  return await Notification.create(data);
};

export const getNotificationsByRecipientRepo = async (
  recipientId,
  filter = {},
  skip = 0,
  limit = 20
) => {
  const query = { recipient: recipientId, ...filter };
  return await Notification.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('sender', 'name profileImage role')
    .lean()
    .exec();
};

export const countNotificationsRepo = async (recipientId, filter = {}) => {
  return await Notification.countDocuments({ recipient: recipientId, ...filter });
};

export const getUnreadCountRepo = async (recipientId) => {
  return await Notification.countDocuments({ recipient: recipientId, isRead: false });
};

export const markNotificationReadRepo = async (notificationId, recipientId) => {
  return await Notification.findOneAndUpdate(
    { _id: notificationId, recipient: recipientId },
    { $set: { isRead: true, readAt: new Date() } },
    { new: true }
  );
};

export const markAllNotificationsReadRepo = async (recipientId) => {
  return await Notification.updateMany(
    { recipient: recipientId, isRead: false },
    { $set: { isRead: true, readAt: new Date() } }
  );
};

export const deleteNotificationRepo = async (notificationId, recipientId) => {
  return await Notification.findOneAndDelete({ _id: notificationId, recipient: recipientId });
};

export const deleteOldReadNotificationsRepo = async (daysOld = 30) => {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - daysOld);
  return await Notification.deleteMany({ isRead: true, readAt: { $lt: cutoff } });
};
