import cron from 'node-cron';
import { runAllExpirationChecksService } from '../services/expirationService.js';
import { logger } from '../utils/logger.js';

let isSweepRunning = false;

/**
 * Initializes server-side expiration cron job.
 * Runs hourly at minute 0 (0 * * * *).
 */
export const startExpirationCronJob = () => {
  if (process.env.NODE_ENV === 'test') {
    logger.info('[ExpirationCron] Skipping cron scheduler initialization in test mode.');
    return null;
  }

  // Schedule task to run hourly at minute 0
  const cronTask = cron.schedule('0 * * * *', async () => {
    if (isSweepRunning) {
      logger.warn('[ExpirationCron] Previous expiration sweep is still running. Skipping cycle.');
      return;
    }

    isSweepRunning = true;
    try {
      await runAllExpirationChecksService();
    } catch (err) {
      logger.error(`[ExpirationCron] Error during scheduled expiration sweep: ${err.message}`);
    } finally {
      isSweepRunning = false;
    }
  });

  logger.info('[ExpirationCron] Server-side subscription expiration scheduler started (runs hourly).');
  return cronTask;
};
