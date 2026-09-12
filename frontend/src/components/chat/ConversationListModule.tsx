import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare,
  Search,
  X,
  Filter,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { ConversationCard } from './ConversationCard';
import { useConversationList } from '../../hooks/useConversationList';
import { useSocket } from '../../hooks/useSocket';
import type { ConversationData } from '../../services/chatService';

interface ConversationListModuleProps {
  selectedConversationId: string | null;
  onSelectConversation: (conversation: ConversationData) => void;
  className?: string;
}

/**
 * Skeleton Loader Component for Conversation Items
 */
const ConversationSkeleton = () => (
  <div className="p-3.5 bg-slate-900/40 border border-slate-800/40 rounded-2xl animate-pulse flex items-start space-x-3">
    <div className="w-11 h-11 bg-slate-800 rounded-2xl flex-shrink-0" />
    <div className="flex-1 space-y-2">
      <div className="h-3 bg-slate-800 rounded w-2/3" />
      <div className="h-2.5 bg-slate-800/60 rounded w-1/2" />
      <div className="h-2.5 bg-slate-800/40 rounded w-3/4" />
    </div>
  </div>
);

export const ConversationListModule: React.FC<ConversationListModuleProps> = ({
  selectedConversationId,
  onSelectConversation,
  className = '',
}) => {
  const { onlineUserIds } = useSocket();

  const {
    conversations,
    totalUnreadCount,
    isLoading,
    isFetching,
    searchTerm,
    setSearchTerm,
    activeFilter,
    setActiveFilter,
    page,
    pagination,
    loadNextPage,
    loadPrevPage,
    refetch,
    getUnreadForUser,
    userRole,
    currentUserId,
  } = useConversationList();

  return (
    <div className={`flex flex-col h-full bg-slate-950 border-r border-slate-800/80 ${className}`}>
      {/* Top Header & Search Control */}
      <div className="p-4 bg-slate-900/80 border-b border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
              <MessageSquare className="w-4.5 h-4.5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight">Conversations</h2>
              <p className="text-[10px] text-slate-400">1-to-1 Application Threads</p>
            </div>
          </div>

          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            title="Refresh conversations"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin text-emerald-400' : ''}`} />
          </button>
        </div>

        {/* Instant Search Bar */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by candidate name, job title..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/80 transition-colors shadow-inner"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Tabs ("All" vs "Unread") */}
        <div className="flex items-center space-x-2 pt-1">
          <button
            onClick={() => setActiveFilter('all')}
            className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-semibold transition-all flex items-center justify-center space-x-1 ${
              activeFilter === 'all'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'bg-slate-800/60 text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Filter className="w-3 h-3" />
            <span>All Chats</span>
            <span className="ml-1 text-[10px] opacity-80">({conversations.length})</span>
          </button>

          <button
            onClick={() => setActiveFilter('unread')}
            className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-semibold transition-all flex items-center justify-center space-x-1 ${
              activeFilter === 'unread'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'bg-slate-800/60 text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Sparkles className="w-3 h-3 text-amber-300 inline" />
            <span>Unread</span>
            {totalUnreadCount > 0 && (
              <span className="ml-1 bg-amber-400 text-slate-950 text-[10px] font-extrabold px-1.5 py-0.2 rounded-full">
                {totalUnreadCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Conversations List Scroll Area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {isLoading ? (
          <div className="space-y-2.5">
            <ConversationSkeleton />
            <ConversationSkeleton />
            <ConversationSkeleton />
          </div>
        ) : conversations.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-8 text-center flex flex-col items-center justify-center my-6"
          >
            <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mb-3">
              <MessageSquare className="w-6 h-6 text-slate-600" />
            </div>
            <h3 className="text-xs font-bold text-white">No Conversations Found</h3>
            <p className="text-[11px] text-slate-500 mt-1 max-w-[200px] leading-relaxed">
              {searchTerm
                ? 'No chats match your search query.'
                : 'Direct messaging starts automatically when a worker applies to a job vacancy.'}
            </p>
          </motion.div>
        ) : (
          <AnimatePresence>
            {conversations.map((conv) => {
              const partner = userRole === 'farmer' ? conv.worker : conv.farmer;
              const isOnline = partner?._id ? onlineUserIds.includes(partner._id) : false;
              const unreadCount = getUnreadForUser(conv);
              const isSelected = conv._id === selectedConversationId;

              return (
                <ConversationCard
                  key={conv._id}
                  conversation={conv}
                  isSelected={isSelected}
                  isOnline={isOnline}
                  unreadCount={unreadCount}
                  currentUserId={currentUserId}
                  userRole={userRole}
                  onSelect={onSelectConversation}
                />
              );
            })}
          </AnimatePresence>
        )}
      </div>

      {/* Bottom Pagination Controls */}
      {pagination && pagination.totalPages > 1 && (
        <div className="p-3 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <button
            onClick={loadPrevPage}
            disabled={page <= 1}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 transition-colors flex items-center space-x-1"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="text-[11px]">Prev</span>
          </button>

          <span className="text-[11px] font-semibold text-slate-300">
            Page {page} of {pagination.totalPages}
          </span>

          <button
            onClick={loadNextPage}
            disabled={!pagination.hasNextPage}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 transition-colors flex items-center space-x-1"
          >
            <span className="text-[11px]">Next</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
