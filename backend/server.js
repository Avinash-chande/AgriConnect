import 'dotenv/config';
import http from 'http';
import app from './app.js';
import { connectDB } from './config/db.js';
import { configureCloudinary } from './config/cloudinary.js';
import { initSocketServer } from './socket/index.js';
import { startExpirationCronJob } from './jobs/expirationCron.js';
import { logger } from './utils/logger.js';

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error(`💥 UNCAUGHT EXCEPTION: ${err.message}`);
  process.exit(1);
});

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  // Connect to Database
  await connectDB();

  // Configure Cloudinary SDK
  configureCloudinary();

  // Create HTTP Server
  const httpServer = http.createServer(app);

  // Initialize Socket.IO Server
  initSocketServer(httpServer);

  // Initialize Server-Side Expiration Scheduler
  startExpirationCronJob();

  const server = httpServer.listen(PORT, () => {
    logger.info(
      `🚀 AgriConnect Backend API & Socket Server running in [${
        process.env.NODE_ENV || 'development'
      }] mode on port ${PORT}`
    );

    console.log(`📡 Health Check URL: http://localhost:${PORT}/api/v1/health`);
  });

  process.on('unhandledRejection', (err) => {
    logger.error(`💥 UNHANDLED REJECTION: ${err.message}`);

    server.close(() => {
      process.exit(1);
    });
  });

  process.on('SIGTERM', () => {
    logger.info('👋 SIGTERM RECEIVED. Shutting down server gracefully...');

    server.close(() => {
      logger.info('💥 Process terminated!');
    });
  });
};

startServer();

