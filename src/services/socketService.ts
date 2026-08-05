import { io, Socket } from 'socket.io-client';
import { SOCKET_EVENTS } from '../socket/socketEvents';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL || 'http://localhost:5000';

class SocketService {
  private socket: Socket | null = null;
  private token: string | null = null;

  /**
   * Connect to Socket.IO server with JWT auth token
   */
  public connect(authToken?: string): Socket | null {
    const tokenToUse = authToken || localStorage.getItem('token') || localStorage.getItem('accessToken');
    if (!tokenToUse) {
      console.warn('[SocketService] Cannot connect: No JWT authentication token available');
      return null;
    }

    // If socket already exists and connected with same token, return existing instance
    if (this.socket && this.socket.connected && this.token === tokenToUse) {
      return this.socket;
    }

    // Disconnect existing socket if token changed
    if (this.socket) {
      this.disconnect();
    }

    this.token = tokenToUse;

    this.socket = io(SOCKET_URL, {
      auth: {
        token: tokenToUse,
      },
      extraHeaders: {
        Authorization: `Bearer ${tokenToUse}`,
      },
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });

    this.socket.on(SOCKET_EVENTS.CONNECT, () => {
      console.log('[SocketService] ⚡ Socket connected successfully:', this.socket?.id);
    });

    this.socket.on(SOCKET_EVENTS.AUTHENTICATED, (response) => {
      console.log('[SocketService] 🔐 Socket authenticated:', response);
    });

    this.socket.on(SOCKET_EVENTS.UNAUTHORIZED, (err) => {
      console.error('[SocketService] ❌ Socket authentication failed:', err);
      this.disconnect();
    });

    this.socket.on(SOCKET_EVENTS.DISCONNECT, (reason) => {
      console.log('[SocketService] 🔌 Socket disconnected:', reason);
    });

    this.socket.on(SOCKET_EVENTS.ERROR, (err) => {
      console.error('[SocketService] ⚠️ Socket error:', err);
    });

    return this.socket;
  }

  /**
   * Disconnect Socket instance
   */
  public disconnect(): void {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
      this.token = null;
      console.log('[SocketService] Socket disconnected and cleaned up');
    }
  }

  /**
   * Get active socket instance
   */
  public getSocket(): Socket | null {
    return this.socket;
  }

  /**
   * Check if socket is currently connected
   */
  public isConnected(): boolean {
    return !!this.socket && this.socket.connected;
  }

  /**
   * Join specific job room for live updates
   */
  public joinJobRoom(jobId: string): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit(SOCKET_EVENTS.JOIN_JOB_ROOM, { jobId });
    }
  }

  /**
   * Leave specific job room
   */
  public leaveJobRoom(jobId: string): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit(SOCKET_EVENTS.LEAVE_JOB_ROOM, { jobId });
    }
  }

  /**
   * Listen for incoming real-time notifications
   */
  public onNotification(callback: (data: any) => void): () => void {
    if (!this.socket) return () => {};
    this.socket.on(SOCKET_EVENTS.NOTIFICATION_NEW, callback);
    return () => this.socket?.off(SOCKET_EVENTS.NOTIFICATION_NEW, callback);
  }

  /**
   * Listen for application status updates
   */
  public onApplicationStatusUpdate(callback: (data: any) => void): () => void {
    if (!this.socket) return () => {};
    this.socket.on(SOCKET_EVENTS.APPLICATION_STATUS_UPDATED, callback);
    return () => this.socket?.off(SOCKET_EVENTS.APPLICATION_STATUS_UPDATED, callback);
  }

  /**
   * Listen for new application submissions (for farmers)
   */
  public onNewApplication(callback: (data: any) => void): () => void {
    if (!this.socket) return () => {};
    this.socket.on(SOCKET_EVENTS.APPLICATION_NEW, callback);
    return () => this.socket?.off(SOCKET_EVENTS.APPLICATION_NEW, callback);
  }

  /**
   * Listen for new job alerts (for workers)
   */
  public onJobCreated(callback: (data: any) => void): () => void {
    if (!this.socket) return () => {};
    this.socket.on(SOCKET_EVENTS.JOB_CREATED, callback);
    return () => this.socket?.off(SOCKET_EVENTS.JOB_CREATED, callback);
  }

  /**
   * Listen for user online presence events
   */
  public onPresenceChange(onOnline: (data: any) => void, onOffline: (data: any) => void): () => void {
    if (!this.socket) return () => {};
    this.socket.on(SOCKET_EVENTS.USER_ONLINE, onOnline);
    this.socket.on(SOCKET_EVENTS.USER_OFFLINE, onOffline);
    return () => {
      this.socket?.off(SOCKET_EVENTS.USER_ONLINE, onOnline);
      this.socket?.off(SOCKET_EVENTS.USER_OFFLINE, onOffline);
    };
  }
}

export const socketService = new SocketService();
