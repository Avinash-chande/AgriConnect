import { User } from '../models/User.js';
import { Job } from '../models/Job.js';
import { redisCacheService } from './redisCacheService.js';

/**
 * Admin Analytics Aggregation Service with Redis Caching
 */

export const getUserGrowthTrends = async (days = 30) => {
  return redisCacheService.getOrSet(`admin:analytics:user_growth:${days}`, async () => {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    return User.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            role: '$role',
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.date': 1 } },
    ]);
  }, 300);
};

export const getJobPostingTrends = async (days = 30) => {
  return redisCacheService.getOrSet(`admin:analytics:job_trends:${days}`, async () => {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    return Job.aggregate([
      { $match: { createdAt: { $gte: startDate }, isDeleted: { $ne: true } } },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            category: '$category',
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.date': 1 } },
    ]);
  }, 300);
};

export const getCategoryBreakdown = async () => {
  return redisCacheService.getOrSet('admin:analytics:category_breakdown', async () => {
    return Job.aggregate([
      { $match: { isDeleted: { $ne: true } } },
      {
        $group: {
          _id: '$category',
          totalJobs: { $sum: 1 },
          totalApplications: { $sum: '$totalApplications' },
          hiredWorkers: { $sum: '$hiredWorkersCount' },
        },
      },
      { $sort: { totalJobs: -1 } },
    ]);
  }, 300);
};

export const getGeographicDistribution = async () => {
  return redisCacheService.getOrSet('admin:analytics:geo_distribution', async () => {
    return Job.aggregate([
      { $match: { isDeleted: { $ne: true } } },
      {
        $group: {
          _id: {
            state: '$jobAddress.state',
            district: '$jobAddress.district',
          },
          jobCount: { $sum: 1 },
        },
      },
      { $sort: { jobCount: -1 } },
      { $limit: 20 },
    ]);
  }, 300);
};
