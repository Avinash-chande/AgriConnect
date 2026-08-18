import express from 'express';

import {
  processChatMessage,
  processStreamChatMessage
} from '../services/aiChatService.js';

import { protect, protectOrGuest } from '../middleware/authMiddleware.js';

const router = express.Router();


// Health check
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'AI module active'
  });
});


// Normal AI chat
router.post('/chat', protectOrGuest, async (req, res, next) => {
  try {
    const result = await processChatMessage(
      req.user._id,
      req.body
    );

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
});


// Streaming AI chat
router.post('/chat/stream', protectOrGuest, async (req, res, next) => {
  try {
    await processStreamChatMessage(
      req.user._id,
      req.body,
      res
    );
  } catch (error) {
    next(error);
  }
});


export default router;
