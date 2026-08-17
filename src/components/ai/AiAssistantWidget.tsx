import React, { useState, useEffect, useRef } from 'react';
import { aiService } from '../../services/aiService';
import type { AiMessageItem } from '../../services/aiService';
import { useAuth } from '../../context/AuthContext';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

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
    const userMessage: AiMessageItem = { role: 'user', content: queryText };
    setMessages((prev) => [...prev, userMessage]);
    setIsStreaming(true);

    // Placeholder assistant message for streaming
    setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

    try {
      await aiService.streamChatMessage(
        queryText,
        conversationId,
        'AGRICONNECT_ASSISTANT',
        (chunk: string) => {
          setMessages((prev) => {
            const updated = [...prev];
            const lastIndex = updated.length - 1;
            if (lastIndex >= 0 && updated[lastIndex].role === 'assistant') {
              updated[lastIndex] = {
                ...updated[lastIndex],
                content: updated[lastIndex].content + chunk,
              };
            }
            return updated;
          });
        },
        (completedResponse: any) => {
          if (completedResponse?.conversationId) {
            setConversationId(completedResponse.conversationId);
          }
          setIsStreaming(false);
        },
        (error: any) => {
          setMessages((prev) => {
            const updated = [...prev];
            const lastIndex = updated.length - 1;
            if (lastIndex >= 0) {
              updated[lastIndex] = {
                role: 'assistant',
                content: `⚠️ Sorry, an error occurred: ${error.message || error}`,
              };
            }
            return updated;
          });
          setIsStreaming(false);
        }
      );
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `⚠️ Error: ${err.message || 'Failed to communicate with AI'}` },
      ]);
      setIsStreaming(false);
    }
  };

  const handlePromptChipClick = (prompt: string) => {
    handleSend(prompt);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Floating Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-full shadow-2xl border border-emerald-400/30 transition-all transform hover:scale-105"
        >
          <span className="text-xl">🤖</span>
          <span className="font-heading font-semibold text-sm">Ask AgriConnect AI</span>
        </button>
      )}

      {/* Floating Drawer Widget */}
      {isOpen && (
        <div className="w-[360px] sm:w-[420px] h-[580px] bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100 animate-fadeIn">
          {/* Header */}
          <div className="px-4 py-3 bg-slate-800 border-b border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-600/30 border border-emerald-400/30 flex items-center justify-center text-lg">
                🤖
              </div>
              <div>
                <h3 className="font-heading font-semibold text-sm text-white">AgriConnect Assistant</h3>
                <span className="text-[11px] text-emerald-400 font-mono">● Online & Ready</span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  setMessages([
                    {
                      role: 'assistant',
                      content: 'Namaste! New chat session started. How can I help you today?',
                    },
                  ]);
                  setConversationId(undefined);
                }}
                title="New Chat Session"
                className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-300 transition-colors text-xs"
              >
                🔄
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-300 transition-colors text-xs"
              >
                ✖
              </button>
            </div>
          </div>

          {/* Quick Suggestion Chips */}
          <div className="px-3 py-2 bg-slate-800/80 border-b border-slate-700/50 flex items-center gap-2 overflow-x-auto text-xs whitespace-nowrap scrollbar-none">
            {user?.role?.toLowerCase() === 'worker' ? (
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
          {/* Messages Body */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3.5 text-sm bg-slate-900/90">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
              >
                {msg.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-full bg-emerald-600/40 border border-emerald-400/30 flex items-center justify-center text-sm shrink-0 mt-0.5">
                    🌱
                  </div>
                )}

                <div
                  className={`max-w-[82%] min-w-0 px-3.5 py-2.5 rounded-2xl leading-relaxed shadow-sm overflow-hidden ${msg.role === 'user'
                    ? 'bg-emerald-600 text-white rounded-br-none'
                    : 'bg-slate-800 text-slate-100 border border-slate-700/80 rounded-bl-none'
                    }`}
                >
                  {msg.content ? (
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        p: ({ children }) => (
                          <p className="mb-3 last:mb-0 leading-6">
                            {children}
                          </p>
                        ),

                        strong: ({ children }) => (
                          <strong className="font-bold text-white">
                            {children}
                          </strong>
                        ),

                        em: ({ children }) => (
                          <em className="italic text-slate-300">
                            {children}
                          </em>
                        ),

                        h1: ({ children }) => (
                          <h1 className="text-lg font-bold text-white mt-2 mb-3">
                            {children}
                          </h1>
                        ),

                        h2: ({ children }) => (
                          <h2 className="text-base font-bold text-white mt-3 mb-2">
                            {children}
                          </h2>
                        ),

                        h3: ({ children }) => (
                          <h3 className="font-bold text-white mt-2 mb-2">
                            {children}
                          </h3>
                        ),

                        ul: ({ children }) => (
                          <ul className="list-disc ml-5 mb-3 space-y-1.5">
                            {children}
                          </ul>
                        ),

                        ol: ({ children }) => (
                          <ol className="list-decimal ml-5 mb-3 space-y-1.5">
                            {children}
                          </ol>
                        ),
f
                        li: ({ children }) => (
                          <li className="pl-1 leading-6">
                            {children}
                          </li>
                        ),

                        // TABLE
                        table: ({ children }) => (
                          <div className="my-3 w-full overflow-x-auto rounded-lg border border-slate-600">
                            <table className="w-full min-w-[600px] border-collapse text-xs">
                              {children}
                            </table>
                          </div>
                        ),

                        thead: ({ children }) => (
                          <thead className="bg-slate-700">
                            {children}
                          </thead>
                        ),

                        tbody: ({ children }) => (
                          <tbody>
                            {children}
                          </tbody>
                        ),

                        tr: ({ children }) => (
                          <tr className="border-b border-slate-700 last:border-b-0">
                            {children}
                          </tr>
                        ),

                        th: ({ children }) => (
                          <th className="px-3 py-2 text-left font-bold text-emerald-300 whitespace-nowrap">
                            {children}
                          </th>
                        ),

                        td: ({ children }) => (
                          <td className="px-3 py-2 align-top text-slate-200 leading-5">
                            {children}
                          </td>
                        ),

                        code: ({ children }) => (
                          <code className="bg-slate-700 px-1.5 py-0.5 rounded text-emerald-300">
                            {children}
                          </code>
                        ),

                        blockquote: ({ children }) => (
                          <blockquote className="border-l-4 border-emerald-500 pl-3 my-3 text-slate-300 italic">
                            {children}
                          </blockquote>
                        ),
                      }}
                    >
                      {msg.content}
                    </ReactMarkdown>
                  ) : (
                    isStreaming && index === messages.length - 1
                      ? 'Thinking...'
                      : ''
                  )}
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
