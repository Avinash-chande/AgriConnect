import api from './api';

export interface UserPresence {
  userId: string;
  name: string;
  role: string;
  isOnline: boolean;
  lastSeen?: string;
}

export const getUserPresence = async (userId: string): Promise<UserPresence> => {
  const response = await api.get(`/profiles/presence/${userId}`);
  return response.data.data;
};
