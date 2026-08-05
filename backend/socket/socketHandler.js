import { connectedUsersStore } from './connectedUsers.js';
import { SOCKET_EVENTS } from './socketEvents.js';
import { getUserRoomName, getJobRoomName, formatSocketResponse } from './socketUtils.js';
import { logger } from '../utils/logger.js';
import { validateSocketPayload } from '../validators/chatValidator.js';

/**
 * Main Socket Connection & Event Handler
 */
export const registerSocketHandlers = (io, socket) => {
  const user = socket.user;
  if (!user || !user.id) {
    logger.warn(`🔌 Connection rejected for unauthenticated socket ${socket.id}`);
    socket.disconnect(true);
    return;
  }

  const userId = user.id;
  const userRoom = getUserRoomName(userId);

  // 1. Join user's personal room (all browser tabs of this user join this same room)
  socket.join(userRoom);
  logger.info(`🔌 Socket ${socket.id} joined personal room '${userRoom}' for user ${user.name}`);

  // 2. Track connection in connectedUsersStore
  const isFirstTabOnline = connectedUsersStore.addSocket(userId, socket.id);
  if (isFirstTabOnline) {
    logger.info(`🟢 User ${user.name} (${userId}) came ONLINE`);
    io.emit(SOCKET_EVENTS.USER_ONLINE, { userId, role: user.role, name: user.name });
  }

  // Send authentication success confirmation to connected client
  socket.emit(SOCKET_EVENTS.AUTHENTICATED, formatSocketResponse(true, {
    userId,
    userName: user.name,
    role: user.role,
    socketId: socket.id,
    onlineUsersCount: connectedUsersStore.getOnlineUsersCount(),
  }));

  // 3. Room Management Event: Join Job Room
  socket.on(SOCKET_EVENTS.JOIN_JOB_ROOM, (data, callback) => {
    try {
      const jobId = typeof data === 'object' ? data.jobId : data;
      if (!jobId) {
        if (typeof callback === 'function') callback(formatSocketResponse(false, null, 'Job ID is required'));
        return;
      }
      const jobRoom = getJobRoomName(jobId);
      socket.join(jobRoom);
      logger.info(`🔌 User ${user.name} joined job room '${jobRoom}'`);
      if (typeof callback === 'function') {
        callback(formatSocketResponse(true, { room: jobRoom, message: `Joined job room ${jobId}` }));
      }
    } catch (err) {
      if (typeof callback === 'function') callback(formatSocketResponse(false, null, err.message));
    }
  });

  // Leave Job Room
  socket.on(SOCKET_EVENTS.LEAVE_JOB_ROOM, (data, callback) => {
    try {
      const jobId = typeof data === 'object' ? data.jobId : data;
      if (jobId) {
        const jobRoom = getJobRoomName(jobId);
        socket.leave(jobRoom);
        logger.info(`🔌 User ${user.name} left job room '${jobRoom}'`);
      }
      if (typeof callback === 'function') {
        callback(formatSocketResponse(true, { message: 'Left job room' }));
      }
    } catch (err) {
      if (typeof callback === 'function') callback(formatSocketResponse(false, null, err.message));
    }
  });

  // Fetch presence info
  socket.on(SOCKET_EVENTS.GET_ONLINE_USERS, (callback) => {
    if (typeof callback === 'function') {
      callback(formatSocketResponse(true, {
        onlineUserIds: connectedUsersStore.getOnlineUserIds(),
        onlineUsersCount: connectedUsersStore.getOnlineUsersCount(),
      }));
    }
  });

  // Ping/Pong heartbeat
  socket.on('ping', (callback) => {
    if (typeof callback === 'function') {
      callback({ pong: true, timestamp: Date.now() });
    } else {
      socket.emit('pong', { timestamp: Date.now() });
    }
  // High-Frequency Typing Events Relay (Volatile to avoid socket buffer bottleneck)
  socket.on(SOCKET_EVENTS.CHAT_TYPING, (data) => {
    const validation = validateSocketPayload(data);
    if (!validation.isValid) return;

    const { conversationId, recipientId } = data || {};
    if (recipientId && conversationId) {
      io.to(`user:${recipientId}`).volatile.emit(SOCKET_EVENTS.CHAT_TYPING, {
        conversationId,
        userId,
        userName: user.name,
        userRole: user.role,
      });
    }
  });

  socket.on(SOCKET_EVENTS.CHAT_STOP_TYPING, (data) => {
    const validation = validateSocketPayload(data);
    if (!validation.isValid) return;

    const { conversationId, recipientId } = data || {};
    if (recipientId && conversationId) {
      io.to(`user:${recipientId}`).volatile.emit(SOCKET_EVENTS.CHAT_STOP_TYPING, {
        conversationId,
        userId,
      });
    }
  });

  // 4. Handle Disconnect
  socket.on(SOCKET_EVENTS.DISCONNECT, (reason) => {
    logger.info(`🔌 Socket ${socket.id} disconnected (User: ${user.name}). Reason: ${reason}`);

    const { userId: disconnectedUserId, isLastConnection, lastSeen } = connectedUsersStore.removeSocket(socket.id);

    if (isLastConnection && disconnectedUserId) {
      const lastSeenTime = lastSeen ? lastSeen.toISOString() : new Date().toISOString();
      logger.info(`🔴 User ${user.name} (${disconnectedUserId}) went OFFLINE at ${lastSeenTime}`);
      io.emit(SOCKET_EVENTS.USER_OFFLINE, {
        userId: disconnectedUserId,
        role: user.role,
        lastSeen: lastSeenTime,
      });
    }
  });
};
