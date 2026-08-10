import * as dashRepo from '../repositories/adminDashboardRepository.js';

let cachedMetrics = null;
let cacheExpiryTime = 0;
const CACHE_TTL_MS = 30000; // 30 seconds TTL cache for dashboard KPI aggregations

/**
 * Admin Dashboard Service — Cached single-pass metrics & audit trail
 */
export const getDashboardData = async (query = {}) => {
  const now = Date.now();
  if (!cachedMetrics || now > cacheExpiryTime) {
    cachedMetrics = await dashRepo.getFullDashboardMetrics();
    cacheExpiryTime = now + CACHE_TTL_MS;
  }

  const auditStream = await dashRepo.getRecentAdminAuditLogs({
    page: query.page || 1,
    limit: query.limit || 10,
  });

  return {
    ...cachedMetrics,
    recentAuditLogs: auditStream.logs,
    auditPagination: auditStream.pagination,
    generatedAt: new Date().toISOString(),
  };
};
