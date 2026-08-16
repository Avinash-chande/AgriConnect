import { Application } from '../models/Application.js';
import { Job } from '../models/Job.js';
import { User } from '../models/User.js';
import {
  findConversationByParticipantsRepo,
  findConversationByIdRepo,
  findUserConversationsRepo,
  countUserConversationsRepo,
  createConversationRepo,
  updateConversationLastMessageRepo,
  resetUnreadCountRepo,
} from '../repositories/conversationRepository.js';
import {
  createMessageRepo,
  findMessageByIdRepo,
  findMessagesByConversationRepo,
  countMessagesByConversationRepo,
  searchMessagesRepo,
  searchAllUserMessagesRepo,
  softDeleteMessageRepo,
  editMessageRepo,
  markMessagesAsReadRepo,
  markMessagesAsDeliveredRepo,
} from '../repositories/messageRepository.js';
import { emitToUser } from '../socket/socketService.js';
import { SOCKET_EVENTS } from '../socket/socketEvents.js';
import { connectedUsersStore } from '../socket/connectedUsers.js';
import { AppError } from '../utils/appError.js';
import { HTTP_STATUS, USER_ROLES, APPLICATION_STATUS } from '../constants/index.js';
import { logger } from '../utils/logger.js';

const ALLOWED_CHAT_APPLICATION_STATUSES = [
  APPLICATION_STATUS.ACCEPTED,
  APPLICATION_STATUS.HIRED,
  APPLICATION_STATUS.COMPLETED,
];

/**
 * Service: Get or Create 1-to-1 Conversation between Farmer & Worker
 * Enforces strict business rule: Application MUST be accepted/approved.
 */
export const getOrCreateConversationService = async (currentUser, { workerId, farmerId, jobId }) => {
  const currentUserId = (currentUser._id || currentUser.id).toString();
  const currentUserRole = (currentUser.role || '').toLowerCase();

  let targetWorkerId;
  let targetFarmerId;

  if (currentUserRole === 'worker') {
    targetWorkerId = currentUserId;
    targetFarmerId = farmerId;
  } else if (currentUserRole === 'farmer') {
    targetFarmerId = currentUserId;
    targetWorkerId = workerId;
  } else {
    throw new AppError('Only Farmers and Workers are eligible to participate in 1-to-1 chats.', HTTP_STATUS.FORBIDDEN);
  }

  if (!targetFarmerId || !targetWorkerId || !jobId) {
    throw new AppError('Farmer ID, Worker ID, and Job ID are required to initiate a conversation.', HTTP_STATUS.BAD_REQUEST);
  }

  // 1. Verify Job existence and Farmer ownership
  const job = await Job.findById(jobId);
  if (!job) {
    throw new AppError('Job posting not found.', HTTP_STATUS.NOT_FOUND);
  }

  const jobFarmerId = (job.farmer._id || job.farmer).toString();
  if (jobFarmerId !== targetFarmerId.toString()) {
    throw new AppError('Invalid job posting for this farmer.', HTTP_STATUS.BAD_REQUEST);
  }

  // 2. Strict Requirement: Verify Worker Application exists for this Job AND status is Accepted
  const application = await Application.findOne({
    job: jobId,
    worker: targetWorkerId,
    farmer: targetFarmerId,
  });

  if (!application) {
    throw new AppError(
      'Chat permission denied: Application not found.',
      HTTP_STATUS.FORBIDDEN
    );
  }

  if (!ALLOWED_CHAT_APPLICATION_STATUSES.includes(application.status)) {
    throw new AppError(
      'Chat permission denied: Chat is only available after the farmer approves/accepts the job application.',
      HTTP_STATUS.FORBIDDEN
    );
  }

  // 3. Check for existing conversation
  let conversation = await findConversationByParticipantsRepo(targetFarmerId, targetWorkerId, jobId);
  if (conversation) {
    return conversation;
  }

  // 4. Create new conversation
  const conversationData = {
    participants: [targetFarmerId, targetWorkerId],
    farmer: targetFarmerId,
    worker: targetWorkerId,
    job: jobId,
    application: application._id,
    lastMessageText: 'Conversation started',
    lastMessageAt: new Date(),
  };

  conversation = await createConversationRepo(conversationData);
  logger.info(`[Chat] Created new 1-to-1 conversation ${conversation._id} between Farmer:${targetFarmerId} & Worker:${targetWorkerId}`);
  return conversation;
};

/**
 * Service: Check if logged in user has any approved application eligible for chat
 */
export const checkUserChatEligibilityService = async (userId) => {
  const count = await Application.countDocuments({
    $or: [{ worker: userId }, { farmer: userId }],
    status: { $in: ALLOWED_CHAT_APPLICATION_STATUSES },
  });

  return {
    canChat: count > 0,
    eligibleCount: count,
  };
};

/**
 * Service: Fetch user's active conversations list (Only accepted application conversations)
 */
export const getUserConversationsService = async (userId, queryParams = {}) => {
  const page = Math.max(1, parseInt(queryParams.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(queryParams.limit, 10) || 20));
  const skip = (page - 1) * limit;

  // Find accepted application IDs for this user
  const acceptedApps = await Application.find({
    $or: [{ worker: userId }, { farmer: userId }],
    status: { $in: ALLOWED_CHAT_APPLICATION_STATUSES },
  }).select('_id');

  const acceptedAppIds = acceptedApps.map((a) => a._id);

  if (acceptedAppIds.length === 0) {
    return {
      conversations: [],
      pagination: {
        page: 1,
        limit,
        total: 0,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false,
      },
    };
  }

  const filter = { application: { $in: acceptedAppIds } };

  const [conversations, total] = await Promise.all([
    findUserConversationsRepo(userId, filter, skip, limit),
    countUserConversationsRepo(userId, filter),
  ]);

  const totalPages = Math.ceil(total / limit) || 1;

  return {
    conversations,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
};

/**
 * Service: Fetch paginated messages in a conversation
 */
export const getConversationMessagesService = async (userId, conversationId, queryParams = {}) => {
  const conversation = await findConversationByIdRepo(conversationId);
  if (!conversation) {
    throw new AppError('Conversation not found.', HTTP_STATUS.NOT_FOUND);
  }

  const isParticipant = conversation.participants.some(
    (p) => (p._id || p).toString() === userId.toString()
  );
  if (!isParticipant) {
    throw new AppError('Access denied: You are not a participant in this conversation.', HTTP_STATUS.FORBIDDEN);
  }

  const page = Math.max(1, parseInt(queryParams.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(queryParams.limit, 10) || 50));
  const skip = (page - 1) * limit;

  // Handle Search inside conversation
  if (queryParams.search && queryParams.search.trim()) {
    const searchResults = await searchMessagesRepo(conversationId, queryParams.search.trim(), skip, limit);
    return {
      messages: searchResults.reverse(),
      pagination: { page, limit, total: searchResults.length, totalPages: 1 },
    };
  }

  const [messages, total] = await Promise.all([
    findMessagesByConversationRepo(conversationId, {}, skip, limit),
    countMessagesByConversationRepo(conversationId, {}),
  ]);

  const totalPages = Math.ceil(total / limit) || 1;

  return {
    conversation,
    messages: messages.reverse(),
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
};

/**
 * Service: Send Message in Conversation
 */
export const sendMessageService = async (user, conversationId, payload) => {
  const senderId = (user._id || user.id).toString();
  const conversation = await findConversationByIdRepo(conversationId);
  if (!conversation) {
    throw new AppError('Conversation not found.', HTTP_STATUS.NOT_FOUND);
  }

  const isParticipant = conversation.participants.some(
    (p) => (p._id || p).toString() === senderId
  );
  if (!isParticipant) {
    throw new AppError('Access denied: You cannot send messages in this conversation.', HTTP_STATUS.FORBIDDEN);
  }

  // Verify underlying application status is Accepted
  const applicationDoc = await Application.findById(conversation.application);
  if (!applicationDoc || !ALLOWED_CHAT_APPLICATION_STATUSES.includes(applicationDoc.status)) {
    throw new AppError('Chat is not available until the application is approved.', HTTP_STATUS.FORBIDDEN);
  }

  if (conversation.isBlocked) {
    throw new AppError('This conversation is currently blocked.', HTTP_STATUS.BAD_REQUEST);
  }

  const recipientId = conversation.farmer._id.toString() === senderId
    ? conversation.worker._id.toString()
    : conversation.farmer._id.toString();

  const { text, attachments = [] } = payload;
  if (!text || !text.trim()) {
    throw new AppError('Message content cannot be empty.', HTTP_STATUS.BAD_REQUEST);
  }

  const isRecipientOnline = connectedUsersStore.isUserOnline(recipientId);
  const initialStatus = isRecipientOnline ? 'delivered' : 'sent';
  const deliveredAtDate = isRecipientOnline ? new Date() : null;

  // 1. Create message record
  const message = await createMessageRepo({
    conversation: conversationId,
    sender: senderId,
    recipient: recipientId,
    text: text.trim(),
    attachments,
    status: initialStatus,
    deliveredAt: deliveredAtDate,
  });

  // 2. Update conversation last message & unread count
  await updateConversationLastMessageRepo(conversationId, message._id, text.trim(), senderId);

  // 3. Emit real-time Socket.IO event to recipient room
  emitToUser(recipientId, SOCKET_EVENTS.CHAT_MESSAGE_RECEIVED, {
    message,
    conversationId,
    senderName: user.name,
  });

  // 4. Emit status confirmation to sender
  if (isRecipientOnline) {
    emitToUser(senderId, SOCKET_EVENTS.CHAT_MESSAGE_DELIVERED, {
      messageId: message._id,
      conversationId,
      deliveredAt: deliveredAtDate,
    });
  } else {
    emitToUser(senderId, SOCKET_EVENTS.CHAT_MESSAGE_SENT, {
      messageId: message._id,
      conversationId,
    });
  }

  return message;
};

/**
 * Service: Edit Message
 */
export const editMessageService = async (user, messageId, newText) => {
  const userId = (user._id || user.id).toString();
  const message = await findMessageByIdRepo(messageId);
  if (!message) {
    throw new AppError('Message not found.', HTTP_STATUS.NOT_FOUND);
  }

  if (message.sender._id.toString() !== userId) {
    throw new AppError('Forbidden: You can only edit your own messages.', HTTP_STATUS.FORBIDDEN);
  }

  if (message.isDeleted) {
    throw new AppError('Cannot edit a deleted message.', HTTP_STATUS.BAD_REQUEST);
  }

  const updatedMessage = await editMessageRepo(messageId, newText);

  // Real-time socket event to recipient
  emitToUser(message.recipient._id.toString(), SOCKET_EVENTS.CHAT_MESSAGE_EDITED, {
    messageId,
    conversationId: message.conversation,
    newText,
  });

  return updatedMessage;
};

/**
 * Service: Soft Delete Message
 */
export const deleteMessageService = async (user, messageId) => {
  const userId = (user._id || user.id).toString();
  const message = await findMessageByIdRepo(messageId);
  if (!message) {
    throw new AppError('Message not found.', HTTP_STATUS.NOT_FOUND);
  }

  if (message.sender._id.toString() !== userId) {
    throw new AppError('Forbidden: You can only delete your own messages.', HTTP_STATUS.FORBIDDEN);
  }

  const deletedMessage = await softDeleteMessageRepo(messageId, userId);

  // Real-time socket event to recipient
  emitToUser(message.recipient._id.toString(), SOCKET_EVENTS.CHAT_MESSAGE_DELETED, {
    messageId,
    conversationId: message.conversation,
  });

  return deletedMessage;
};

/**
 * Service: Mark Conversation Messages as Read
 */
export const markConversationReadService = async (user, conversationId) => {
  const userId = (user._id || user.id).toString();
  const userRole = user.role;

  const conversation = await findConversationByIdRepo(conversationId);
  if (!conversation) {
    throw new AppError('Conversation not found.', HTTP_STATUS.NOT_FOUND);
  }

  const now = new Date();
  await markMessagesAsReadRepo(conversationId, userId);
  await resetUnreadCountRepo(conversationId, userRole);

  const recipientId = conversation.farmer._id.toString() === userId
    ? conversation.worker._id.toString()
    : conversation.farmer._id.toString();

  // Socket event to notify sender that messages were read (seen)
  emitToUser(recipientId, SOCKET_EVENTS.CHAT_MESSAGE_SEEN, {
    conversationId,
    readBy: userId,
    readAt: now,
  });
  emitToUser(recipientId, SOCKET_EVENTS.CHAT_READ_RECEIPT, {
    conversationId,
    readBy: userId,
    readAt: now,
  });

  return { success: true, conversationId };
};

/**
 * Service: Get total unread chat messages count across all conversations for a user
 */
export const getUnreadChatCountService = async (user) => {
  const userId = user._id || user.id;
  const userRole = (user.role || '').toLowerCase();
  const fieldToSum = userRole === 'farmer' ? '$unreadCount.farmer' : '$unreadCount.worker';

  const conversations = await findUserConversationsRepo(userId, {}, 0, 100);
  let totalUnread = 0;

  conversations.forEach((conv) => {
    if (userRole === 'farmer') {
      totalUnread += conv.unreadCount?.farmer || 0;
    } else {
      totalUnread += conv.unreadCount?.worker || 0;
    }
  });

  return { totalUnread };
};

/**
 * Service: Global Chat Search (Messages, Conversations, Users)
 */
export const searchChatService = async (user, queryParams = {}) => {
  const userId = (user._id || user.id).toString();
  const q = (queryParams.q || '').trim();
  const page = Math.max(1, parseInt(queryParams.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(queryParams.limit, 10) || 20));
  const skip = (page - 1) * limit;

  if (!q) {
    return { messages: [], conversations: [], pagination: { page, limit, total: 0, totalPages: 0 } };
  }

  // Fetch all user's active conversations
  const userConversations = await findUserConversationsRepo(userId, {}, 0, 100);
  const conversationIds = userConversations.map((c) => c._id);

  // Search Messages
  const { messages, total: totalMessages } = await searchAllUserMessagesRepo(
    conversationIds,
    q,
    skip,
    limit
  );

  // Search matching conversation threads (by partner name, job title, or last message)
  const qRegex = new RegExp(q, 'i');
  const matchedConversations = userConversations.filter((conv) => {
    const partner = (user.role || '').toLowerCase() === 'farmer' ? conv.worker : conv.farmer;
    const partnerName = partner?.name || '';
    const jobTitle = conv.job?.title || '';
    const lastMsg = conv.lastMessageText || '';
    return qRegex.test(partnerName) || qRegex.test(jobTitle) || qRegex.test(lastMsg);
  });

  return {
    query: q,
    messages,
    conversations: matchedConversations,
    pagination: {
      page,
      limit,
      totalMessages,
      totalPages: Math.ceil(totalMessages / limit) || 1,
    },
  };
};
