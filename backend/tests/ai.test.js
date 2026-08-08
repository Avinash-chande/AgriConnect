import request from 'supertest';
import { jest } from '@jest/globals';
import app from '../app.js';
import { aiConfig } from '../config/aiConfig.js';
import { AIPromptTemplates } from '../services/ai/aiPromptTemplates.js';
import { AITokenManager } from '../services/ai/aiTokenManager.js';
import { aiCacheService } from '../services/ai/aiCacheService.js';
import { AIFallbackService } from '../services/ai/aiFallbackService.js';
import { AIService } from '../services/ai/aiService.js';
import { AI_CATEGORIES } from '../constants/aiConstants.js';
import { User } from '../models/User.js';
import { generateAccessToken } from '../config/jwt.js';
import mongoose from 'mongoose';

const mockUserId = new mongoose.Types.ObjectId().toString();

describe('AgriConnect AI Infrastructure Unit & Integration Tests', () => {
  let farmerToken;
  let workerToken;

  beforeAll(() => {
    farmerToken = generateAccessToken({ id: mockUserId, role: 'Farmer' });
    workerToken = generateAccessToken({ id: mockUserId, role: 'Worker' });
  });

  beforeEach(() => {
    User.findOne = jest.fn().mockImplementation(() => Promise.resolve({
      _id: mockUserId,
      role: 'Farmer',
      name: 'Test Farmer',
      isDeleted: false,
    }));
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe('1. Environment Configuration (aiConfig)', () => {
    test('should load valid default AI configuration', () => {
      const config = aiConfig;
      expect(config).toBeDefined();
      expect(config.model).toBeDefined();
      expect(config.baseUrl).toContain('http');
      expect(config.maxTokens).toBeGreaterThan(0);
      expect(config.enableCache).toBe(true);
      expect(config.enableFallback).toBe(true);
    });
  });

  describe('2. Prompt Templates (AIPromptTemplates)', () => {
    test('should return system prompt for specified AI category', () => {
      const agronomyPrompt = AIPromptTemplates.getSystemPrompt(AI_CATEGORIES.AGRONOMY);
      expect(agronomyPrompt).toContain('AgriConnect Senior Agronomist AI');
    });

    test('should construct job description prompt correctly', () => {
      const prompt = AIPromptTemplates.buildJobDescriptionPrompt({
        cropType: 'Cotton',
        location: 'Punjab',
        wage: '₹500',
        tasks: 'Cotton picking and bundling',
      });
      expect(prompt).toContain('Cotton');
      expect(prompt).toContain('Punjab');
      expect(prompt).toContain('₹500');
    });

    test('should construct worker profile prompt correctly', () => {
      const prompt = AIPromptTemplates.buildWorkerProfilePrompt({
        name: 'Ramesh Singh',
        skills: ['Tractor Driving', 'Pesticide Spraying'],
        experienceYears: 5,
      });
      expect(prompt).toContain('Ramesh Singh');
      expect(prompt).toContain('Tractor Driving');
    });

    test('should construct translation prompt correctly', () => {
      const prompt = AIPromptTemplates.buildTranslationPrompt({
        text: 'Apply pesticide evenly across crops',
        targetLanguage: 'Hindi',
      });
      expect(prompt).toContain('Hindi');
      expect(prompt).toContain('Apply pesticide');
    });
  });

  describe('3. Token Management (AITokenManager)', () => {
    test('should estimate token counts for text strings', () => {
      const sampleText = 'AgriConnect AI infrastructure for smart farming';
      const tokens = AITokenManager.estimateTextTokens(sampleText);
      expect(tokens).toBeGreaterThan(0);
      expect(tokens).toBeLessThan(50);
    });

    test('should trim messages to fit inside token budget', () => {
      const messages = [
        { role: 'user', content: 'Message 1 ' + 'A'.repeat(500) },
        { role: 'assistant', content: 'Response 1 ' + 'B'.repeat(500) },
        { role: 'user', content: 'Latest message' },
      ];
      const trimmed = AITokenManager.trimMessagesToTokenBudget(messages, 'System prompt', 200);
      expect(trimmed.length).toBeLessThan(messages.length);
      expect(trimmed[trimmed.length - 1].content).toBe('Latest message');
    });

    test('should calculate cost based on token usage', () => {
      const cost = AITokenManager.calculateCost('gpt-4o-mini', 1000, 500);
      expect(cost).toHaveProperty('totalCost');
      expect(cost.currency).toBe('USD');
    });
  });

  describe('4. AI Cache Service (aiCacheService)', () => {
    test('should generate deterministic hash key and cache responses', () => {
      const payload = {
        model: 'gpt-4o-mini',
        prompt: 'How to control paddy blast disease?',
        category: AI_CATEGORIES.AGRONOMY,
      };

      const key = aiCacheService.generateKey(payload);
      expect(key).toBeDefined();

      aiCacheService.set(key, { content: 'Use Tricyclazole 75% WP' }, 60);
      const cached = aiCacheService.get(key);
      expect(cached).toEqual({ content: 'Use Tricyclazole 75% WP' });

      const stats = aiCacheService.getStats();
      expect(stats.hits).toBeGreaterThanOrEqual(1);
    });
  });

  describe('5. Fallback Responses (AIFallbackService)', () => {
    test('should generate Agronomy fallback when API is offline', () => {
      const fallback = AIFallbackService.getFallbackResponse({
        category: AI_CATEGORIES.AGRONOMY,
        prompt: 'Yellowing leaves in wheat field',
      });
      expect(fallback).toContain('AgriConnect');
      expect(fallback.length).toBeGreaterThan(50);
    });

    test('should generate Job Description fallback', () => {
      const fallback = AIFallbackService.getFallbackResponse({
        category: AI_CATEGORIES.JOB_GENERATOR,
        prompt: 'Harvesting workers needed',
      });
      expect(fallback).toContain('Responsibilities');
    });

    test('should generate Profile Summary fallback', () => {
      const fallback = AIFallbackService.getFallbackResponse({
        category: AI_CATEGORIES.PROFILE_SUMMARY,
        prompt: 'Tractor driver profile',
      });
      expect(fallback).toContain('Competencies');
    });

    test('should generate Government Scheme fallback', () => {
      const fallback = AIFallbackService.getFallbackResponse({
        category: AI_CATEGORIES.GOVT_SCHEMES,
        prompt: 'PM-KISAN details',
      });
      expect(fallback).toContain('PM-KISAN');
    });
  });

  describe('6. AI Service System Status & Operations', () => {
    test('should return system status metrics', () => {
      const status = AIService.getSystemStatus();
      expect(status.status).toBe('operational');
      expect(status.features.caching).toBe(true);
      expect(status.features.fallback).toBe(true);
    });

    test('should execute fallback completion gracefully', async () => {
      const result = await AIService.chatCompletion({
        userId: mockUserId,
        prompt: 'What is PM-KISAN scheme?',
        category: AI_CATEGORIES.GOVT_SCHEMES,
        saveMemory: false,
      });

      expect(result).toHaveProperty('content');
      expect(result.fallback).toBe(true);
    });
  });

  describe('7. Express Controller & Routes Endpoints', () => {
    test('GET /api/v1/ai/status should return 200 and operational status', async () => {
      const res = await request(app).get('/api/v1/ai/status');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('operational');
    });

    test('POST /api/v1/ai/chat should reject unauthenticated request with 401', async () => {
      const res = await request(app)
        .post('/api/v1/ai/chat')
        .send({ prompt: 'Hello AI' });
      expect(res.status).toBe(401);
    });

    test('POST /api/v1/ai/chat should accept authenticated request and return response', async () => {
      const res = await request(app)
        .post('/api/v1/ai/chat')
        .set('Authorization', `Bearer ${farmerToken}`)
        .send({ prompt: 'Tips for organic sugarcane cultivation' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('content');
    });

    test('POST /api/v1/ai/agronomy-advice should return agronomy guidance', async () => {
      const res = await request(app)
        .post('/api/v1/ai/agronomy-advice')
        .set('Authorization', `Bearer ${farmerToken}`)
        .send({
          cropName: 'Tomato',
          problemDescription: 'Black spots on lower leaves',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.content).toContain('AgriConnect');
    });

    test('POST /api/v1/ai/generate-job-description should generate job post for farmer', async () => {
      const res = await request(app)
        .post('/api/v1/ai/generate-job-description')
        .set('Authorization', `Bearer ${farmerToken}`)
        .send({
          cropType: 'Paddy',
          location: 'Karnal, Haryana',
          wage: '₹600/day',
          tasks: 'Paddy harvesting and transport',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('content');
    });

    test('POST /api/v1/ai/generate-worker-profile should generate profile for worker', async () => {
      User.findOne = jest.fn().mockImplementation(() => Promise.resolve({
        _id: mockUserId,
        role: 'Worker',
        name: 'Test Worker',
        isDeleted: false,
      }));

      const res = await request(app)
        .post('/api/v1/ai/generate-worker-profile')
        .set('Authorization', `Bearer ${workerToken}`)
        .send({
          name: 'Balwinder Singh',
          skills: ['Combine Harvester Operator', 'Tractor Mechanic'],
          experienceYears: '7',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('content');
    });

    test('POST /api/v1/ai/translate should translate agricultural text', async () => {
      const res = await request(app)
        .post('/api/v1/ai/translate')
        .set('Authorization', `Bearer ${farmerToken}`)
        .send({
          text: 'Wear protective mask during pesticide application',
          targetLanguage: 'Punjabi',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('content');
    });
  });
});
