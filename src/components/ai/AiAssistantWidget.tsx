import React, { useState, useEffect, useRef } from 'react';
<<<<<<< HEAD
import { aiService, AiMessageItem } from '../../services/aiService';
=======
import { aiService } from '../../services/aiService';
import type { AiMessageItem } from '../../services/aiService';
>>>>>>> cf994d4 (otp verification problem solved)
import { useAuth } from '../../context/AuthContext';

export const AiAssistantWidget: React.FC = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [conversationId, setConversationId] = useState<string | undefined>(undefined);
  const [messages, setMessages] = useState<AiMessageItem[]>([
    {
      role: 'assistant',
      content: `👋 Namaste! I am AgriConnect AI Assistant. How can I help you today?
You can ask me about:
- 🌾 Crop advice & pest remedies
- 💼 Finding matched jobs or worker candidates
- 📝 Profile optimization & job post generator
- ❓ How platform features work`,
    },
  ]);
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSend = async (textToSend?: string) => {
    const queryText = (textToSend || inputMessage).trim();
    if (!queryText || isStreaming) return;

    setInputMessage('');
    const userMsg: AiMessageItem = { role: 'user', content: queryText };
    setMessages((prev) => [...prev, userMsg]);

    setIsStreaming(true);

    // Placeholder assistant message for streaming chunks
    const assistantIndex = messages.length + 1;
    setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

    let accumulatedContent = '';

    await aiService.streamChatMessage(
      queryText,
      conversationId,
      'AGRICONNECT_ASSISTANT',
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
        if (data.conversationId) setConversationId(data.conversationId);
      },
      (err) => {
        setIsStreaming(false);
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = {
            role: 'assistant',
            content: `⚠️ Error: ${err.message || 'Failed to connect to AI server.'}`,
          };
          return next;
        });
      }
    );
  };

  const handlePromptChipClick = (prompt: string) => {
    handleSend(prompt);
  };

  const handleClearSession = () => {
    setConversationId(undefined);
    setMessages([
      {
        role: 'assistant',
        content: 'New chat session started. Ask me anything about AgriConnect or farming!',
      },
    ]);
  };

  if (!user) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans">
      {/* Floating Action Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-3 px-5 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-full shadow-2xl transition-all transform hover:scale-105 active:scale-95 border border-emerald-400/30"
          aria-label="Open AgriConnect AI Assistant"
        >
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-lg animate-pulse">
            🤖
          </div>
          <span>Ask AgriConnect AI</span>
          <span className="flex h-2.5 w-2.5 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-200"></span>
          </span>
        </button>
      )}

      {/* Floating Chat Drawer Window */}
      {isOpen && (
        <div className="w-[380px] sm:w-[420px] h-[580px] bg-slate-900 text-slate-100 rounded-2xl shadow-2xl flex flex-col border border-emerald-500/30 overflow-hidden backdrop-blur-xl transition-all">
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-700 to-teal-800 p-4 flex items-center justify-between shadow-md">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-emerald-500/30 border border-emerald-300/40 flex items-center justify-center text-xl">
                🤖
              </div>
              <div>
                <h3 className="font-bold text-white text-base leading-tight">AgriConnect AI</h3>
                <p className="text-xs text-emerald-200 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Powered by Groq LLM
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleClearSession}
                title="New Chat"
                className="p-1.5 rounded-lg hover:bg-white/10 text-emerald-200 hover:text-white transition-colors text-xs"
              >
                🔄 Reset
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-emerald-100 hover:text-white transition-colors text-lg"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Quick Suggestion Chips */}
          <div className="px-3 py-2 bg-slate-800/80 border-b border-slate-700/50 flex items-center gap-2 overflow-x-auto text-xs whitespace-nowrap scrollbar-none">
<<<<<<< HEAD
            {user.role === 'Worker' ? (
              <>
                <button
                  onClick={() => handlePromptChipClick('Recommend the best matching jobs for my profile')}
                  className="px-2.5 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 rounded-full border border-emerald-500/30 transition-colors"
                >
                  💼 Recommend Jobs
                </button>
                <button
                  onClick={() => handlePromptChipClick('Analyze my profile and give improvement suggestions')}
                  className="px-2.5 py-1 bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 rounded-full border border-teal-500/30 transition-colors"
=======
            {user.role === 'worker' ? (
              <>
                <button
                  onClick={() =>
                    handlePromptChipClick('Recommend the best matching jobs for my profile')
                  }
                >
                  💼 Recommend Jobs
                </button>

                <button
                  onClick={() =>
                    handlePromptChipClick('Analyze my profile and give improvement suggestions')
                  }
>>>>>>> cf994d4 (otp verification problem solved)
                >
                  📝 Profile Suggestions
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => handlePromptChipClick('Recommend candidate workers for my farm posting')}
                  className="px-2.5 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 rounded-full border border-emerald-500/30 transition-colors"
                >
                  👨‍🌾 Find Workers
                </button>
                <button
                  onClick={() => handlePromptChipClick('Help me write a job description for Paddy harvest')}
                  className="px-2.5 py-1 bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 rounded-full border border-teal-500/30 transition-colors"
                >
                  📋 Generate Job Post
                </button>
              </>
            )}
            <button
              onClick={() => handlePromptChipClick('Suggest high yield crops for loamy soil in Kharif season')}
              className="px-2.5 py-1 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-full border border-slate-600 transition-colors"
            >
              🌾 Crop Advice
            </button>
          </div>

          {/* Messages Body */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3.5 text-sm bg-slate-900/90">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-full bg-emerald-600/40 border border-emerald-400/30 flex items-center justify-center text-sm shrink-0 mt-0.5">
                    🌱
                  </div>
                )}
                <div
<<<<<<< HEAD
                  className={`max-w-[82%] px-3.5 py-2.5 rounded-2xl whitespace-pre-wrap leading-relaxed shadow-sm ${
                    msg.role === 'user'
                      ? 'bg-emerald-600 text-white rounded-br-none'
                      : 'bg-slate-800 text-slate-100 border border-slate-700/80 rounded-bl-none'
                  }`}
=======
                  className={`max-w-[82%] px-3.5 py-2.5 rounded-2xl whitespace-pre-wrap leading-relaxed shadow-sm ${msg.role === 'user'
                      ? 'bg-emerald-600 text-white rounded-br-none'
                      : 'bg-slate-800 text-slate-100 border border-slate-700/80 rounded-bl-none'
                    }`}
>>>>>>> cf994d4 (otp verification problem solved)
                >
                  {msg.content || (isStreaming && index === messages.length - 1 ? 'Thinking...' : '')}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Footer */}
          <div className="p-3 bg-slate-800/90 border-t border-slate-700/60 flex items-center gap-2">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask about crops, jobs, platform..."
              className="flex-1 px-3.5 py-2 bg-slate-900 text-slate-100 placeholder-slate-400 rounded-xl border border-slate-700 focus:outline-none focus:border-emerald-500 text-sm"
              disabled={isStreaming}
            />
            <button
              onClick={() => handleSend()}
              disabled={!inputMessage.trim() || isStreaming}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-medium rounded-xl transition-all text-sm shrink-0 flex items-center gap-1.5"
            >
              {isStreaming ? (
                <span className="animate-spin">⏳</span>
              ) : (
                <>
                  <span>Send</span> ➔
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AiAssistantWidget;
