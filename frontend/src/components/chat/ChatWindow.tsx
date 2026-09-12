import React from 'react';
import { ModernChatInterface } from './ModernChatInterface';
import type { ConversationData } from '../../services/chatService';

interface ChatWindowProps {
  conversation: ConversationData;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ conversation }) => {
  return <ModernChatInterface conversation={conversation} />;
};
