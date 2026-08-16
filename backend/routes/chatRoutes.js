import express from 'express';
import {
  getOrCreateConversation,
  getUserConversations,
  getConversationMessages,
  sendMessage,
  editMessage,
  deleteMessage,
  markConversationRead,
  getUnreadChatCount,
  uploadAttachment,
  searchChat,
  checkUserChatEligibility,
} from '../controllers/chatController.js';
import { protect } from '../middleware/authMiddleware.js';
import { uploadSingleAttachment } from '../middleware/uploadMiddleware.js';
import { validateSendMessageInput, validateAttachmentFile } from '../validators/chatValidator.js';
import { chatRateLimiter, chatSpamProtection } from '../middleware/chatSecurityMiddleware.js';

const router = express.Router();

// Protect all chat routes with JWT Authentication
router.use(protect);

router.get('/eligibility', checkUserChatEligibility);
router.get('/search', searchChat);
router.post(
  '/upload-attachment',
  chatRateLimiter,
  uploadSingleAttachment,
  validateAttachmentFile,
  uploadAttachment
);

router.post('/conversations', getOrCreateConversation);
router.get('/conversations', getUserConversations);
router.get('/conversations/:id/messages', getConversationMessages);
router.post(
  '/conversations/:id/messages',
  chatRateLimiter,
  chatSpamProtection,
  validateSendMessageInput,
  sendMessage
);
router.patch('/conversations/:id/read', markConversationRead);

router.patch('/messages/:id', chatSpamProtection, editMessage);
router.delete('/messages/:id', deleteMessage);

router.get('/unread-count', getUnreadChatCount);

export default router;
