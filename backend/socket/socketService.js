import { connectedUsersStore } from './connectedUsers.js';
import { SOCKET_EVENTS } from './socketEvents.js';
import { logger } from '../utils/logger.js';

let ioInstance = null;

/**
 * Initialize Socket Service with IO instance
 */
export const initSocketService = (io) => {
  ioInstance = io;
};

/**
 * Get active Socket.IO server instance
 */
export const getIO = () => {
  if (!ioInstance) {
    throw new Error('Socket.IO instance has not been initialized yet.');
  }
  return ioInstance;
};

/**
 * Emit an event to a specific user (delivers to all active browser tabs/sockets of that user)
 */
export const emitToUser = (userId, event, payload) => {
  if (!ioInstance || !userId) return false;
  const targetRoom = `user:${userId.toString()}`;
  ioInstance.to(targetRoom).emit(event, payload);
  logger.debug(`📡 Socket emitted '${event}' to user room '${targetRoom}'`);
  return true;
};

/**
 * Emit an event to multiple target users
 */
export const emitToUsers = (userIds = [], event, payload) => {
  if (!ioInstance || !Array.isArray(userIds) || userIds.length === 0) return false;
  userIds.forEach((uId) => {
    emitToUser(uId, event, payload);
  });
  return true;
};

/**
 * Emit an event to a specific custom room (e.g., job room)
 */
export const emitToRoom = (roomName, event, payload) => {
  if (!ioInstance || !roomName) return false;
  ioInstance.to(roomName).emit(event, payload);
  logger.debug(`📡 Socket emitted '${event}' to custom room '${roomName}'`);
  return true;
};

/**
 * Broadcast an event to all connected clients across the system
 */
export const broadcastEvent = (event, payload) => {
  if (!ioInstance) return false;
  ioInstance.emit(event, payload);
  logger.debug(`📡 Socket broadcasted '${event}' to all connected clients`);
  return true;
};

/**
 * Check if a given user is currently online
 */
export const isUserOnline = (userId) => {
  return connectedUsersStore.isUserOnline(userId);
};

/**
 * Get online user count and user IDs
 */
export const getPresenceStatus = () => {
  return {
    totalConnections: connectedUsersStore.getTotalConnectionsCount(),
    onlineUsersCount: connectedUsersStore.getOnlineUsersCount(),
    onlineUserIds: connectedUsersStore.getOnlineUserIds(),
  };
};
