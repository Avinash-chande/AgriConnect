import {
  getOrCreateConversationService,
  getUserConversationsService,
  getConversationMessagesService,
  sendMessageService,
  editMessageService,
  deleteMessageService,
  markConversationReadService,
  getUnreadChatCountService,
  searchChatService,
  checkUserChatEligibilityService,
} from '../services/chatService.js';
import { uploadAttachmentBuffer } from '../services/cloudinaryService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccessResponse } from '../utils/apiResponse.js';
import { HTTP_STATUS } from '../constants/index.js';
import { AppError } from '../utils/appError.js';

export const getOrCreateConversation = asyncHandler(async (req, res) => {
  const conversation = await getOrCreateConversationService(req.user, req.body);
  sendSuccessResponse(res, HTTP_STATUS.OK, 'Conversation retrieved successfully', conversation);
});

export const getUserConversations = asyncHandler(async (req, res) => {
  const result = await getUserConversationsService(req.user._id, req.query);
  sendSuccessResponse(res, HTTP_STATUS.OK, 'Conversations retrieved successfully', result.conversations, {
    pagination: result.pagination,
  });
});

export const getConversationMessages = asyncHandler(async (req, res) => {
  const result = await getConversationMessagesService(req.user._id, req.params.id, req.query);
  sendSuccessResponse(res, HTTP_STATUS.OK, 'Messages retrieved successfully', result.messages, {
    conversation: result.conversation,
    pagination: result.pagination,
  });
});

export const sendMessage = asyncHandler(async (req, res) => {
  const message = await sendMessageService(req.user, req.params.id, req.body);
  sendSuccessResponse(res, HTTP_STATUS.CREATED, 'Message sent successfully', message);
});

export const editMessage = asyncHandler(async (req, res) => {
  const updatedMessage = await editMessageService(req.user, req.params.id, req.body.text);
  sendSuccessResponse(res, HTTP_STATUS.OK, 'Message edited successfully', updatedMessage);
});

export const deleteMessage = asyncHandler(async (req, res) => {
  const deletedMessage = await deleteMessageService(req.user, req.params.id);
  sendSuccessResponse(res, HTTP_STATUS.OK, 'Message deleted successfully', deletedMessage);
});

export const markConversationRead = asyncHandler(async (req, res) => {
  const result = await markConversationReadService(req.user, req.params.id);
  sendSuccessResponse(res, HTTP_STATUS.OK, 'Conversation marked as read', result);
});

export const getUnreadChatCount = asyncHandler(async (req, res) => {
  const result = await getUnreadChatCountService(req.user);
  sendSuccessResponse(res, HTTP_STATUS.OK, 'Unread chat count retrieved successfully', result);
});

export const uploadAttachment = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new AppError('No file attachment uploaded.', HTTP_STATUS.BAD_REQUEST);
  }

  const result = await uploadAttachmentBuffer(
    req.file.buffer,
    req.file.mimetype,
    req.file.originalname
  );

  sendSuccessResponse(res, HTTP_STATUS.CREATED, 'Attachment uploaded successfully', result);
});

export const searchChat = asyncHandler(async (req, res) => {
  const result = await searchChatService(req.user, req.query);
  sendSuccessResponse(res, HTTP_STATUS.OK, 'Search results retrieved successfully', result);
});

export const checkUserChatEligibility = asyncHandler(async (req, res) => {
  const result = await checkUserChatEligibilityService(req.user._id);
  sendSuccessResponse(res, HTTP_STATUS.OK, 'Chat eligibility checked successfully', result);
});
