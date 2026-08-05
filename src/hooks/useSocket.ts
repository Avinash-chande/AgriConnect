import { useSocket as useSocketContext } from '../context/SocketContext';
import type { SocketContextType } from '../context/SocketContext';

/**
 * Custom hook to access Socket.IO state & room actions throughout the app
 */
export const useSocket = (): SocketContextType => {
  return useSocketContext();
};
