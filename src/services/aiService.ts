import api from './api';

export interface AiMessageItem {
  _id?: string;
  role: 'system' | 'user' | 'assistant';
  content: string;
  createdAt?: string;
}

export interface AiConversationSession {
  _id: string;
  title: string;
  systemPromptType: string;
  model: string;
  lastMessageText: string;
  messageCount: number;
  totalTokens: number;
  updatedAt: string;
}

export interface JobRecommendationItem {
  jobId: string;
  jobTitle: string;
  category: string;
  cropType: string;
  dailyWage: number;
  workType: string;
  location: string;
  matchScore: number;
  reason: string;
  missingSkills: string[];
  suggestedImprovements: string[];
}

export interface WorkerCandidateItem {
  workerId: string;
  candidateName: string;
  matchScore: number;
  hiringReason: string;
  summary: string;
  strengths: string[];
  weaknesses: string[];
}

export interface ProfileAnalysisResult {
  workerId: string;
  profileScore: number;
  improvedHeadline: string;
  improvedBio: string;
  improvedSummary: string;
  improvedExperienceDescription: string;
  recommendedSkills: string[];
  missingInformation: string[];
  suggestions: string[];
}

export interface GeneratedJobDescriptionResult {
  jobTitle: string;
  description: string;
  requiredSkills: string[];
  responsibilities: string[];
  benefits: string[];
  safetyInstructions: string[];
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

/**
 * AI Service for AgriConnect Frontend
 */
export const aiService = {
  /**
   * Send synchronous chat message
   */
  async sendChatMessage(message: string, conversationId?: string, systemPromptType: string = 'AGRICONNECT_ASSISTANT') {
    const res = await api.post('/ai/chat', {
      message,
      conversationId,
      systemPromptType,
    });
    return res.data;
  },

  /**
   * Stream chat response using SSE (Fetch ReadableStream pipeline)
   */
  async streamChatMessage(
    message: string,
    conversationId: string | undefined,
    systemPromptType: string = 'AGRICONNECT_ASSISTANT',
    onChunk: (chunk: string) => void,
    onDone: (data: { conversationId: string; usage?: any }) => void,
    onError: (err: Error) => void
  ) {
    const token = localStorage.getItem('agri_access_token');
    try {
      const response = await fetch(`${API_BASE_URL}/ai/chat/stream`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ message, conversationId, systemPromptType }),
      });


      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      if (!reader) throw new Error('ReadableStream not supported by browser.');

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const jsonStr = line.replace(/^data:\s*/, '').trim();
            if (!jsonStr) continue;

            try {
              const event = JSON.parse(jsonStr);
              if (event.type === 'chunk' && event.content) {
                onChunk(event.content);
              } else if (event.type === 'done') {
                onDone({ conversationId: event.conversationId, usage: event.usage });
              } else if (event.type === 'error') {
                onError(new Error(event.message || 'Streaming error'));
              }
            } catch (parseErr) {
              console.warn('Failed to parse SSE JSON chunk:', jsonStr);
            }
          }
        }
      }
    } catch (error: any) {
      onError(error instanceof Error ? error : new Error(error?.message || 'Streaming failure'));
    }
  },

  /**
   * Get user AI sessions
   */
  async getConversations(page = 1, limit = 20) {
    const res = await api.get('/ai/conversations', { params: { page, limit } });
    return res.data;
  },

  /**
   * Get conversation details & full message history
   */
  async getConversationById(id: string) {
    const res = await api.get(`/ai/conversations/${id}`);
    return res.data;
  },

  /**
   * Delete conversation session
   */
  async deleteConversation(id: string) {
    const res = await api.delete(`/ai/conversations/${id}`);
    return res.data;
  },

  /**
   * Get Job Recommendations for Worker
   */
  async getJobRecommendations() {
    const res = await api.get('/ai/recommendations/jobs');
    return res.data;
  },

  /**
   * Get Worker Recommendations for Farmer
   */
  async getWorkerRecommendations(jobId?: string) {
    const res = await api.get('/ai/recommendations/workers', { params: { jobId } });
    return res.data;
  },

  /**
   * Analyze and Improve Worker Profile
   */
  async analyzeProfile() {
    const res = await api.get('/ai/profile/analyze');
    return res.data;
  },

  /**
   * Generate Job Description
   */
  async generateJobDescription(params: {
    crop: string;
    workType?: string;
    numberOfWorkers?: number;
    dailyWage?: number;
    duration?: string;
    location?: string;
  }) {
    const res = await api.post('/ai/jobs/generate-description', params);
    return res.data;
  },

  /**
   * AI Natural Language Smart Search
   */
  async performSmartSearch(query: string) {
    const res = await api.post('/ai/search', { query });
    return res.data;
  },

  /**
   * AI Wage Prediction
   */
  async predictWage(params: {
    crop: string;
    district: string;
    state?: string;
    season?: string;
    experience?: number;
    workersNeeded?: number;
    workingHours?: number;
  }) {
    const res = await api.post('/ai/predict-wage', params);
    return res.data;
  },

  /**
   * Crop-Based Worker Candidate Recommendation
   */
  async getCropWorkerRecommendations(params: {
    crop: string;
    district?: string;
    state?: string;
    equipmentNeeded?: string[];
  }) {
    const res = await api.post('/ai/recommendations/workers-by-crop', params);
    return res.data;
  },

  /**
   * AI Professional Worker Resume Generator
   */
  async generateResume(workerProfileId?: string) {
    const res = await api.get('/ai/resume', { params: { workerProfileId } });
    return res.data;
  },

  /**
   * Get Resume PDF Download URL
   */
  getResumeDownloadUrl(workerProfileId?: string) {
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';
    return `${baseUrl}/ai/resume/download${workerProfileId ? `?workerProfileId=${workerProfileId}` : ''}`;
  },

  /**
   * AI Interview Preparation Question Generation
   */
  async generateInterviewQuestions(params: {
    jobTitle: string;
    crop: string;
    experience?: number;
    skills?: string[];
  }) {
    const res = await api.post('/ai/interview/generate', params);
    return res.data;
  },

  /**
   * Evaluate AI Interview Answers & Score Readiness
   */
  async evaluateInterviewAnswers(params: {
    sessionId: string;
    userAnswers: { id: string; userAnswer: string }[];
  }) {
    const res = await api.post('/ai/interview/evaluate', params);
    return res.data;
  },

  /**
   * Get User Interview Prep History
   */
  async getInterviewHistory(page = 1, limit = 10) {
    const res = await api.get('/ai/interview/history', { params: { page, limit } });
    return res.data;
  },

  /**
   * Conversational Farming AI Assistant (Sync)
   */
  async sendFarmingAssistantMessage(payload: {
    conversationId?: string;
    message: string;
    topicMode?: string;
    location?: string;
  }) {
    const res = await api.post('/ai/farming-assistant', payload);
    return res.data;
  },

  /**
   * Conversational Farming AI Assistant Stream (SSE)
   */
  async streamFarmingAssistantMessage(
    payload: {
      conversationId?: string;
      message: string;
      topicMode?: string;
      location?: string;
    },
    onChunk: (chunk: string) => void,
    onDone: (data: { conversationId: string; usage?: any }) => void,
    onError: (err: Error) => void
  ) {
    const token = localStorage.getItem('token');
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

    try {
      const response = await fetch(`${baseUrl}/ai/farming-assistant/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('ReadableStream not supported');
      }

      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const jsonStr = line.replace(/^data:\s*/, '').trim();
            if (!jsonStr) continue;

            try {
              const event = JSON.parse(jsonStr);
              if (event.type === 'chunk' && event.content) {
                onChunk(event.content);
              } else if (event.type === 'done') {
                onDone({ conversationId: event.conversationId, usage: event.usage });
              } else if (event.type === 'error') {
                onError(new Error(event.message || 'Farming AI streaming error'));
              }
            } catch (parseErr) {
              console.warn('Failed to parse SSE JSON chunk:', jsonStr);
            }
          }
        }
      }
    } catch (error: any) {
      onError(error instanceof Error ? error : new Error(error?.message || 'Farming AI streaming failure'));
    }
  },

  /**
   * Get Farmer AI Analytics Insights & Chart Data
   */
  async getFarmerAnalytics() {
    const res = await api.get('/ai/analytics/farmer');
    return res.data;
  },

  /**
   * Get Worker AI Analytics Insights & Chart Data
   */
  async getWorkerAnalytics() {
    const res = await api.get('/ai/analytics/worker');
    return res.data;
  },

  /**
   * Get Token Telemetry Usage Stats
   */
  async getUsageStats() {
    const res = await api.get('/ai/usage');
    return res.data;
  },
};

export default aiService;
