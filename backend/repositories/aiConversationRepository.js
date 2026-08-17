import { AIConversation } from '../models/AiConversation.js';
import { AiMessage } from '../models/AiMessage.js';
/** 
 * AI Conversation Repository - Data Access Layer
 */

export const createAiConversationRepo = async (userId, data = {}) => {
  const conversation = await AIConversation.create({
    user: userId,
    title: data.title || 'New AI Consultation',
    systemPromptType: data.systemPromptType || 'AGRICULTURAL_ADVISOR',
    model: data.model || 'llama-3.3-70b-versatile',
  });
  return conversation;
};

export const findAiConversationByIdRepo = async (conversationId, userId) => {
  return await AIConversation.findOne({ _id: conversationId, user: userId, isArchived: { $ne: true } });
};

export const findUserAiConversationsRepo = async (userId, skip = 0, limit = 20) => {
  return await AIConversation.find({ user: userId, isArchived: { $ne: true } })
    .sort({ updatedAt: -1 })
    .skip(skip)
    .limit(limit);
};

export const countUserAiConversationsRepo = async (userId) => {
  return await AIConversation.countDocuments({ user: userId, isArchived: { $ne: true } });
};

export const updateAiConversationStatsRepo = async (conversationId, updates) => {
  const { lastMessageText, promptTokens = 0, completionTokens = 0, totalTokens = 0, title } = updates;
  const updateObj = {
    $inc: {
      messageCount: 1,
      totalTokens,
      totalPromptTokens: promptTokens,
      totalCompletionTokens: completionTokens,
    },
    $set: { updatedAt: new Date() },
  };

  if (lastMessageText) updateObj.$set.lastMessageText = lastMessageText.substring(0, 200);
  if (title) updateObj.$set.title = title;

  return await AIConversation.findByIdAndUpdate(conversationId, updateObj, { new: true });
};

export const deleteAiConversationRepo = async (conversationId, userId) => {
  const conversation = await AIConversation.findOneAndUpdate(
    { _id: conversationId, user: userId },
    { $set: { isArchived: true } },
    { new: true }
  );
  if (conversation) {
    await AiMessage.deleteMany({ conversation: conversationId });
  }
  return conversation;
};

/**
 * Message Repository Functions
 */

export const addAiMessageRepo = async (messageData) => {
  return await AiMessage.create(messageData);
};

export const findConversationMessagesRepo = async (conversationId, limit = 50) => {
  return await AiMessage.find({ conversation: conversationId })
    .sort({ createdAt: 1 })
    .limit(limit);
};

export const getRecentConversationMemoryRepo = async (conversationId, maxMessages = 10) => {
  const messages = await AiMessage.find({ conversation: conversationId })
    .sort({ createdAt: -1 })
    .limit(maxMessages);

  // Return formatted for OpenAI API role/content structure in chronological order
  return messages.reverse().map((msg) => ({
    role: msg.role,
    content: msg.content,
  }));
};
