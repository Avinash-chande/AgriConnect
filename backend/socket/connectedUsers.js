/**
 * AgriConnect Connected Users Tracker
 * Manages active Socket.IO connections for users across multiple browser tabs/devices.
 */

import { User } from '../models/User.js';

class ConnectedUsersStore {
  constructor() {
    // Map of userId (string) -> Set of socketIds (string)
    this.userSocketsMap = new Map();
    // Map of socketId (string) -> userId (string)
    this.socketToUserMap = new Map();
  }

  /**
   * Add a socket connection for a user
   */
  addSocket(userId, socketId) {
    const uId = userId.toString();
    if (!this.userSocketsMap.has(uId)) {
      this.userSocketsMap.set(uId, new Set());
    }

    const socketSet = this.userSocketsMap.get(uId);
    const isFirstConnection = socketSet.size === 0;

    socketSet.add(socketId);
    this.socketToUserMap.set(socketId, uId);

    if (isFirstConnection) {
      // Async update database status
      User.findByIdAndUpdate(uId, { isOnline: true }).catch(() => {});
    }

    return isFirstConnection; // Returns true if user just came online
  }

  /**
   * Remove a socket connection on disconnect
   */
  removeSocket(socketId) {
    const userId = this.socketToUserMap.get(socketId);
    if (!userId) return { userId: null, isLastConnection: false };

    this.socketToUserMap.delete(socketId);
    const socketSet = this.userSocketsMap.get(userId);

    let isLastConnection = false;
    let lastSeenDate = new Date();
    if (socketSet) {
      socketSet.delete(socketId);
      if (socketSet.size === 0) {
        this.userSocketsMap.delete(userId);
        isLastConnection = true; // Returns true if user has no remaining active tabs/devices
        // Async update database status & lastSeen timestamp
        User.findByIdAndUpdate(userId, { isOnline: false, lastSeen: lastSeenDate }).catch(() => {});
      }
    }

    return { userId, isLastConnection, lastSeen: lastSeenDate };
  }

  /**
   * Get all active socket IDs for a given user
   */
  getUserSockets(userId) {
    const uId = userId ? userId.toString() : '';
    const socketSet = this.userSocketsMap.get(uId);
    return socketSet ? Array.from(socketSet) : [];
  }

  /**
   * Check if a user is currently online (has at least one connected socket)
   */
  isUserOnline(userId) {
    const uId = userId ? userId.toString() : '';
    const socketSet = this.userSocketsMap.get(uId);
    return socketSet !== undefined && socketSet.size > 0;
  }

  /**
   * Get all currently online user IDs
   */
  getOnlineUserIds() {
    return Array.from(this.userSocketsMap.keys());
  }

  /**
   * Get count of total connected sockets across all users
   */
  getTotalConnectionsCount() {
    return this.socketToUserMap.size;
  }

  /**
   * Get total number of distinct online users
   */
  getOnlineUsersCount() {
    return this.userSocketsMap.size;
  }

  /**
   * Clear all stored connections (e.g. server shutdown)
   */
  clear() {
    this.userSocketsMap.clear();
    this.socketToUserMap.clear();
  }
}

export const connectedUsersStore = new ConnectedUsersStore();
