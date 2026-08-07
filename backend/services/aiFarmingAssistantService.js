import { SYSTEM_PROMPTS } from '../prompts/systemPrompts.js';
import { createGroqCompletion, createGroqStreamCompletion } from './groqService.js';
import {
  createAiConversationRepo,
  findAiConversationByIdRepo,
  updateAiConversationStatsRepo,
  addAiMessageRepo,
  getRecentConversationMemoryRepo,
} from '../repositories/aiConversationRepository.js';
import { recordAiUsageRepo } from '../repositories/aiUsageRepository.js';
import { logTokenUsage } from '../utils/tokenTracker.js';
import { AppError } from '../utils/appError.js';
import { HTTP_STATUS } from '../constants/index.js';
import { logger } from '../utils/logger.js';

/**
 * Build System Prompt tailored for Farming AI Assistant with specific topic context
 */
const buildFarmingSystemPrompt = (topicMode = 'General', location = '') => {
  let prompt = SYSTEM_PROMPTS.FARMING_ASSISTANT || SYSTEM_PROMPTS.AGRICULTURAL_ADVISOR;

  if (location) {
    prompt += `\nFarmer Location Context: ${location}. Tailor all crop recommendations, seasonal advice, and wage rates to this regional agricultural zone.`;
  }

  if (topicMode && topicMode !== 'General') {
    prompt += `\nCurrent Topic Focus Mode: "${topicMode}". Prioritize expert, detailed actionable answers relating to ${topicMode}.`;
  }

  return prompt;
};

/**
 * Helper to retrieve or create a conversation session
 */
const getOrCreateConversation = async (userId, conversationId, userMessageContent) => {
  let conversation;
  if (conversationId) {
    conversation = await findAiConversationByIdRepo(conversationId, userId);
  }

  if (!conversation) {
    const titleSnippet = userMessageContent.length > 35 ? `Farming: ${userMessageContent.substring(0, 35)}...` : `Farming: ${userMessageContent}`;
    conversation = await createAiConversationRepo(userId, {
      title: titleSnippet,
      systemPromptType: 'FARMING_ASSISTANT',
    });
  }

  return conversation;
};

/**
 * Process Conversational Farming AI Assistant Request (Sync Response)
 */
export const processFarmingAssistantChat = async (userId, payload) => {
  const { conversationId, message, topicMode, location } = payload;
  const userMessageContent = message.trim();

  // 1. Get or create conversation session
  const conversation = await getOrCreateConversation(userId, conversationId, userMessageContent);

  // 2. Fetch past conversation memory (last 10 turns)
  const historyMessages = await getRecentConversationMemoryRepo(conversation._id, 10);

  // 3. Construct message array for Groq
  const systemPromptContent = buildFarmingSystemPrompt(topicMode, location);
  const messages = [
    { role: 'system', content: systemPromptContent },
    ...historyMessages,
    { role: 'user', content: userMessageContent },
  ];

  // Save User message record
  await addAiMessageRepo({
    conversation: conversation._id,
    user: userId,
    role: 'user',
    content: userMessageContent,
  });

  // 4. Call Groq API
  const aiResult = await createGroqCompletion(messages, {
    temperature: 0.4,
  });

  const assistantReply = aiResult.content;

  // 5. Save Assistant response message record
  await addAiMessageRepo({
    conversation: conversation._id,
    user: userId,
    role: 'assistant',
    content: assistantReply,
    promptTokens: aiResult.usage.promptTokens,
    completionTokens: aiResult.usage.completionTokens,
    totalTokens: aiResult.usage.totalTokens,
  });

  await updateAiConversationStatsRepo(conversation._id, {
    lastMessageText: assistantReply,
    promptTokens: aiResult.usage.promptTokens,
    completionTokens: aiResult.usage.completionTokens,
    totalTokens: aiResult.usage.totalTokens,
  });

  // 6. Record usage telemetry
  const estimatedCostUsd = logTokenUsage('/api/v1/ai/farming-assistant', aiResult.model, aiResult.usage, aiResult.latencyMs);

  await recordAiUsageRepo({
    user: userId,
    endpoint: '/api/v1/ai/farming-assistant',
    model: aiResult.model,
    promptTokens: aiResult.usage.promptTokens,
    completionTokens: aiResult.usage.completionTokens,
    totalTokens: aiResult.usage.totalTokens,
    estimatedCostUsd,
    latencyMs: aiResult.latencyMs,
    status: 'success',
  });

  return {
    conversationId: conversation._id,
    message: assistantReply,
    usage: aiResult.usage,
    model: aiResult.model,
  };
};

/**
 * Process Real-Time SSE Streaming Conversational Farming AI Assistant Request
 */
export const processFarmingAssistantStreamChat = async (userId, payload, res) => {
  const { conversationId, message, topicMode, location } = payload;
  const userMessageContent = message.trim();

  // 1. Set SSE Headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  // 2. Get or create conversation session
  const conversation = await getOrCreateConversation(userId, conversationId, userMessageContent);

  // 3. Fetch past conversation memory
  const historyMessages = await getRecentConversationMemoryRepo(conversation._id, 10);

  const systemPromptContent = buildFarmingSystemPrompt(topicMode, location);
  const messages = [
    { role: 'system', content: systemPromptContent },
    ...historyMessages,
    { role: 'user', content: userMessageContent },
  ];

  // Save User message record
  await addAiMessageRepo({
    conversation: conversation._id,
    user: userId,
    role: 'user',
    content: userMessageContent,
  });

  let fullResponseText = '';
  const startTime = Date.now();

  try {
    const stream = await createGroqStreamCompletion(messages, { temperature: 0.4 });

    for await (const chunk of stream) {
      const deltaContent = chunk.choices[0]?.delta?.content || '';
      if (deltaContent) {
        fullResponseText += deltaContent;
        res.write(`data: ${JSON.stringify({ type: 'chunk', content: deltaContent })}\n\n`);
      }
    }

    const latencyMs = Date.now() - startTime;
    const estimatedTokens = Math.ceil(fullResponseText.length / 4);

    // Save Assistant response message
    await addAiMessageRepo({
      conversation: conversation._id,
      user: userId,
      role: 'assistant',
      content: fullResponseText,
      totalTokens: estimatedTokens,
    });

    await updateAiConversationStatsRepo(conversation._id, {
      lastMessageText: fullResponseText,
      totalTokens: estimatedTokens,
    });

    // Write SSE completion frame
    res.write(
      `data: ${JSON.stringify({
        type: 'done',
        conversationId: conversation._id,
        usage: { totalTokens: estimatedTokens },
      })}\n\n`
    );
    res.end();
  } catch (streamError) {
    logger.error(`Error streaming Farming AI response: ${streamError.message}`, streamError);
    res.write(`data: ${JSON.stringify({ type: 'error', message: 'Farming AI streaming failed' })}\n\n`);
    res.end();
  }
};
