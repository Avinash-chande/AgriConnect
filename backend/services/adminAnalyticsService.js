import { User } from '../models/User.js';
import { Job } from '../models/Job.js';
import { Application } from '../models/Application.js';
import { Payment } from '../models/Payment.js';
import { PAYMENT_STATUS } from '../constants/index.js';

/**
 * Admin Analytics Aggregation Service
 */

export const getUserGrowthTrends = async (days = 30) => {
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
};

export const getJobPostingTrends = async (days = 30) => {
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
};

export const getCategoryBreakdown = async () => {
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
};

export const getGeographicDistribution = async () => {
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
};
