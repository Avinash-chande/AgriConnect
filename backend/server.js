import './config/dns.js'
import 'dotenv/config';
import http from 'http';
import mongoose from 'mongoose';
import app from './app.js';
import { validateEnvironment } from './config/envValidation.js';
import { connectDB } from './config/db.js';
import { configureCloudinary } from './config/cloudinary.js';
import { getValidatedPaymentConfig } from './config/paymentConfig.js';
import { initSocketServer } from './socket/index.js';
import { startExpirationCronJob } from './jobs/expirationCron.js';
import { redisClient } from './config/redis.js';
import { logger } from './utils/logger.js';

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error(`💥 UNCAUGHT EXCEPTION: ${err.message}`);
  process.exit(1);
});

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  // 1. Validate System Environment Configuration
  validateEnvironment();

  // 2. Validate Payment Environment Configuration
  getValidatedPaymentConfig();

  // 3. Connect to Database
  await connectDB();

  // 4. Configure Cloudinary SDK
  configureCloudinary();

  // 5. Create HTTP Server & Initialize Sockets
  const httpServer = http.createServer(app);
  initSocketServer(httpServer);

  // 6. Initialize Server-Side Expiration Scheduler
  startExpirationCronJob();

  const server = httpServer.listen(PORT, () => {
    logger.info(
      `🚀 AgriConnect Backend API & Socket Server running in [${
        process.env.NODE_ENV || 'development'
      }] mode on port ${PORT}`
    );

    logger.info(`📡 Health Check Endpoints: http://localhost:${PORT}/health | /liveness | /readiness`);
  });

  // Graceful Shutdown Handler
  const shutdownGracefully = async (signal) => {
    logger.info(`👋 ${signal} RECEIVED. Initiating graceful shutdown sequence...`);

    // 1. Stop receiving new HTTP requests
    server.close(async () => {
      logger.info('🛑 HTTP server closed. No longer accepting new connections.');

      try {
        // 2. Close MongoDB database connections
        if (mongoose.connection.readyState !== 0) {
          await mongoose.connection.close();
          logger.info('📦 MongoDB connection closed gracefully.');
        }

        // 3. Close Redis connection if active
        if (redisClient && redisClient.status === 'ready') {
          await redisClient.quit();
          logger.info('⚡ Redis connection closed gracefully.');
        }

        logger.info('✨ Graceful shutdown completed cleanly. Exiting process.');
        process.exit(0);
      } catch (err) {
        logger.error(`⚠️ Error during shutdown sequence: ${err.message}`);
        process.exit(1);
      }
    });

    // Forced shutdown timeout after 10 seconds
    setTimeout(() => {
      logger.error('⏰ Forced shutdown timeout reached. Terminating process immediately.');
      process.exit(1);
    }, 10000);
  };

  process.on('unhandledRejection', (err) => {
    logger.error(`💥 UNHANDLED REJECTION: ${err.message}`);
    shutdownGracefully('UNHANDLED_REJECTION');
  });

  process.on('SIGTERM', () => shutdownGracefully('SIGTERM'));
  process.on('SIGINT', () => shutdownGracefully('SIGINT'));
};

startServer();
