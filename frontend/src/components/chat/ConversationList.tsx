import React, { useState } from 'react';
import { Search, MessageSquare, Briefcase, Clock } from 'lucide-react';
import type { ConversationData } from '../../services/chatService';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../hooks/useSocket';

interface ConversationListProps {
  conversations: ConversationData[];
  selectedConversationId: string | null;
  onSelectConversation: (conv: ConversationData) => void;
  isLoading: boolean;
}

export const ConversationList: React.FC<ConversationListProps> = ({
  conversations,
  selectedConversationId,
  onSelectConversation,
  isLoading,
}) => {
  const { user } = useAuth();
  const { onlineUserIds } = useSocket();
  const [searchTerm, setSearchTerm] = useState('');

  const userRole = (user?.role || '').toLowerCase();

  const filteredConversations = conversations.filter((conv) => {
    const partner = userRole === 'farmer' ? conv.worker : conv.farmer;
    const partnerName = partner?.name || '';
    const jobTitle = conv.job?.title || '';

    return (
      partnerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      jobTitle.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const getUnreadForMe = (conv: ConversationData) => {
    if (userRole === 'farmer') {
      return conv.unreadCount?.farmer || 0;
    }
    return conv.unreadCount?.worker || 0;
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border-r border-slate-800">
      {/* Header & Search */}
      <div className="p-4 border-b border-slate-800">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <MessageSquare className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg font-bold text-white tracking-tight">Messages</h2>
          </div>
          <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
            {conversations.length} {conversations.length === 1 ? 'chat' : 'chats'}
          </span>
        </div>

        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search candidate or job..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>
      </div>

      {/* List Content */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-800/50">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-slate-500">Loading conversations...</div>
        ) : filteredConversations.length === 0 ? (
          <div className="p-8 text-center flex flex-col items-center justify-center">
            <div className="w-10 h-10 rounded-2xl bg-slate-800/80 flex items-center justify-center mb-2">
              <MessageSquare className="w-5 h-5 text-slate-500" />
            </div>
            <p className="text-xs text-slate-400 font-medium">No messages yet</p>
            <p className="text-[11px] text-slate-500 mt-1 max-w-[200px]">
              Chat opens automatically when a worker applies to a job vacancy.
            </p>
          </div>
        ) : (
          filteredConversations.map((conv) => {
            const partner = userRole === 'farmer' ? conv.worker : conv.farmer;
            const isSelected = conv._id === selectedConversationId;
            const unreadCount = getUnreadForMe(conv);
            const isOnline = partner?._id ? onlineUserIds.includes(partner._id) : false;

            return (
              <button
                key={conv._id}
                onClick={() => onSelectConversation(conv)}
                className={`w-full text-left p-4 transition-all flex items-start space-x-3 hover:bg-slate-800/50 ${
                  isSelected ? 'bg-emerald-950/30 border-l-4 border-emerald-500' : ''
                }`}
              >
                {/* Avatar with Online Badge */}
                <div className="relative flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-sm">
                    {partner?.name ? partner.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  {isOnline && (
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-slate-900 rounded-full"></span>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold text-white truncate">
                      {partner?.name || 'User'}
                    </h3>
                    <span className="text-[10px] text-slate-500 flex items-center">
                      <Clock className="w-3 h-3 mr-1 opacity-70" />
                      {conv.lastMessageAt
                        ? new Date(conv.lastMessageAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : ''}
                    </span>
                  </div>

                  <div className="flex items-center space-x-1 mt-0.5 text-[11px] text-emerald-400 font-medium truncate">
                    <Briefcase className="w-3 h-3 inline flex-shrink-0" />
                    <span className="truncate">{conv.job?.title || 'Job Posting'}</span>
                  </div>

                  <div className="flex items-center justify-between mt-1.5">
                    <p className="text-[11px] text-slate-400 truncate pr-2">
                      {conv.lastMessageText || 'Tap to view conversation'}
                    </p>
                    {unreadCount > 0 && (
                      <span className="bg-emerald-500 text-slate-950 text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 animate-pulse">
                        {unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};
