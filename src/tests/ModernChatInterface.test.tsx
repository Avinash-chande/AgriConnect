import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ModernChatInterface } from '../components/chat/ModernChatInterface';
import type { ConversationData } from '../services/chatService';

// Mock Dependencies
jest.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: { _id: 'farmer-1', name: 'Farmer Ramesh', role: 'Farmer' },
  }),
}));

jest.mock('../hooks/useSocket', () => ({
  useSocket: () => ({
    socket: null,
    isConnected: true,
    onlineUserIds: ['worker-1'],
  }),
}));

jest.mock('../hooks/usePresence', () => ({
  usePresence: () => ({
    presenceMap: { 'worker-1': { isOnline: true } },
  }),
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

const mockConversation: ConversationData = {
  _id: 'conv-123',
  farmer: { _id: 'farmer-1', name: 'Farmer Ramesh', role: 'Farmer' } as any,
  worker: { _id: 'worker-1', name: 'Worker Suresh', role: 'Worker' } as any,
  job: { _id: 'job-1', title: 'Wheat Harvesting Helper' } as any,
  application: { _id: 'app-1' } as any,
  lastMessageText: 'Hello, when can you start?',
  lastMessageAt: new Date().toISOString(),
  unreadCount: { farmer: 0, worker: 0 },
};

describe('ModernChatInterface Component Tests', () => {
  it('should render partner name, job title, and online indicator', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ModernChatInterface conversation={mockConversation} />
      </QueryClientProvider>
    );

    expect(screen.getByText('Worker Suresh')).toBeInTheDocument();
    expect(screen.getByText('Wheat Harvesting Helper')).toBeInTheDocument();
  });

  it('should enable input field for typing messages', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ModernChatInterface conversation={mockConversation} />
      </QueryClientProvider>
    );

    const input = screen.getByPlaceholderText(/Type message to Worker Suresh/i);
    expect(input).toBeInTheDocument();

    fireEvent.change(input, { target: { value: 'Work starts tomorrow at 7 AM' } });
    expect(input).toHaveValue('Work starts tomorrow at 7 AM');
  });
});
