import React, { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Socket } from 'socket.io-client';
import { socketService } from '../services/socketService';
import { SOCKET_EVENTS } from '../socket/socketEvents';
import { useAuth } from './AuthContext';

export interface NotificationPayload {
  _id: string;
  type: string;
  title: string;
  message: string;
  createdAt: string;
  meta?: any;
}

export interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  onlineUserIds: string[];
  latestNotification: NotificationPayload | null;
  latestStatusUpdate: any | null;
  joinJobRoom: (jobId: string) => void;
  leaveJobRoom: (jobId: string) => void;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  onlineUserIds: [],
  latestNotification: null,
  latestStatusUpdate: null,
  joinJobRoom: () => { },
  leaveJobRoom: () => { },
});

export const SocketProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [onlineUserIds, setOnlineUserIds] = useState<string[]>([]);
  const [latestNotification, setLatestNotification] = useState<NotificationPayload | null>(null);
  const [latestStatusUpdate, setLatestStatusUpdate] = useState<any | null>(null);

  useEffect(() => {
    const activeToken =
      localStorage.getItem('agri_access_token') ||
      localStorage.getItem('accessToken') ||
      localStorage.getItem('token');

    if (!user || !activeToken) {
      if (socketService.isConnected()) {
        socketService.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    const sock = socketService.connect(activeToken);
    setSocket(sock);

    if (sock) {
      const handleConnect = () => setIsConnected(true);
      const handleDisconnect = () => setIsConnected(false);

      sock.on('connect', handleConnect);
      sock.on('disconnect', handleDisconnect);

      if (sock.connected) {
        setIsConnected(true);
      }

      // Listen for notifications
      const unsubNotify = socketService.onNotification((notification) => {
        setLatestNotification(notification);
      });

      // Listen for status updates
      const unsubStatus = socketService.onApplicationStatusUpdate((statusData) => {
        setLatestStatusUpdate(statusData);
      });

      // Listen for presence
      const unsubPresence = socketService.onPresenceChange(
        (data) => {
          if (data.userId) {
            const userId = String(data.userId);

            setOnlineUserIds((prev) =>
              Array.from(new Set([...prev, userId]))
            );
          }
        },
        (data) => {
          if (data.userId) {
            const userId = String(data.userId);

            setOnlineUserIds((prev) =>
              prev.filter((id) => String(id) !== userId)
            );
          }
        }
      );

      // Get users who are already online
      sock.emit(SOCKET_EVENTS.GET_ONLINE_USERS, (response: any) => {
        if (
          response?.success &&
          Array.isArray(response.data?.onlineUserIds)
        ) {
          setOnlineUserIds(
            response.data.onlineUserIds.map((id: string) => String(id))
          );
        }
      });

      return () => {
        sock.off('connect', handleConnect);
        sock.off('disconnect', handleDisconnect);
        unsubNotify();
        unsubStatus();
        unsubPresence();
      };
    }
  }, [user]);

  const joinJobRoom = (jobId: string) => {
    socketService.joinJobRoom(jobId);
  };

  const leaveJobRoom = (jobId: string) => {
    socketService.leaveJobRoom(jobId);
  };

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        onlineUserIds,
        latestNotification,
        latestStatusUpdate,
        joinJobRoom,
        leaveJobRoom,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = (): SocketContextType => {
  return useContext(SocketContext);
};
