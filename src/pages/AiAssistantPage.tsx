import React, { useState, useEffect, useRef } from 'react';
import { aiService, AiConversationSession, AiMessageItem } from '../services/aiService';
import { useAuth } from '../context/AuthContext';

export const AiAssistantPage: React.FC = () => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<AiConversationSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | undefined>(undefined);
  const [messages, setMessages] = useState<AiMessageItem[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [activePromptType, setActivePromptType] = useState('AGRICONNECT_ASSISTANT');
  const [usageSummary, setUsageSummary] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadSessions = async () => {
    try {
      const res = await aiService.getConversations();
      if (res.data) {
        setSessions(res.data);
      }
    } catch (err) {
      console.error('Failed to load AI sessions:', err);
    }
  };

  const loadUsage = async () => {
    try {
      const res = await aiService.getUsageStats();
      if (res.data) {
        setUsageSummary(res.data);
      }
    } catch (err) {
      console.error('Failed to load AI usage:', err);
    }
  };

  useEffect(() => {
    loadSessions();
    loadUsage();
  }, []);

  useEffect(() => {
    if (activeSessionId) {
      aiService.getConversationById(activeSessionId).then((res) => {
        if (res.data?.messages) {
          setMessages(res.data.messages);
        }
      });
    } else {
      setMessages([
        {
          role: 'assistant',
          content: `🌾 Welcome to AgriConnect AI Workspace!
I can help you with:
- 💼 Worker Job Recommendations & Farmer Candidate Matching
- 📋 Generating Professional Job Postings
- 📝 Profile Optimization & Skill Guidance
- 🌧️ Seasonal Crop Planning & Pest Protection
- ❓ AgriConnect Platform FAQs & Guidelines`,
        },
      ]);
    }
  }, [activeSessionId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (textToSend?: string) => {
    const queryText = (textToSend || inputMessage).trim();
    if (!queryText || isStreaming) return;

    setInputMessage('');
    const userMsg: AiMessageItem = { role: 'user', content: queryText };
    setMessages((prev) => [...prev, userMsg]);
    setIsStreaming(true);

    setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

    let accumulatedContent = '';

    await aiService.streamChatMessage(
      queryText,
      activeSessionId,
      activePromptType,
      (chunk) => {
        accumulatedContent += chunk;
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = { role: 'assistant', content: accumulatedContent };
          return next;
        });
      },
      (data) => {
        setIsStreaming(false);
        if (data.conversationId) {
          setActiveSessionId(data.conversationId);
          loadSessions();
          loadUsage();
        }
      },
      (err) => {
        setIsStreaming(false);
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = {
            role: 'assistant',
            content: `⚠️ Error: ${err.message || 'AI request failed.'}`,
          };
          return next;
        });
      }
    );
  };

  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await aiService.deleteConversation(sessionId);
      if (activeSessionId === sessionId) {
        setActiveSessionId(undefined);
      }
      loadSessions();
    } catch (err) {
      console.error('Failed to delete session:', err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Page Header */}
      <header className="bg-slate-900/90 border-b border-slate-800 px-6 py-4 flex items-center justify-between shadow-lg backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-xl shadow-md">
            🤖
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-wide">AgriConnect AI Hub</h1>
            <p className="text-xs text-slate-400">Powered by Groq Open-Weights Llama 3.3 Engine</p>
          </div>
        </div>

        {/* Telemetry Summary Pill */}
        {usageSummary && (
          <div className="hidden sm:flex items-center gap-4 text-xs bg-slate-800/80 px-4 py-2 rounded-xl border border-slate-700">
            <div>
              <span className="text-slate-400">Requests:</span>{' '}
              <strong className="text-emerald-400">{usageSummary.totalRequests || 0}</strong>
            </div>
            <div className="border-r border-slate-700 h-4"></div>
            <div>
              <span className="text-slate-400">Total Tokens:</span>{' '}
              <strong className="text-teal-400">{usageSummary.totalTokens || 0}</strong>
            </div>
            <div className="border-r border-slate-700 h-4"></div>
            <div>
              <span className="text-slate-400">Est. Cost:</span>{' '}
              <strong className="text-amber-400">${(usageSummary.totalEstimatedCostUsd || 0).toFixed(4)}</strong>
            </div>
          </div>
        )}
      </header>

      {/* Main Workspace Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Chat Sessions History */}
        <aside className="w-72 bg-slate-900 border-r border-slate-800 p-4 flex flex-col gap-4 hidden md:flex shrink-0">
          <button
            onClick={() => setActiveSessionId(undefined)}
            className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl shadow-sm transition-all flex items-center justify-center gap-2"
          >
            <span>+</span> New Conversation
          </button>

          <div className="flex-1 overflow-y-auto space-y-2">
            <h4 className="text-xs font-semibold uppercase text-slate-400 tracking-wider px-2">History</h4>
            {sessions.length === 0 ? (
              <p className="text-xs text-slate-500 px-2 italic">No past sessions yet.</p>
            ) : (
              sessions.map((sess) => (
                <div
                  key={sess._id}
                  onClick={() => setActiveSessionId(sess._id)}
                  className={`group p-3 rounded-xl cursor-pointer text-xs transition-all flex items-center justify-between border ${
                    activeSessionId === sess._id
                      ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-200'
                      : 'bg-slate-800/50 border-slate-800 hover:bg-slate-800 text-slate-300'
                  }`}
                >
                  <div className="truncate pr-2">
                    <p className="font-semibold truncate">{sess.title}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{sess.messageCount} msgs • {new Date(sess.updatedAt).toLocaleDateString()}</p>
                  </div>
                  <button
                    onClick={(e) => handleDeleteSession(sess._id, e)}
                    className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-400 transition-opacity p-1"
                    title="Delete session"
                  >
                    🗑️
                  </button>
                </div>
              ))
            )}
          </div>
        </aside>

        {/* Right Main Chat Panel */}
        <main className="flex-1 flex flex-col bg-slate-950 overflow-hidden">
          {/* Quick AI Task Bar */}
          <div className="bg-slate-900/60 border-b border-slate-800/80 px-6 py-3 flex items-center gap-3 overflow-x-auto text-xs whitespace-nowrap scrollbar-none">
            <span className="text-slate-400 font-medium">Topic Mode:</span>
            {[
              { label: '🤖 General Assistant', type: 'AGRICONNECT_ASSISTANT' },
              { label: '🌾 Crop Advisor', type: 'CROP_RECOMMENDATION' },
              { label: '💼 Job Matching', type: 'JOB_RECOMMENDATION' },
              { label: '👨‍🌾 Worker Search', type: 'WORKER_RECOMMENDATION' },
              { label: '🐛 Pest Diagnosis', type: 'PEST_DIAGNOSIS' },
            ].map((item) => (
              <button
                key={item.type}
                onClick={() => setActivePromptType(item.type)}
                className={`px-3 py-1.5 rounded-lg border transition-all ${
                  activePromptType === item.type
                    ? 'bg-emerald-600/30 border-emerald-500 text-emerald-300 font-semibold'
                    : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Messages Feed */}
          <div className="flex-1 p-6 overflow-y-auto space-y-4 max-w-4xl w-full mx-auto">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-emerald-600/30 border border-emerald-400/40 flex items-center justify-center text-sm shrink-0">
                    🌱
                  </div>
                )}
                <div
                  className={`max-w-[80%] px-4 py-3 rounded-2xl whitespace-pre-wrap leading-relaxed shadow-sm text-sm ${
                    msg.role === 'user'
                      ? 'bg-emerald-600 text-white rounded-br-none'
                      : 'bg-slate-900 text-slate-100 border border-slate-800 rounded-bl-none shadow-md'
                  }`}
                >
                  {msg.content || (isStreaming && index === messages.length - 1 ? 'Generating response...' : '')}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Controls */}
          <div className="p-4 bg-slate-900 border-t border-slate-800">
            <div className="max-w-4xl mx-auto flex items-center gap-3">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask AgriConnect AI about crops, matching jobs, candidates, or platform features..."
                className="flex-1 px-4 py-3 bg-slate-950 text-slate-100 placeholder-slate-400 rounded-xl border border-slate-800 focus:outline-none focus:border-emerald-500 text-sm"
                disabled={isStreaming}
              />
              <button
                onClick={() => handleSend()}
                disabled={!inputMessage.trim() || isStreaming}
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold rounded-xl transition-all text-sm shrink-0 flex items-center gap-2 shadow-lg"
              >
                {isStreaming ? 'Thinking...' : 'Send Message ➔'}
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AiAssistantPage;
