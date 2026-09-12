import { useState, useMemo } from 'react';
import { useConversations } from './useChatQuery';
import { useAuth } from '../context/AuthContext';
import type { ConversationData } from '../services/chatService';

export interface UseConversationListOptions {
  limit?: number;
  initialFilter?: 'all' | 'unread';
}

export const useConversationList = (options: UseConversationListOptions = {}) => {
  const { limit = 20, initialFilter = 'all' } = options;
  const { user } = useAuth();
  const [page, setPage] = useState<number>(1);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'unread'>(initialFilter);

  const currentUserId = user?._id || '';
  const userRole = (user?.role || '').toLowerCase();

  const { data, isLoading, isFetching, refetch } = useConversations({
    page,
    limit,
  });

  const rawConversations: ConversationData[] = data?.conversations || [];
  const pagination = data?.pagination || { totalPages: 1, hasNextPage: false };

  // Calculate unread count for current user
  const getUnreadForUser = (conv: ConversationData): number => {
    if (userRole === 'farmer') {
      return conv.unreadCount?.farmer || 0;
    }
    return conv.unreadCount?.worker || 0;
  };

  // 1. Filter by Search Query & Active Filter Tab ("All" vs "Unread")
  const filteredConversations = useMemo(() => {
    return rawConversations.filter((conv) => {
      const partner = userRole === 'farmer' ? conv.worker : conv.farmer;
      const partnerName = partner?.name || '';
      const partnerEmail = partner?.email || '';
      const jobTitle = conv.job?.title || '';
      const lastText = conv.lastMessageText || '';

      const matchesSearch =
        !searchTerm.trim() ||
        partnerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        partnerEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
        jobTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lastText.toLowerCase().includes(searchTerm.toLowerCase());

      const unread = getUnreadForUser(conv);
      const matchesUnreadTab = activeFilter === 'all' || unread > 0;

      return matchesSearch && matchesUnreadTab;
    });
  }, [rawConversations, searchTerm, activeFilter, userRole]);

  // 2. Sort by Latest Message Timestamp (`lastMessageAt` Descending)
  const sortedConversations = useMemo(() => {
    return [...filteredConversations].sort((a, b) => {
      const timeA = new Date(a.lastMessageAt || a.updatedAt).getTime();
      const timeB = new Date(b.lastMessageAt || b.updatedAt).getTime();
      return timeB - timeA;
    });
  }, [filteredConversations]);

  const totalUnreadCount = useMemo(() => {
    return rawConversations.reduce((acc, conv) => acc + getUnreadForUser(conv), 0);
  }, [rawConversations, userRole]);

  const loadNextPage = () => {
    if (pagination.hasNextPage) {
      setPage((prev) => prev + 1);
    }
  };

  const loadPrevPage = () => {
    if (page > 1) {
      setPage((prev) => prev - 1);
    }
  };

  return {
    conversations: sortedConversations,
    rawConversations,
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
  };
};
