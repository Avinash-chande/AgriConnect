import { Server } from 'socket.io';
import { socketAuthMiddleware } from './socketMiddleware.js';
import { registerSocketHandlers } from './socketHandler.js';
import { initSocketService } from './socketService.js';
import { logger } from '../utils/logger.js';

let io = null;

/**
 * Initialize Socket.IO Server attached to HTTP Server
 */
export const initSocketServer = (httpServer) => {
  const allowedOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173';

  io = new Server(httpServer, {
    cors: {
      origin: allowedOrigin,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    },
    pingTimeout: 20000,
    pingInterval: 25000,
    transports: ['websocket', 'polling'],
  });

  // Apply JWT Authentication Middleware
  io.use(socketAuthMiddleware);

  // Connection Handler
  io.on('connection', (socket) => {
    logger.info(`⚡ New Socket.IO Client Connected: ${socket.id}`);
    registerSocketHandlers(io, socket);
  });

  // Initialize Socket Service with IO instance for external REST service triggers
  initSocketService(io);

  logger.info('🚀 Socket.IO Server initialized successfully');
  return io;
};

export const getSocketIO = () => io;
