import mongoose from 'mongoose';
import { sendResponse } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * @desc    Get API health status & database connection status
 * @route   GET /api/v1/health
 * @access  Public
 */
export const checkHealth = asyncHandler(async (req, res) => {
  const dbState = mongoose.connection.readyState;
  const states = {
    0: 'Disconnected',
    1: 'Connected',
    2: 'Connecting',
    3: 'Disconnecting',
  };

  const healthData = {
    status: 'UP',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    database: {
      status: states[dbState] || 'Unknown',
      connected: dbState === 1,
    },
    environment: process.env.NODE_ENV || 'development',
  };

  return sendResponse(res, 200, 'AgriConnect Backend API is healthy', healthData);
});
