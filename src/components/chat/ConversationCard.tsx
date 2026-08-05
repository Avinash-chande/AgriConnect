import React from 'react';
import { motion } from 'framer-motion';
import { Briefcase, Clock } from 'lucide-react';
import { HighlightText } from '../common/HighlightText';
import type { ConversationData } from '../../services/chatService';

interface ConversationCardProps {
  conversation: ConversationData;
  isSelected: boolean;
  isOnline: boolean;
  unreadCount: number;
  currentUserId: string;
  userRole: string;
  searchQuery?: string;
  onSelect: (conversation: ConversationData) => void;
}

/**
 * Smart Time Formatter for Chat Conversations
 */
const formatConversationTime = (dateString: string): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();

  const isToday = date.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  if (isToday) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  if (isYesterday) {
    return 'Yesterday';
  }

  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 3600 * 24));
  if (diffDays < 7) {
    return date.toLocaleDateString([], { weekday: 'short' });
  }

  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

export const ConversationCard: React.FC<ConversationCardProps> = ({
  conversation,
  isSelected,
  isOnline,
  unreadCount,
  currentUserId,
  userRole,
  searchQuery,
  onSelect,
}) => {
  const partner = userRole === 'farmer' ? conversation.worker : conversation.farmer;
  const partnerName = partner?.name || 'User';
  const partnerInitials = partnerName.charAt(0).toUpperCase();

  const formattedTime = formatConversationTime(conversation.lastMessageAt || conversation.updatedAt);
  const jobTitle = conversation.job?.title || 'Job Vacancy';

  const lastMsg = conversation.lastMessage;
  const lastMsgSenderId = lastMsg?.sender ? (lastMsg.sender._id || lastMsg.sender).toString() : '';
  const isSentByMe = lastMsgSenderId === currentUserId;

  const previewSnippet = conversation.lastMessageText
    ? `${isSentByMe ? 'You: ' : ''}${conversation.lastMessageText}`
    : 'Tap to view conversation thread';

  return (
    <motion.button
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      onClick={() => onSelect(conversation)}
      role="option"
      aria-selected={isSelected}
      className={`w-full text-left p-3.5 rounded-2xl transition-all relative flex items-start space-x-3 group ${
        isSelected
          ? 'bg-emerald-950/40 border border-emerald-500/40 shadow-lg shadow-emerald-950/20'
          : 'bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800/60'
      }`}
    >
      {/* User Avatar + Online Indicator Badge */}
      <div className="relative flex-shrink-0">
        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-600/30 to-teal-800/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-base shadow-inner">
          {partnerInitials}
        </div>
        {isOnline ? (
          <span
            className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-slate-900 rounded-full shadow-md"
            title="User is currently online"
          />
        ) : (
          <span
            className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-slate-600 border-2 border-slate-900 rounded-full opacity-60"
            title="User is offline"
          />
        )}
      </div>

      {/* Content Meta */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1.5 truncate">
            <h4 className="text-xs font-bold text-white tracking-tight truncate group-hover:text-emerald-400 transition-colors">
              <HighlightText text={partnerName} highlight={searchQuery} />
            </h4>
            <span className="text-[9px] font-semibold uppercase px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700 flex-shrink-0">
              {partner?.role || 'Member'}
            </span>
          </div>

          <span className="text-[10px] font-medium text-slate-500 flex items-center flex-shrink-0 ml-2">
            <Clock className="w-2.5 h-2.5 mr-0.5 opacity-60 inline" />
            {formattedTime}
          </span>
        </div>

        {/* Job Title Pill */}
        <div className="flex items-center space-x-1 mt-1 text-[11px] text-emerald-400 font-medium truncate">
          <Briefcase className="w-3 h-3 inline flex-shrink-0 text-emerald-400" />
          <span className="truncate">
            <HighlightText text={jobTitle} highlight={searchQuery} />
          </span>
        </div>

        {/* Message Snippet & Unread Badge */}
        <div className="flex items-center justify-between mt-1.5">
          <div className={`text-[11px] truncate pr-2 ${unreadCount > 0 ? 'font-semibold text-white' : 'text-slate-400'}`}>
            <HighlightText text={previewSnippet} highlight={searchQuery} />
          </div>

          {unreadCount > 0 && (
            <motion.span
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              className="bg-emerald-500 text-slate-950 text-[10px] font-extrabold px-2 py-0.5 rounded-full flex-shrink-0 shadow-md shadow-emerald-500/20"
            >
              {unreadCount}
            </motion.span>
          )}
        </div>
      </div>
    </motion.button>
  );
};
