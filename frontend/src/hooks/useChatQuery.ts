import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getOrCreateConversation,
  getUserConversations,
  getConversationMessages,
  sendChatMessage,
  editChatMessage,
  deleteChatMessage,
  markConversationRead,
  getUnreadChatCount,
  searchChat,
} from '../services/chatService';

import { useEffect } from 'react';
import { useSocket } from './useSocket';

export const useConversations = (params?: { page?: number; limit?: number }) => {
  return useQuery({
    queryKey: ['conversations', params],
    queryFn: () => getUserConversations(params),
    staleTime: 5000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchInterval: 30000,
  });
};

export const useConversationMessages = (
  conversationId: string,
  params?: { page?: number; limit?: number; search?: string }
) => {
  const queryClient = useQueryClient();
  const { socket } = useSocket();

  useEffect(() => {
    if (!socket || !conversationId) return;

    // 🔥 New message received
    const handleNewMessage = (payload: any) => {
      if (payload.conversationId === conversationId) {
        queryClient.invalidateQueries({
          queryKey: ['chatMessages', conversationId],
        });

        queryClient.invalidateQueries({
          queryKey: ['conversations'],
        });

        queryClient.invalidateQueries({
          queryKey: ['unreadChatCount'],
        });
      }
    };

    // ✅ Message delivered
    const handleDelivered = (payload: any) => {
      if (payload.conversationId === conversationId) {
        queryClient.invalidateQueries({
          queryKey: ['chatMessages', conversationId],
        });
      }
    };

    // 👁️ Message seen
    const handleSeen = (payload: any) => {
      if (payload.conversationId === conversationId) {
        queryClient.invalidateQueries({
          queryKey: ['chatMessages', conversationId],
        });

        queryClient.invalidateQueries({
          queryKey: ['conversations'],
        });

        queryClient.invalidateQueries({
          queryKey: ['unreadChatCount'],
        });
      }
    };

    // 🔥 Listen for new messages
    socket.on('chat:message_received', handleNewMessage);

    // Existing events
    socket.on('chat:message_delivered', handleDelivered);
    socket.on('chat:message_seen', handleSeen);
    socket.on('chat:read_receipt', handleSeen);

    // 🧹 Cleanup listeners
    return () => {
      socket.off('chat:message_received', handleNewMessage);
      socket.off('chat:message_delivered', handleDelivered);
      socket.off('chat:message_seen', handleSeen);
      socket.off('chat:read_receipt', handleSeen);
    };
  }, [socket, conversationId, queryClient]);

  return useQuery({
    queryKey: ['chatMessages', conversationId, params],
    queryFn: () => getConversationMessages(conversationId, params),
    enabled: !!conversationId,
  });
};

export const useGetOrCreateConversation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { workerId?: string; farmerId?: string; jobId: string }) =>
      getOrCreateConversation(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
};

export const useSendMessage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      conversationId,
      text,
      attachments,
    }: {
      conversationId: string;
      text: string;
      attachments?: any[];
    }) => sendChatMessage(conversationId, { text, attachments }),
    onSuccess: (_, { conversationId }) => {
      queryClient.invalidateQueries({ queryKey: ['chatMessages', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
};

export const useEditMessage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ messageId, text }: { messageId: string; text: string }) =>
      editChatMessage(messageId, text),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatMessages'] });
    },
  });
};

export const useDeleteMessage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (messageId: string) => deleteChatMessage(messageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatMessages'] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
};

export const useMarkConversationRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (conversationId: string) => markConversationRead(conversationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['unreadChatCount'] });
    },
  });
};

export const useUnreadChatCount = () => {
  return useQuery({
    queryKey: ['unreadChatCount'],
    queryFn: () => getUnreadChatCount(),
    refetchInterval: 30000,
  });
};

export const useChatSearch = (params: { q: string; page?: number; limit?: number }) => {
  return useQuery({
    queryKey: ['chatSearch', params],
    queryFn: () => searchChat(params),
    enabled: !!params.q && params.q.trim().length > 0,
    staleTime: 10000,
  });
};
