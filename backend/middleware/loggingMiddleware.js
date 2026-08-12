import crypto from 'crypto';
import { logger } from '../utils/logger.js';
import { recordMetrics } from '../services/monitoringService.js';

/**
 * Production Structured Request & Response Logging Middleware
 * Tracks timestamp, level, service, requestId, route, method, statusCode, responseTimeMs, and userId
 * Ensures all output passes through Winston logSanitizer for automatic secret redaction
 */
export const requestLoggingMiddleware = (req, res, next) => {
  const startTime = process.hrtime();

  // 1. Assign or propagate unique Request ID
  const requestId = req.headers['x-request-id'] || req.headers['x-correlation-id'] || crypto.randomUUID();
  req.requestId = requestId;
  res.setHeader('X-Request-ID', requestId);

  // 2. Capture response completion
  res.on('finish', () => {
    const diff = process.hrtime(startTime);
    const responseTimeMs = parseFloat((diff[0] * 1e3 + diff[1] * 1e-6).toFixed(2));
    const statusCode = res.statusCode;

    const route = req.originalUrl || req.url;
    const method = req.method;
    const userId = req.user ? (req.user._id || req.user.id).toString() : null;

    // Determine log level based on HTTP status code
    let level = 'info';
    if (statusCode >= 500) {
      level = 'error';
    } else if (statusCode >= 400) {
      level = 'warn';
    }

    const logPayload = {
      timestamp: new Date().toISOString(),
      level,
      service: 'agriconnect-backend',
      requestId,
      method,
      route,
      statusCode,
      responseTimeMs,
      userId,
      ip: req.ip || req.connection?.remoteAddress,
      userAgent: req.get('user-agent') || 'unknown',
    };

    // Output structured JSON log
    logger.log(level, `${method} ${route} ${statusCode} - ${responseTimeMs}ms`, logPayload);

    // Record metrics in Monitoring Subsystem
    recordMetrics({
      requestId,
      method,
      route,
      statusCode,
      responseTimeMs,
      userId,
    });
  });

  next();
};
