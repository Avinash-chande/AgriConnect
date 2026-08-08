import { aiConfig } from '../../config/aiConfig.js';
import { AI_CATEGORIES, AI_ROLES, DEFAULT_AI_LIMITS } from '../../constants/aiConstants.js';
import { aiLogger } from './aiLogger.js';
import { aiCacheService } from './aiCacheService.js';
import { AITokenManager } from './aiTokenManager.js';
import { AIMemoryService } from './aiMemoryService.js';
import { AIPromptTemplates } from './aiPromptTemplates.js';
import { AIFallbackService } from './aiFallbackService.js';
import { AIStreamHandler } from './aiStreamHandler.js';
import { AIError, handleOpenAIError } from '../../utils/aiError.js';

/**
 * Production-Grade Service Layer for OpenAI-Compatible AI Operations
 */
export class AIService {
  /**
   * Main entrypoint for chat completions (supports streaming, caching, conversation memory, retries, and fallback)
   */
  static async chatCompletion({
    userId,
    sessionId = null,
    prompt,
    category = AI_CATEGORIES.GENERAL_ASSISTANT,
    stream = false,
    model = aiConfig.model,
    temperature = aiConfig.temperature,
    maxTokens = aiConfig.maxTokens,
    customSystemPrompt = null,
    expressRes = null, // Required if stream === true
    saveMemory = true,
  }) {
    const startTime = Date.now();

    // 1. Resolve System Prompt
    const systemPrompt = customSystemPrompt || AIPromptTemplates.getSystemPrompt(category);

    // 2. Resolve Conversation Session & Save User Prompt
    let session = null;
    if (saveMemory && userId) {
      session = await AIMemoryService.getOrCreateSession({ userId, sessionId, category });
      await AIMemoryService.appendMessage({
        sessionId: session.sessionId,
        userId,
        role: AI_ROLES.USER,
        content: prompt,
      });
    }

    const currentSessionId = session ? session.sessionId : sessionId;

    // 3. Build Token-Trimmed Context Payload
    const { payloadMessages } = await AIMemoryService.buildContextPayload({
      sessionId: currentSessionId,
      userId,
      systemPrompt,
      maxBudgetTokens: DEFAULT_AI_LIMITS.CONTEXT_WINDOW_TOKENS - maxTokens,
    });

    // If payload is empty (e.g. no prior memory), create single prompt message
    if (payloadMessages.length <= 1) {
      payloadMessages.push({ role: AI_ROLES.USER, content: prompt });
    }

    // 4. Check Cache (Only for non-streaming requests)
    const cacheKey = aiCacheService.generateKey({
      model,
      systemPrompt,
      messages: payloadMessages,
      category,
    });

    if (!stream && aiConfig.enableCache) {
      const cachedResponse = aiCacheService.get(cacheKey);
      if (cachedResponse) {
        const durationMs = Date.now() - startTime;
        aiLogger.logCompletion({
          model,
          promptTokens: cachedResponse.usage?.prompt_tokens || 0,
          completionTokens: cachedResponse.usage?.completion_tokens || 0,
          totalTokens: cachedResponse.usage?.total_tokens || 0,
          durationMs,
          cached: true,
        });

        // Store cached assistant message in conversation memory
        if (saveMemory && userId && currentSessionId) {
          await AIMemoryService.appendMessage({
            sessionId: currentSessionId,
            userId,
            role: AI_ROLES.ASSISTANT,
            content: cachedResponse.content,
            model,
          });
        }

        return {
          ...cachedResponse,
          sessionId: currentSessionId,
          cached: true,
        };
      }
    }

    // 5. Verify API Credentials Configuration
    if (!aiConfig.isConfigured) {
      aiLogger.warn('OpenAI API key not configured or invalid. Executing fallback service.');
      return this.executeFallback({
        category,
        prompt,
        systemPrompt,
        userId,
        sessionId: currentSessionId,
        saveMemory,
        stream,
        expressRes,
        model,
        startTime,
      });
    }

    // 6. Execute API Request with Retry & Backoff Strategy
    try {
      if (stream && expressRes) {
        return await this.executeStreamingCompletion({
          payloadMessages,
          model,
          temperature,
          maxTokens,
          userId,
          sessionId: currentSessionId,
          saveMemory,
          expressRes,
          startTime,
        });
      } else {
        return await this.executeNonStreamingCompletion({
          payloadMessages,
          model,
          temperature,
          maxTokens,
          userId,
          sessionId: currentSessionId,
          saveMemory,
          cacheKey,
          startTime,
        });
      }
    } catch (error) {
      aiLogger.error(`AI Completion failed: ${error.message}. Initiating graceful fallback.`);
      if (aiConfig.enableFallback) {
        return this.executeFallback({
          category,
          prompt,
          systemPrompt,
          userId,
          sessionId: currentSessionId,
          saveMemory,
          stream,
          expressRes,
          model,
          startTime,
          originalError: error,
        });
      }
      throw error;
    }
  }

  /**
   * Executes a standard non-streaming fetch call to OpenAI-compatible endpoint with exponential backoff
   */
  static async executeNonStreamingCompletion({ payloadMessages, model, temperature, maxTokens, userId, sessionId, saveMemory, cacheKey, startTime }) {
    const endpoint = `${aiConfig.baseUrl}/chat/completions`;
    let attempts = 0;
    let lastError = null;

    while (attempts < DEFAULT_AI_LIMITS.MAX_RETRIES) {
      attempts++;
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), aiConfig.timeoutMs);

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${aiConfig.apiKey}`,
          },
          body: JSON.stringify({
            model,
            messages: payloadMessages,
            temperature,
            max_tokens: maxTokens,
            stream: false,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const mappedError = handleOpenAIError(response.status, errorData);
          if (response.status === 429 || response.status >= 500) {
            lastError = mappedError;
            const delay = DEFAULT_AI_LIMITS.INITIAL_RETRY_DELAY_MS * Math.pow(2, attempts - 1);
            aiLogger.warn(`Upstream AI HTTP ${response.status}. Retrying attempt ${attempts}/${DEFAULT_AI_LIMITS.MAX_RETRIES} after ${delay}ms...`);
            await new Promise(r => setTimeout(r, delay));
            continue;
          }
          throw mappedError;
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || '';
        const usage = data.usage || {
          prompt_tokens: AITokenManager.estimateMessagesTokens(payloadMessages),
          completion_tokens: AITokenManager.estimateTextTokens(content),
          total_tokens: 0,
        };
        usage.total_tokens = usage.prompt_tokens + usage.completion_tokens;

        const durationMs = Date.now() - startTime;
        const costData = AITokenManager.calculateCost(model, usage.prompt_tokens, usage.completion_tokens);

        aiLogger.logCompletion({
          model,
          promptTokens: usage.prompt_tokens,
          completionTokens: usage.completion_tokens,
          totalTokens: usage.total_tokens,
          durationMs,
          cached: false,
        });

        const result = {
          content,
          model,
          usage,
          cost: costData,
          sessionId,
          durationMs,
          fallback: false,
        };

        // Cache result
        if (aiConfig.enableCache && cacheKey) {
          aiCacheService.set(cacheKey, result);
        }

        // Save in Conversation Memory
        if (saveMemory && userId && sessionId) {
          await AIMemoryService.appendMessage({
            sessionId,
            userId,
            role: AI_ROLES.ASSISTANT,
            content,
            model,
            isFallback: false,
          });
        }

        return result;
      } catch (err) {
        if (err.name === 'AbortError') {
          lastError = new AIError('AI API request timed out.', 504, 'AI_TIMEOUT');
        } else {
          lastError = err;
        }
        if (attempts >= DEFAULT_AI_LIMITS.MAX_RETRIES) break;
      }
    }

    throw lastError || new AIError('AI completion request failed after retries.', 500);
  }

  /**
   * Executes a streaming fetch call to OpenAI-compatible endpoint
   */
  static async executeStreamingCompletion({ payloadMessages, model, temperature, maxTokens, userId, sessionId, saveMemory, expressRes, startTime }) {
    const endpoint = `${aiConfig.baseUrl}/chat/completions`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), aiConfig.timeoutMs);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${aiConfig.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: payloadMessages,
        temperature,
        max_tokens: maxTokens,
        stream: true,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw handleOpenAIError(response.status, errorData);
    }

    // Stream SSE to Express response and capture accumulated text
    const accumulatedContent = await AIStreamHandler.handleStream({
      upstreamResponse: response,
      expressRes,
    });

    const durationMs = Date.now() - startTime;
    const promptTokens = AITokenManager.estimateMessagesTokens(payloadMessages);
    const completionTokens = AITokenManager.estimateTextTokens(accumulatedContent);

    aiLogger.logCompletion({
      model,
      promptTokens,
      completionTokens,
      totalTokens: promptTokens + completionTokens,
      durationMs,
      cached: false,
    });

    // Save streaming assistant message to conversation memory asynchronously
    if (saveMemory && userId && sessionId && accumulatedContent) {
      await AIMemoryService.appendMessage({
        sessionId,
        userId,
        role: AI_ROLES.ASSISTANT,
        content: accumulatedContent,
        model,
        isFallback: false,
      });
    }

    return {
      content: accumulatedContent,
      sessionId,
      durationMs,
      streamed: true,
    };
  }

  /**
   * Executes Rule-Based Fallback when upstream API is unavailable
   */
  static async executeFallback({ category, prompt, systemPrompt, userId, sessionId, saveMemory, stream, expressRes, model, startTime, originalError = null }) {
    const fallbackText = AIFallbackService.getFallbackResponse({ category, prompt, systemPrompt });
    const durationMs = Date.now() - startTime;

    if (stream && expressRes) {
      expressRes.setHeader('Content-Type', 'text/event-stream');
      expressRes.setHeader('Cache-Control', 'no-cache');
      expressRes.setHeader('Connection', 'keep-alive');
      expressRes.write(`data: ${JSON.stringify({ content: fallbackText, done: true, fallback: true })}\n\n`);
      expressRes.write('data: [DONE]\n\n');
      expressRes.end();
    }

    if (saveMemory && userId && sessionId) {
      await AIMemoryService.appendMessage({
        sessionId,
        userId,
        role: AI_ROLES.ASSISTANT,
        content: fallbackText,
        model: `${model}-fallback`,
        isFallback: true,
      });
    }

    return {
      content: fallbackText,
      model: `${model}-fallback`,
      usage: {
        prompt_tokens: AITokenManager.estimateTextTokens(prompt),
        completion_tokens: AITokenManager.estimateTextTokens(fallbackText),
        total_tokens: AITokenManager.estimateTextTokens(prompt + fallbackText),
      },
      cost: { totalCost: 0, currency: 'USD' },
      sessionId,
      durationMs,
      fallback: true,
      errorDetails: originalError ? originalError.message : 'API key unconfigured or service offline',
    };
  }

  /**
   * Specialized method to generate Farm Job Postings
   */
  static async generateJobDescription({ userId, jobDetails }) {
    const prompt = AIPromptTemplates.buildJobDescriptionPrompt(jobDetails);
    return this.chatCompletion({
      userId,
      prompt,
      category: AI_CATEGORIES.JOB_GENERATOR,
      saveMemory: false,
    });
  }

  /**
   * Specialized method to generate Agricultural Worker Profile Summaries
   */
  static async generateWorkerProfileSummary({ userId, profileDetails }) {
    const prompt = AIPromptTemplates.buildWorkerProfilePrompt(profileDetails);
    return this.chatCompletion({
      userId,
      prompt,
      category: AI_CATEGORIES.PROFILE_SUMMARY,
      saveMemory: false,
    });
  }

  /**
   * Specialized method for Agronomy Advisory & Disease/Pest Control
   */
  static async getAgronomyAdvice({ userId, cropDetails }) {
    const prompt = AIPromptTemplates.buildAgronomyAdvicePrompt(cropDetails);
    return this.chatCompletion({
      userId,
      prompt,
      category: AI_CATEGORIES.AGRONOMY,
      saveMemory: true,
    });
  }

  /**
   * Specialized method for Multilingual Content Translation
   */
  static async translateContent({ userId, text, targetLanguage, sourceLanguage = 'English' }) {
    const prompt = AIPromptTemplates.buildTranslationPrompt({ text, targetLanguage, sourceLanguage });
    return this.chatCompletion({
      userId,
      prompt,
      category: AI_CATEGORIES.TRANSLATION,
      saveMemory: false,
    });
  }

  /**
   * System Health Status & AI Metrics
   */
  static getSystemStatus() {
    return {
      status: 'operational',
      provider: 'OpenAI-Compatible Architecture',
      isConfigured: aiConfig.isConfigured,
      model: aiConfig.model,
      baseUrl: aiConfig.baseUrl,
      cacheStats: aiCacheService.getStats(),
      features: {
        streaming: aiConfig.enableStreaming,
        caching: aiConfig.enableCache,
        fallback: aiConfig.enableFallback,
        tokenBudgeting: true,
        conversationMemory: true,
      },
    };
  }
}
