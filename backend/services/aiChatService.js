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
 * AI Chat Service Layer - High level orchestrator for conversation memory,
 * prompt formatting, persistence, usage telemetry, and streaming response.
 */

/**
 * Process a synchronous chat turn
 */
export const processChatMessage = async (userId, inputData) => {
  const { message, conversationId, systemPromptType = 'AGRICULTURAL_ADVISOR', temperature, maxTokens } = inputData;

  // 1. Fetch existing conversation or create a new session
  let conversation;
  if (conversationId) {
    conversation = await findAiConversationByIdRepo(conversationId, userId);
    if (!conversation) {
      throw new AppError('AI Conversation session not found.', HTTP_STATUS.NOT_FOUND);
    }
  } else {
    // Generate initial session title from first 40 chars of message
    const titleSnippet = message.length > 40 ? `${message.substring(0, 40)}...` : message;
    conversation = await createAiConversationRepo(userId, {
      title: titleSnippet,
      systemPromptType,
    });
  }

  // 2. Fetch conversation history memory (last 10 messages)
  const historyMemory = await getRecentConversationMemoryRepo(conversation._id, 10);

  // 3. Assemble full messages array with system prompt
  const systemPromptContent = SYSTEM_PROMPTS[systemPromptType] || SYSTEM_PROMPTS.AGRICULTURAL_ADVISOR;

  const messagesPayload = [
    { role: 'system', content: systemPromptContent },
    ...historyMemory,
    { role: 'user', content: message },
  ];

  // 4. Save User Message to Database
  await addAiMessageRepo({
    conversation: conversation._id,
    user: userId,
    role: 'user',
    content: message,
  });

  // 5. Invoke Groq API completion
  const aiResult = await createGroqCompletion(messagesPayload, {
    temperature,
    maxTokens,
    model: conversation.model,
  });

  // 6. Save Assistant Response Message to Database
  const assistantMessage = await addAiMessageRepo({
    conversation: conversation._id,
    user: userId,
    role: 'assistant',
    content: aiResult.content,
    promptTokens: aiResult.usage.promptTokens,
    completionTokens: aiResult.usage.completionTokens,
    totalTokens: aiResult.usage.totalTokens,
    model: aiResult.model,
  });

  // 7. Update Conversation metadata & cumulative token counters
  const updatedConversation = await updateAiConversationStatsRepo(conversation._id, {
    lastMessageText: aiResult.content,
    promptTokens: aiResult.usage.promptTokens,
    completionTokens: aiResult.usage.completionTokens,
    totalTokens: aiResult.usage.totalTokens,
  });

  // 8. Record telemetry audit log
  const estimatedCostUsd = logTokenUsage(
    '/api/v1/ai/chat',
    aiResult.model,
    aiResult.usage,
    aiResult.latencyMs
  );

  await recordAiUsageRepo({
    user: userId,
    endpoint: '/api/v1/ai/chat',
    model: aiResult.model,
    promptTokens: aiResult.usage.promptTokens,
    completionTokens: aiResult.usage.completionTokens,
    totalTokens: aiResult.usage.totalTokens,
    estimatedCostUsd,
    latencyMs: aiResult.latencyMs,
    status: 'success',
  });

  return {
    conversationId: updatedConversation._id,
    message: assistantMessage,
    usage: aiResult.usage,
    estimatedCostUsd,
    latencyMs: aiResult.latencyMs,
  };
};

/**
 * Process a streaming SSE chat turn
 */
export const processStreamChatMessage = async (userId, inputData, res) => {
  const { message, conversationId, systemPromptType = 'AGRICULTURAL_ADVISOR', temperature, maxTokens } = inputData;

  let conversation;
  if (conversationId) {
    conversation = await findAiConversationByIdRepo(conversationId, userId);
    if (!conversation) {
      throw new AppError('AI Conversation session not found.', HTTP_STATUS.NOT_FOUND);
    }
  } else {
    const titleSnippet = message.length > 40 ? `${message.substring(0, 40)}...` : message;
    conversation = await createAiConversationRepo(userId, {
      title: titleSnippet,
      systemPromptType,
    });
  }

  const historyMemory = await getRecentConversationMemoryRepo(conversation._id, 10);
  const systemPromptContent = SYSTEM_PROMPTS[systemPromptType] || SYSTEM_PROMPTS.AGRICULTURAL_ADVISOR;

  const messagesPayload = [
    { role: 'system', content: systemPromptContent },
    ...historyMemory,
    { role: 'user', content: message },
  ];

  // Save User Message
  await addAiMessageRepo({
    conversation: conversation._id,
    user: userId,
    role: 'user',
    content: message,
  });

  // Set SSE Headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  // Send initial conversation metadata frame
  res.write(`data: ${JSON.stringify({ type: 'init', conversationId: conversation._id })}\n\n`);

  const startTime = Date.now();
  let fullAssistantText = '';

  try {
    const stream = await createGroqStreamCompletion(messagesPayload, {
      temperature,
      maxTokens,
      model: conversation.model,
    });

    for await (const chunk of stream) {
      const deltaContent = chunk.choices[0]?.delta?.content || '';
      if (deltaContent) {
        fullAssistantText += deltaContent;
        res.write(`data: ${JSON.stringify({ type: 'chunk', content: deltaContent })}\n\n`);
      }
    }

    const latencyMs = Date.now() - startTime;

    // Estimate tokens for stream response (~4 chars per token rule of thumb for fallback)
    const estimatedPromptTokens = Math.ceil(JSON.stringify(messagesPayload).length / 4);
    const estimatedCompletionTokens = Math.ceil(fullAssistantText.length / 4);
    const totalTokens = estimatedPromptTokens + estimatedCompletionTokens;

    // Save Assistant Message
    await addAiMessageRepo({
      conversation: conversation._id,
      user: userId,
      role: 'assistant',
      content: fullAssistantText,
      promptTokens: estimatedPromptTokens,
      completionTokens: estimatedCompletionTokens,
      totalTokens,
      model: conversation.model,
    });

    await updateAiConversationStatsRepo(conversation._id, {
      lastMessageText: fullAssistantText,
      promptTokens: estimatedPromptTokens,
      completionTokens: estimatedCompletionTokens,
      totalTokens,
    });

    const estimatedCostUsd = logTokenUsage('/api/v1/ai/chat/stream', conversation.model, {
      promptTokens: estimatedPromptTokens,
      completionTokens: estimatedCompletionTokens,
      totalTokens,
    }, latencyMs);

    await recordAiUsageRepo({
      user: userId,
      endpoint: '/api/v1/ai/chat/stream',
      model: conversation.model,
      promptTokens: estimatedPromptTokens,
      completionTokens: estimatedCompletionTokens,
      totalTokens,
      estimatedCostUsd,
      latencyMs,
      status: 'success',
    });

    // Send final completion frame
    res.write(
      `data: ${JSON.stringify({
        type: 'done',
        conversationId: conversation._id,
        usage: { promptTokens: estimatedPromptTokens, completionTokens: estimatedCompletionTokens, totalTokens },
      })}\n\n`
    );
    res.end();
  } catch (error) {
    logger.error(`Error in SSE stream pipeline: ${error.message}`);
    res.write(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`);
    res.end();
  }
};
