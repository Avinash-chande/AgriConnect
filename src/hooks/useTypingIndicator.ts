import { useState, useEffect, useRef, useCallback } from 'react';
import { useSocket } from './useSocket';
import { SOCKET_EVENTS } from '../socket/socketEvents';

export interface TypingState {
  isTyping: boolean;
  typerName?: string;
  typerRole?: string;
  label?: string;
}

export const useTypingIndicator = (
  conversationId: string | null,
  recipientId: string | null,
  inactivityTimeoutMs: number = 2500
) => {
  const { socket } = useSocket();

  // Multi-conversation typing map: { [conversationId]: TypingState }
  const [typingMap, setTypingMap] = useState<Record<string, TypingState>>({});
  const [isCurrentlyTyping, setIsCurrentlyTyping] = useState<boolean>(false);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Emit stop typing event
  const stopTyping = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (socket && socket.connected && conversationId && recipientId) {
      socket.emit(SOCKET_EVENTS.CHAT_STOP_TYPING, {
        conversationId,
        recipientId,
      });
    }
    setIsCurrentlyTyping(false);
  }, [socket, conversationId, recipientId]);

  // Handle Keystroke input change with auto-inactivity timeout
  const handleKeystroke = useCallback(() => {
    if (!socket || !socket.connected || !conversationId || !recipientId) return;

    if (!isCurrentlyTyping) {
      setIsCurrentlyTyping(true);
      socket.emit(SOCKET_EVENTS.CHAT_TYPING, {
        conversationId,
        recipientId,
      });
    }

    // Reset auto-stop inactivity timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      stopTyping();
    }, inactivityTimeoutMs);
  }, [socket, conversationId, recipientId, isCurrentlyTyping, inactivityTimeoutMs, stopTyping]);

  // Listen for incoming socket typing events across conversations
  useEffect(() => {
    if (!socket) return;

    const handleTypingEvent = (payload: {
      conversationId: string;
      userId: string;
      userName?: string;
      userRole?: string;
    }) => {
      if (!payload.conversationId) return;

      const roleStr = (payload.userRole || '').toLowerCase();
      const roleLabel = roleStr === 'farmer' ? 'Farmer' : roleStr === 'worker' ? 'Worker' : payload.userName || 'User';
      const labelText = `${roleLabel} is typing...`;

      setTypingMap((prev) => ({
        ...prev,
        [payload.conversationId]: {
          isTyping: true,
          typerName: payload.userName,
          typerRole: payload.userRole,
          label: labelText,
        },
      }));
    };

    const handleStopTypingEvent = (payload: { conversationId: string; userId: string }) => {
      if (!payload.conversationId) return;

      setTypingMap((prev) => ({
        ...prev,
        [payload.conversationId]: {
          isTyping: false,
          label: undefined,
        },
      }));
    };

    socket.on(SOCKET_EVENTS.CHAT_TYPING, handleTypingEvent);
    socket.on(SOCKET_EVENTS.CHAT_STOP_TYPING, handleStopTypingEvent);

    return () => {
      socket.off(SOCKET_EVENTS.CHAT_TYPING, handleTypingEvent);
      socket.off(SOCKET_EVENTS.CHAT_STOP_TYPING, handleStopTypingEvent);
    };
  }, [socket]);

  // Clean up timer on unmount or conversation change
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [conversationId]);

  const activeTypingState: TypingState = conversationId
    ? typingMap[conversationId] || { isTyping: false }
    : { isTyping: false };

  return {
    handleKeystroke,
    stopTyping,
    activeTypingState,
    typingMap,
  };
};
