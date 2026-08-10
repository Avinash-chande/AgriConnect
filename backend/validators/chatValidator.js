import mongoose from 'mongoose';
import { AppError } from '../utils/appError.js';
import { HTTP_STATUS } from '../constants/index.js';

// Constants
export const MAX_MESSAGE_LENGTH = 5000;
export const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024; // 10MB
export const ALLOWED_MIME_TYPES = [
  // Image Types
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  // PDF Document
  'application/pdf',
  // Word & Text Documents
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
];

/**
 * Validate MongoDB ObjectId format
 */
export const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

/**
 * Validate Send Message Request Body
 */
export const validateSendMessageInput = (req, res, next) => {
  const conversationId = req.body?.conversationId || req.params?.id;
  const { text, attachments } = req.body || {};

  // 1. Validate Conversation ID
  if (!conversationId || !isValidObjectId(conversationId)) {
    return next(
      new AppError('Invalid or missing conversation ID parameter', HTTP_STATUS.BAD_REQUEST)
    );
  }

  // 2. Validate Message Content Length
  const textContent = (text || '').trim();
  if (textContent.length > MAX_MESSAGE_LENGTH) {
    return next(
      new AppError(
        `Message length exceeds maximum limit of ${MAX_MESSAGE_LENGTH} characters`,
        HTTP_STATUS.BAD_REQUEST
      )
    );
  }

  // 3. Ensure either text content or attachment is provided
  const hasAttachments = Array.isArray(attachments) && attachments.length > 0;
  if (!textContent && !hasAttachments) {
    return next(
      new AppError('Message cannot be empty. Provide text content or file attachment.', HTTP_STATUS.BAD_REQUEST)
    );
  }

  // 4. Validate Attachments Array if present
  if (hasAttachments) {
    if (attachments.length > 5) {
      return next(
        new AppError('Maximum of 5 attachments allowed per message', HTTP_STATUS.BAD_REQUEST)
      );
    }

    for (const att of attachments) {
      if (!att.url || typeof att.url !== 'string') {
        return next(
          new AppError('Each attachment must have a valid URL string', HTTP_STATUS.BAD_REQUEST)
        );
      }
    }
  }

  next();
};

/**
 * Validate File Upload Middleware (Images, PDF, Documents)
 */
export const validateAttachmentFile = (req, res, next) => {
  if (!req.file) {
    return next(new AppError('No file attachment uploaded.', HTTP_STATUS.BAD_REQUEST));
  }

  // 1. Validate File Size (10MB Max)
  if (req.file.size > MAX_ATTACHMENT_SIZE) {
    return next(
      new AppError('File size exceeds the 10MB limit. Please upload a smaller file.', HTTP_STATUS.BAD_REQUEST)
    );
  }

  // 2. Validate MIME Type
  if (!ALLOWED_MIME_TYPES.includes(req.file.mimetype)) {
    return next(
      new AppError(
        `Unsupported file format: ${req.file.mimetype}. Allowed formats: JPEG, PNG, WEBP, GIF, PDF, DOC, DOCX, TXT.`,
        HTTP_STATUS.BAD_REQUEST
      )
    );
  }

  next();
};

/**
 * Validate Real-Time Socket Event Payload
 */
export const validateSocketPayload = (data) => {
  if (!data || typeof data !== 'object') {
    return { isValid: false, message: 'Invalid payload structure' };
  }

  if (data.conversationId && !isValidObjectId(data.conversationId)) {
    return { isValid: false, message: 'Invalid conversationId format' };
  }

  if (data.text && typeof data.text === 'string' && data.text.length > MAX_MESSAGE_LENGTH) {
    return { isValid: false, message: 'Message text exceeds 5000 characters' };
  }

  return { isValid: true };
};
