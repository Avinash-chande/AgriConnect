import mongoose from 'mongoose';
import { sendResponse } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { isRedisReady } from '../config/redis.js';
import { monitoringService } from '../services/monitoringService.js';

/**
 * @desc    GET /health (or /api/v1/health) - Aggregated Health & Observability Status
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

  const metricsSnapshot = monitoringService.getMetricsSnapshot();

  const healthData = {
    status: dbState === 1 ? 'UP' : 'DEGRADED',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    database: {
      status: states[dbState] || 'Unknown',
      connected: dbState === 1,
    },
    redis: {
      connected: isRedisReady(),
    },
    memory: metricsSnapshot.memory,
    apiAvailability: metricsSnapshot.apiAvailability,
    performance: metricsSnapshot.performance,
    environment: process.env.NODE_ENV || 'development',
  };

  const statusCode = dbState === 1 ? 200 : 503;
  return sendResponse(res, statusCode, `AgriConnect Backend API is ${healthData.status}`, healthData);
});

/**
 * @desc    GET /liveness - Process Liveness Check (Is process alive?)
 * @access  Public
 */
export const checkLiveness = asyncHandler(async (req, res) => {
  const memory = process.memoryUsage();
  return sendResponse(res, 200, 'AgriConnect Backend process is alive', {
    status: 'UP',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    pid: process.pid,
    memory: {
      heapUsedMB: parseFloat((memory.heapUsed / (1024 * 1024)).toFixed(2)),
      rssMB: parseFloat((memory.rss / (1024 * 1024)).toFixed(2)),
    },
  });
});

/**
 * @desc    GET /readiness - Readiness Check (Is DB connected and ready for traffic?)
 * @access  Public
 */
export const checkReadiness = asyncHandler(async (req, res) => {
  const dbConnected = mongoose.connection.readyState === 1;

  if (dbConnected) {
    return sendResponse(res, 200, 'AgriConnect Backend is ready to accept traffic', {
      status: 'READY',
      database: 'CONNECTED',
      redis: isRedisReady() ? 'CONNECTED' : 'FALLBACK_MEM_STORE',
    });
  } else {
    return sendResponse(res, 503, 'AgriConnect Backend is not ready (Database Disconnected)', {
      status: 'NOT_READY',
      database: 'DISCONNECTED',
    });
  }
});

/**
 * @desc    GET /api/v1/admin/metrics - Detailed Operational Metrics Snapshot (Admin / Monitoring Tooling)
 * @access  Private (Admin)
 */
export const getSystemMetrics = asyncHandler(async (req, res) => {
  const metrics = monitoringService.getMetricsSnapshot();
  return sendResponse(res, 200, 'Operational system metrics retrieved', metrics);
});
