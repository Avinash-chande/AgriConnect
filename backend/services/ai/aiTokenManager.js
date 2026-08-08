import { ESTIMATED_TOKEN_PRICING, DEFAULT_AI_LIMITS } from '../../constants/aiConstants.js';

/**
 * Token Estimation & Budget Management Service for OpenAI-compatible models
 */
export class AITokenManager {
  /**
   * Estimates token count for a text string using BPE approximation (~4 chars/token for English/Code)
   */
  static estimateTextTokens(text) {
    if (!text || typeof text !== 'string') return 0;
    const trimmed = text.trim();
    if (!trimmed) return 0;

    // Approximate token count: ~1 token per 4 characters or ~0.75 tokens per word
    const charCount = trimmed.length;
    const wordCount = trimmed.split(/\s+/).length;
    const estimated = Math.ceil(Math.max(charCount / 3.8, wordCount * 1.3));
    return estimated;
  }

  /**
   * Estimates total token count for an array of OpenAI chat messages format [{role, content}]
   */
  static estimateMessagesTokens(messages = [], systemPrompt = '') {
    let total = 0;
    if (systemPrompt) {
      total += 4 + this.estimateTextTokens(systemPrompt);
    }

    for (const msg of messages) {
      total += 4; // Every message has overhead <im_start>{role/name}\n{content}<im_end>\n
      if (msg.content) {
        total += this.estimateTextTokens(msg.content);
      }
      if (msg.name) {
        total += this.estimateTextTokens(msg.name);
      }
    }
    total += 2; // Priming assistant overhead
    return total;
  }

  /**
   * Trims conversation messages array using a sliding window to fit within token limits
   */
  static trimMessagesToTokenBudget(messages = [], systemPrompt = '', maxBudgetTokens = 3000) {
    if (!Array.isArray(messages) || messages.length === 0) {
      return [];
    }

    const systemTokens = systemPrompt ? this.estimateTextTokens(systemPrompt) + 4 : 0;
    const availableBudget = maxBudgetTokens - systemTokens - 100; // Leave 100 tokens reserve

    if (availableBudget <= 0) {
      // Return only the last message if budget is severely constrained
      const lastMsg = messages[messages.length - 1];
      return [lastMsg];
    }

    const trimmed = [];
    let currentTokens = 0;

    // Iterate backwards starting from the most recent message
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      const msgTokens = this.estimateTextTokens(msg.content || '') + 4;

      if (currentTokens + msgTokens <= availableBudget) {
        trimmed.unshift(msg);
        currentTokens += msgTokens;
      } else {
        // If we can't fit earlier history, break
        break;
      }
    }

    return trimmed;
  }

  /**
   * Calculates estimated API cost for a request based on model token rates
   */
  static calculateCost(model = 'gpt-4o-mini', promptTokens = 0, completionTokens = 0) {
    const rates = ESTIMATED_TOKEN_PRICING[model] || ESTIMATED_TOKEN_PRICING.default;
    const promptCost = (promptTokens / 1000) * rates.promptPer1k;
    const completionCost = (completionTokens / 1000) * rates.completionPer1k;
    const totalCost = promptCost + completionCost;

    return {
      promptCost: Number(promptCost.toFixed(6)),
      completionCost: Number(completionCost.toFixed(6)),
      totalCost: Number(totalCost.toFixed(6)),
      currency: 'USD',
    };
  }
}
