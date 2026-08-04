import express from 'express';
import {
  getNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
} from '../controllers/notificationController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// All notification routes are protected (require authentication)
router.use(protect);

/**
 * @route   GET /api/v1/notifications
 * @desc    Get paginated list of notifications
 */
router.get('/', getNotifications);

/**
 * @route   GET /api/v1/notifications/unread-count
 * @desc    Get unread notification count
 */
router.get('/unread-count', getUnreadCount);

/**
 * @route   PATCH /api/v1/notifications/read-all
 * @desc    Mark all unread notifications as read
 */
router.patch('/read-all', markAllNotificationsRead);

/**
 * @route   PATCH /api/v1/notifications/:id/read
 * @desc    Mark single notification as read
 */
router.patch('/:id/read', markNotificationRead);

/**
 * @route   DELETE /api/v1/notifications/:id
 * @desc    Delete a notification
 */
router.delete('/:id', deleteNotification);

export default router;
