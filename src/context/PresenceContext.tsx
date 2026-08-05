import React, { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useSocket } from '../hooks/useSocket';
import { getUserPresence } from '../services/presenceService';

export interface PresenceInfo {
  isOnline: boolean;
  lastSeen?: string;
}

export interface PresenceContextType {
  presenceMap: Record<string, PresenceInfo>;
  isUserOnline: (userId: string) => boolean;
  getUserLastSeen: (userId: string) => string | undefined;
  fetchUserPresence: (userId: string) => Promise<PresenceInfo>;
}

const PresenceContext = createContext<PresenceContextType>({
  presenceMap: {},
  isUserOnline: () => false,
  getUserLastSeen: () => undefined,
  fetchUserPresence: async () => ({ isOnline: false }),
});

export const PresenceProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { socket } = useSocket();
  const [presenceMap, setPresenceMap] = useState<Record<string, PresenceInfo>>({});

  useEffect(() => {
    if (!socket) return;

    const handleUserOnline = (data: { userId: string; name?: string; role?: string }) => {
      if (data.userId) {
        setPresenceMap((prev) => ({
          ...prev,
          [data.userId]: {
            ...prev[data.userId],
            isOnline: true,
          },
        }));
      }
    };

    const handleUserOffline = (data: { userId: string; lastSeen?: string }) => {
      if (data.userId) {
        setPresenceMap((prev) => ({
          ...prev,
          [data.userId]: {
            isOnline: false,
            lastSeen: data.lastSeen || new Date().toISOString(),
          },
        }));
      }
    };

    socket.on('user:online', handleUserOnline);
    socket.on('user:offline', handleUserOffline);

    return () => {
      socket.off('user:online', handleUserOnline);
      socket.off('user:offline', handleUserOffline);
    };
  }, [socket]);

  const isUserOnline = (userId: string): boolean => {
    if (!userId) return false;
    return !!presenceMap[userId]?.isOnline;
  };

  const getUserLastSeen = (userId: string): string | undefined => {
    if (!userId) return undefined;
    return presenceMap[userId]?.lastSeen;
  };

  const fetchUserPresence = async (userId: string): Promise<PresenceInfo> => {
    if (!userId) return { isOnline: false };
    try {
      const data = await getUserPresence(userId);
      const info = { isOnline: data.isOnline, lastSeen: data.lastSeen };
      setPresenceMap((prev) => ({
        ...prev,
        [userId]: info,
      }));
      return info;
    } catch {
      return { isOnline: false };
    }
  };

  return (
    <PresenceContext.Provider
      value={{
        presenceMap,
        isUserOnline,
        getUserLastSeen,
        fetchUserPresence,
      }}
    >
      {children}
    </PresenceContext.Provider>
  );
};

export const usePresence = (): PresenceContextType => {
  return useContext(PresenceContext);
};
