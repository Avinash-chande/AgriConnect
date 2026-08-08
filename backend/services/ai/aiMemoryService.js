import mongoose from 'mongoose';
import { AIConversation } from '../../models/AIConversation.js';
import { AITokenManager } from './aiTokenManager.js';
import { AI_CATEGORIES, AI_ROLES } from '../../constants/aiConstants.js';
import { aiLogger } from './aiLogger.js';
import crypto from 'crypto';

/**
 * Conversation Memory Service for AgriConnect AI Sessions
 */
export class AIMemoryService {
  /**
   * Retrieves or creates an active conversation session for a user
   */
  static async getOrCreateSession({ userId, sessionId, category = AI_CATEGORIES.GENERAL_ASSISTANT, title = 'Agricultural Advisory Chat', metadata = {} }) {
    let finalSessionId = sessionId;

    if (!finalSessionId) {
      finalSessionId = `agri_session_${userId}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    }

    if (mongoose.connection.readyState !== 1) {
      return { sessionId: finalSessionId, messages: [] };
    }

    try {
      let conversation = await AIConversation.findOne({ sessionId: finalSessionId, userId });

      if (!conversation) {
        conversation = await AIConversation.create({
          userId,
          sessionId: finalSessionId,
          category,
          title,
          metadata,
          messages: [],
        });
        aiLogger.info(`Created new AI conversation session: ${finalSessionId} for user: ${userId}`);
      }

      return conversation;
    } catch (error) {
      aiLogger.warn(`AI session query bypassed (DB offline/buffering): ${error.message}`);
      return { sessionId: finalSessionId, messages: [] };
    }
  }

  /**
   * Appends a message (user or assistant) to a session and updates token count
   */
  static async appendMessage({ sessionId, userId, role, content, model = null, isFallback = false }) {
    if (!sessionId || !role || !content) return null;
    if (mongoose.connection.readyState !== 1) return null;

    try {
      const estimatedTokens = AITokenManager.estimateTextTokens(content);

      const updated = await AIConversation.findOneAndUpdate(
        { sessionId, userId },
        {
          $push: {
            messages: {
              role,
              content,
              tokens: estimatedTokens,
              model,
              isFallback,
              timestamp: new Date(),
            },
          },
          $inc: { totalTokensUsed: estimatedTokens },
          $set: { updatedAt: new Date() },
        },
        { new: true }
      );

      return updated;
    } catch (error) {
      aiLogger.warn(`Failed to append AI message to DB: ${error.message}`);
      return null;
    }
  }

  /**
   * Builds an OpenAI-compatible messages array formatted for API completion request,
   * applying sliding token budget window trimming.
   */
  static async buildContextPayload({ sessionId, userId, systemPrompt, maxBudgetTokens = 3000 }) {
    let existingMessages = [];

    if (sessionId && userId && mongoose.connection.readyState === 1) {
      try {
        const conversation = await AIConversation.findOne({ sessionId, userId });
        existingMessages = conversation ? conversation.messages : [];
      } catch (e) {
        aiLogger.warn(`Failed to fetch existing session messages for payload: ${e.message}`);
      }
    }

    const rawFormatted = existingMessages.map(m => ({
      role: m.role,
      content: m.content,
    }));

    // Trim messages using sliding window token budget manager
    const trimmed = AITokenManager.trimMessagesToTokenBudget(rawFormatted, systemPrompt, maxBudgetTokens);

    const payloadMessages = [];
    if (systemPrompt) {
      payloadMessages.push({ role: AI_ROLES.SYSTEM, content: systemPrompt });
    }
    payloadMessages.push(...trimmed);

    return {
      payloadMessages,
      trimmedCount: rawFormatted.length - trimmed.length,
      sessionId,
    };
  }

  /**
   * Clears a conversation session
   */
  static async clearSession({ sessionId, userId }) {
    if (mongoose.connection.readyState !== 1) {
      return true;
    }
    try {
      const result = await AIConversation.deleteOne({ sessionId, userId });
      return result.deletedCount > 0;
    } catch (e) {
      return false;
    }
  }

  /**
   * Fetches user active conversation history list
   */
  static async getUserConversations({ userId, limit = 20, page = 1 }) {
    if (mongoose.connection.readyState !== 1) {
      return {
        conversations: [],
        pagination: { page, limit, total: 0, pages: 0 },
      };
    }

    try {
      const skip = (page - 1) * limit;
      const conversations = await AIConversation.find({ userId, isActive: true })
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('sessionId title category totalTokensUsed createdAt updatedAt metadata messages');

      const total = await AIConversation.countDocuments({ userId, isActive: true });

      return {
        conversations: conversations.map(c => ({
          sessionId: c.sessionId,
          title: c.title,
          category: c.category,
          totalTokensUsed: c.totalTokensUsed,
          messageCount: c.messages ? c.messages.length : 0,
          lastMessage: c.messages && c.messages.length > 0 ? c.messages[c.messages.length - 1] : null,
          createdAt: c.createdAt,
          updatedAt: c.updatedAt,
        })),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (e) {
      return {
        conversations: [],
        pagination: { page, limit, total: 0, pages: 0 },
      };
    }
  }
}
