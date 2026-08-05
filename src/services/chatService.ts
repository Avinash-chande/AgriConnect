import api from './api';

export interface ChatUser {
  _id: string;
  name: string;
  email: string;
  role: string;
  mobile?: string;
  farmerProfile?: any;
  workerProfile?: any;
}

export interface ConversationData {
  _id: string;
  participants: ChatUser[];
  farmer: ChatUser;
  worker: ChatUser;
  job: {
    _id: string;
    title: string;
    category?: string;
    workType?: string;
    dailyWage?: number;
    status?: string;
  };
  application: {
    _id: string;
    status: string;
    coverLetter?: string;
    createdAt?: string;
  };
  lastMessage?: any;
  lastMessageText: string;
  lastMessageAt: string;
  unreadCount: {
    farmer: number;
    worker: number;
  };
  updatedAt: string;
}

export interface ChatMessage {
  _id: string;
  conversation: string;
  sender: ChatUser;
  recipient: ChatUser;
  text: string;
  attachments?: { url: string; fileType?: string; fileName?: string }[];
  status?: 'sent' | 'delivered' | 'seen';
  deliveredAt?: string;
  isRead: boolean;
  readAt?: string;
  isEdited: boolean;
  editedAt?: string;
  isDeleted: boolean;
  deletedAt?: string;
  createdAt: string;
}

export interface GetConversationsResponse {
  conversations: ConversationData[];
  pagination: any;
}

export interface GetMessagesResponse {
  conversation: ConversationData;
  messages: ChatMessage[];
  pagination: any;
}

export const getOrCreateConversation = async (payload: {
  workerId?: string;
  farmerId?: string;
  jobId: string;
}): Promise<ConversationData> => {
  const response = await api.post('/chat/conversations', payload);
  return response.data.data;
};

export const getUserConversations = async (params?: {
  page?: number;
  limit?: number;
}): Promise<GetConversationsResponse> => {
  const response = await api.get('/chat/conversations', { params });
  return {
    conversations: response.data.data,
    pagination: response.data.meta?.pagination || {},
  };
};

export const getConversationMessages = async (
  conversationId: string,
  params?: { page?: number; limit?: number; search?: string }
): Promise<GetMessagesResponse> => {
  const response = await api.get(`/chat/conversations/${conversationId}/messages`, { params });
  return {
    conversation: response.data.meta?.conversation,
    messages: response.data.data,
    pagination: response.data.meta?.pagination || {},
  };
};

export const sendChatMessage = async (
  conversationId: string,
  payload: { text: string; attachments?: any[] }
): Promise<ChatMessage> => {
  const response = await api.post(`/chat/conversations/${conversationId}/messages`, payload);
  return response.data.data;
};

export const editChatMessage = async (
  messageId: string,
  text: string
): Promise<ChatMessage> => {
  const response = await api.patch(`/chat/messages/${messageId}`, { text });
  return response.data.data;
};

export const deleteChatMessage = async (messageId: string): Promise<ChatMessage> => {
  const response = await api.delete(`/chat/messages/${messageId}`);
  return response.data.data;
};

export const markConversationRead = async (
  conversationId: string
): Promise<{ success: boolean; conversationId: string }> => {
  const response = await api.patch(`/chat/conversations/${conversationId}/read`);
  return response.data.data;
};

export const getUnreadChatCount = async (): Promise<number> => {
  const response = await api.get('/chat/unread-count');
  return response.data.data?.totalUnread || 0;
};

export interface UploadedAttachmentResponse {
  url: string;
  public_id: string;
  fileType: 'image' | 'pdf' | 'document';
  fileName: string;
  fileSize?: number;
}

export const uploadChatAttachment = async (
  file: File,
  onProgress?: (percent: number) => void
): Promise<UploadedAttachmentResponse> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await api.post('/chat/upload-attachment', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress: (progressEvent) => {
      if (progressEvent.total && onProgress) {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onProgress(percentCompleted);
      }
    },
  });

  return response.data.data;
};

export interface ChatSearchResult {
  query: string;
  messages: ChatMessage[];
  conversations: ConversationData[];
  pagination: any;
}

export const searchChat = async (params: { q: string; page?: number; limit?: number }): Promise<ChatSearchResult> => {
  const response = await api.get('/chat/search', { params });
  return response.data.data;
};
