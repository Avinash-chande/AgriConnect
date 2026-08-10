import mongoose from 'mongoose';
import { isRedisReady } from '../config/redis.js';
import { logger } from '../utils/logger.js';

class MonitoringService {
  constructor() {
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      clientErrorRequests: 0,
      serverErrorRequests: 0,
      totalResponseTimeMs: 0,
      minResponseTimeMs: Infinity,
      maxResponseTimeMs: 0,
      paymentOrdersCreated: 0,
      paymentVerificationsSuccess: 0,
      paymentFailures: 0,
      socketConnections: 0,
      socketErrors: 0,
      backgroundJobsExecuted: 0,
      backgroundJobsFailed: 0,
      startTime: Date.now(),
    };

    this.responseTimesBuffer = [];
    this.maxBufferSize = 500;
  }

  /**
   * Record HTTP request completion metrics
   */
  recordMetrics({ route, statusCode, responseTimeMs }) {
    this.metrics.totalRequests++;
    this.metrics.totalResponseTimeMs += responseTimeMs;

    if (responseTimeMs < this.metrics.minResponseTimeMs) {
      this.metrics.minResponseTimeMs = responseTimeMs;
    }
    if (responseTimeMs > this.metrics.maxResponseTimeMs) {
      this.metrics.maxResponseTimeMs = responseTimeMs;
    }

    // Keep sliding buffer for p95 calculation
    this.responseTimesBuffer.push(responseTimeMs);
    if (this.responseTimesBuffer.length > this.maxBufferSize) {
      this.responseTimesBuffer.shift();
    }

    if (statusCode >= 500) {
      this.metrics.serverErrorRequests++;
      this.checkAlertThresholds();
    } else if (statusCode >= 400) {
      this.metrics.clientErrorRequests++;
    } else {
      this.successfulRequests++;
    }
  }

  /**
   * Record payment failures
   */
  recordPaymentFailure(reason, meta = {}) {
    this.metrics.paymentFailures++;
    logger.warn(`⚠️ [Monitoring Alert] Payment Failure Recorded: ${reason}`, {
      service: 'agriconnect-monitoring',
      metric: 'paymentFailures',
      count: this.metrics.paymentFailures,
      meta,
    });
  }

  /**
   * Record Socket.IO connection or failure
   */
  recordSocketEvent(event, success = true) {
    if (event === 'connect') {
      this.metrics.socketConnections++;
    } else if (!success) {
      this.metrics.socketErrors++;
    }
  }

  /**
   * Record background job execution
   */
  recordJobExecution(jobName, success = true) {
    if (success) {
      this.metrics.backgroundJobsExecuted++;
    } else {
      this.metrics.backgroundJobsFailed++;
      logger.error(`💥 [Monitoring Alert] Background Job Failed: ${jobName}`, {
        service: 'agriconnect-monitoring',
        jobName,
      });
    }
  }

  /**
   * Check error thresholds and log alerts if error rate > 5%
   */
  checkAlertThresholds() {
    if (this.metrics.totalRequests > 20) {
      const errorRate = (this.metrics.serverErrorRequests / this.metrics.totalRequests) * 100;
      if (errorRate > 5) {
        logger.error(`🚨 [CRITICAL ALERT] 5xx Server Error Rate Exceeded Threshold: ${errorRate.toFixed(2)}%`, {
          service: 'agriconnect-monitoring',
          errorRate: `${errorRate.toFixed(2)}%`,
          totalRequests: this.metrics.totalRequests,
          serverErrors: this.metrics.serverErrorRequests,
        });
      }
    }
  }

  /**
   * Calculate 95th Percentile Response Time
   */
  calculateP95ResponseTime() {
    if (this.responseTimesBuffer.length === 0) return 0;
    const sorted = [...this.responseTimesBuffer].sort((a, b) => a - b);
    const index = Math.floor(sorted.length * 0.95);
    return sorted[index] || sorted[sorted.length - 1];
  }

  /**
   * Get complete system operational metrics
   */
  getMetricsSnapshot() {
    const memory = process.memoryUsage();
    const uptimeSeconds = Math.floor((Date.now() - this.metrics.startTime) / 1000);
    const avgResponseTime = this.metrics.totalRequests > 0
      ? parseFloat((this.metrics.totalResponseTimeMs / this.metrics.totalRequests).toFixed(2))
      : 0;

    const availabilityPercent = this.metrics.totalRequests > 0
      ? (((this.metrics.totalRequests - this.metrics.serverErrorRequests) / this.metrics.totalRequests) * 100).toFixed(2)
      : '100.00';

    return {
      timestamp: new Date().toISOString(),
      uptimeSeconds,
      apiAvailability: {
        availabilityPercent: `${availabilityPercent}%`,
        totalRequests: this.metrics.totalRequests,
        successfulRequests: this.metrics.successfulRequests,
        clientErrorRequests: this.metrics.clientErrorRequests,
        serverErrorRequests: this.metrics.serverErrorRequests,
      },
      performance: {
        avgResponseTimeMs: avgResponseTime,
        minResponseTimeMs: this.metrics.minResponseTimeMs === Infinity ? 0 : this.metrics.minResponseTimeMs,
        maxResponseTimeMs: this.metrics.maxResponseTimeMs,
        p95ResponseTimeMs: this.calculateP95ResponseTime(),
      },
      memory: {
        rssMB: parseFloat((memory.rss / (1024 * 1024)).toFixed(2)),
        heapTotalMB: parseFloat((memory.heapTotal / (1024 * 1024)).toFixed(2)),
        heapUsedMB: parseFloat((memory.heapUsed / (1024 * 1024)).toFixed(2)),
        externalMB: parseFloat((memory.external / (1024 * 1024)).toFixed(2)),
      },
      database: {
        readyState: mongoose.connection.readyState,
        status: mongoose.connection.readyState === 1 ? 'CONNECTED' : 'DISCONNECTED',
      },
      redis: {
        status: isRedisReady() ? 'CONNECTED' : 'IN_MEMORY_FALLBACK',
      },
      businessMetrics: {
        paymentFailures: this.metrics.paymentFailures,
        socketConnections: this.metrics.socketConnections,
        socketErrors: this.metrics.socketErrors,
        backgroundJobsExecuted: this.metrics.backgroundJobsExecuted,
        backgroundJobsFailed: this.metrics.backgroundJobsFailed,
      },
    };
  }
}

export const monitoringService = new MonitoringService();
export const recordMetrics = (data) => monitoringService.recordMetrics(data);
