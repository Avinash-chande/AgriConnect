import express from 'express';
import {
  initiateMobileCallController,
  handleCallWebhookController,
  getCallHistoryController,
} from '../controllers/callController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { callRateLimiter, webhookRateLimiter } from '../middleware/rateLimiter.js';
import { USER_ROLES } from '../constants/index.js';

const router = express.Router();

// 1. Initiate Real Mobile Outbound Call (Authenticated Farmers)
router.post(
  '/mobile',
  callRateLimiter,
  protect,
  authorize(USER_ROLES.FARMER, USER_ROLES.ADMIN, 'farmer', 'Farmer', 'admin', 'Admin'),
  initiateMobileCallController
);

// 2. Telephony Provider Status Webhook (Twilio StatusCallback)
router.post(
  '/webhook',
  webhookRateLimiter,
  handleCallWebhookController
);

// 3. User Call History
router.get(
  '/history',
  protect,
  getCallHistoryController
);

export default router;
