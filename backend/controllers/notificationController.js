import { asyncHandler } from '../utils/asyncHandler.js';
import { sendResponse } from '../utils/apiResponse.js';
import { HTTP_STATUS } from '../constants/index.js';
import {
  getNotificationsService,
  getUnreadCountService,
  markNotificationReadService,
  markAllNotificationsReadService,
  deleteNotificationService,
} from '../services/notificationService.js';

/**
 * @desc    Get paginated notifications for the logged-in user
 * @route   GET /api/v1/notifications
 * @access  Private (Any authenticated user)
 */
export const getNotifications = asyncHandler(async (req, res) => {
  const result = await getNotificationsService(req.user._id, req.query);

  return sendResponse(
    res,
    HTTP_STATUS.OK,
    'Notifications retrieved successfully',
    result.notifications,
    {
      pagination: result.pagination,
      unreadCount: result.unreadCount,
    }
  );
});

/**
 * @desc    Get unread notification count (lightweight badge endpoint)
 * @route   GET /api/v1/notifications/unread-count
 * @access  Private (Any authenticated user)
 */
export const getUnreadCount = asyncHandler(async (req, res) => {
  const count = await getUnreadCountService(req.user._id);

  return sendResponse(res, HTTP_STATUS.OK, 'Unread count retrieved', { count });
});

/**
 * @desc    Mark a single notification as read
 * @route   PATCH /api/v1/notifications/:id/read
 * @access  Private (Notification owner only)
 */
export const markNotificationRead = asyncHandler(async (req, res) => {
  const notification = await markNotificationReadService(req.params.id, req.user._id);

  return sendResponse(res, HTTP_STATUS.OK, 'Notification marked as read', notification);
});

/**
 * @desc    Mark all notifications as read
 * @route   PATCH /api/v1/notifications/read-all
 * @access  Private (Any authenticated user)
 */
export const markAllNotificationsRead = asyncHandler(async (req, res) => {
  const result = await markAllNotificationsReadService(req.user._id);

  return sendResponse(
    res,
    HTTP_STATUS.OK,
    `${result.modifiedCount} notification(s) marked as read`,
    result
  );
});

/**
 * @desc    Delete a single notification
 * @route   DELETE /api/v1/notifications/:id
 * @access  Private (Notification owner only)
 */
export const deleteNotification = asyncHandler(async (req, res) => {
  await deleteNotificationService(req.params.id, req.user._id);

  return sendResponse(res, HTTP_STATUS.OK, 'Notification deleted successfully');
});
