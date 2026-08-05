import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ConversationListModule } from '../components/chat/ConversationListModule';
import { ChatWindow } from '../components/chat/ChatWindow';
import { useConversations } from '../hooks/useChatQuery';
import type { ConversationData } from '../services/chatService';
import { MessageSquare, ArrowLeft } from 'lucide-react';

export const ChatPage: React.FC = () => {
  const { conversationId } = useParams<{ conversationId?: string }>();
  const navigate = useNavigate();

  const { data } = useConversations();
  const conversations: ConversationData[] = data?.conversations || [];

  const [selectedConversation, setSelectedConversation] = useState<ConversationData | null>(null);

  useEffect(() => {
    if (conversationId && conversations.length > 0) {
      const found = conversations.find((c) => c._id === conversationId);
      if (found) {
        setSelectedConversation(found);
      }
    } else if (!conversationId && conversations.length > 0 && !selectedConversation) {
      setSelectedConversation(conversations[0]);
    }
  }, [conversationId, conversations]);

  const handleSelectConversation = (conv: ConversationData) => {
    setSelectedConversation(conv);
    navigate(`/chat/${conv._id}`);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      {/* Top App Header */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate(-1)}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-white tracking-tight">AgriConnect Chat</h1>
              <p className="text-[10px] text-slate-400">1-to-1 Farmer & Candidate Messaging</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Split Chat Layout */}
      <main className="flex-1 flex overflow-hidden max-w-7xl w-full mx-auto my-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl">
        {/* Left Sidebar: Conversations List */}
        <div className="w-full md:w-1/3 border-r border-slate-800 flex-shrink-0">
          <ConversationListModule
            selectedConversationId={selectedConversation?._id || null}
            onSelectConversation={handleSelectConversation}
          />
        </div>

        {/* Right Main Pane: Active Conversation Chat Window */}
        <div className="hidden md:flex flex-1 flex-col bg-slate-950">
          {selectedConversation ? (
            <ChatWindow conversation={selectedConversation} />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mb-3">
                <MessageSquare className="w-6 h-6 text-slate-500" />
              </div>
              <h3 className="text-sm font-bold text-white mb-1">Select a Conversation</h3>
              <p className="text-xs text-slate-500 max-w-xs">
                Choose a candidate or farmer conversation from the list to start messaging in real time.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
