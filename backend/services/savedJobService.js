import { findJobByIdRepo } from '../repositories/jobRepository.js';
import {
  findSavedJobRecordRepo,
  createSavedJobRepo,
  deleteSavedJobRepo,
  findSavedJobsRepo,
  countSavedJobsRepo,
} from '../repositories/savedJobRepository.js';
import { Job } from '../models/Job.js';
import { AppError } from '../utils/appError.js';
import { USER_ROLES } from '../constants/index.js';
import { cacheService } from './cacheService.js';

/**
 * Service: Toggle Save / Bookmark Job Vacancy (Worker Only)
 */
export const toggleSaveJobService = async (user, jobId) => {
  // 1. Enforce Role Authorization
  if (!user || user.role !== USER_ROLES.WORKER) {
    throw new AppError('Only registered Workers can save job vacancies.', 403);
  }

  // 2. Validate Job Exists & Active
  const job = await findJobByIdRepo(jobId);
  if (!job || job.isDeleted) {
    throw new AppError('Job vacancy posting not found.', 404);
  }

  const workerId = user._id || user.id;

  // 3. Check existing saved record
  const existingRecord = await findSavedJobRecordRepo(workerId, jobId);

  let isSaved = false;
  let updatedJob = null;

  if (existingRecord) {
    // Unsave Job
    await deleteSavedJobRepo(workerId, jobId);
    updatedJob = await Job.findByIdAndUpdate(
      jobId,
      { $inc: { savedCount: -1 } },
      { new: true }
    );
    isSaved = false;
  } else {
    // Save Job (Prevent duplicate via unique index)
    try {
      await createSavedJobRepo(workerId, jobId);
      updatedJob = await Job.findByIdAndUpdate(
        jobId,
        { $inc: { savedCount: 1 } },
        { new: true }
      );
      isSaved = true;
    } catch (err) {
      if (err.code === 11000) {
        // Handle race condition duplicate
        isSaved = true;
        updatedJob = job;
      } else {
        throw err;
      }
    }
  }

  // Clear cache
  cacheService.clearPrefix('job:');

  const savedCount = updatedJob?.savedCount || 0;

  return {
    isSaved,
    savedCount: Math.max(0, savedCount),
    message: isSaved ? 'Job saved to your bookmarks.' : 'Job removed from your bookmarks.',
  };
};

/**
 * Service: Get Saved Jobs for Worker with Pagination & Search
 */
export const getSavedJobsService = async (user, queryParams = {}) => {
  // 1. Enforce Role Authorization
  if (!user || user.role !== USER_ROLES.WORKER) {
    throw new AppError('Only registered Workers can view saved jobs.', 403);
  }

  const workerId = user._id || user.id;
  const { page = 1, limit = 10, q, search } = queryParams;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
  const skip = (pageNum - 1) * limitNum;

  const searchQuery = q || search;
  const searchRegex = searchQuery && searchQuery.trim() !== '' ? new RegExp(searchQuery.trim(), 'i') : null;

  // 2. Fetch Saved Jobs
  const [jobs, totalJobs] = await Promise.all([
    findSavedJobsRepo(workerId, skip, limitNum, searchRegex),
    countSavedJobsRepo(workerId, searchRegex),
  ]);

  // 3. Pagination Metadata
  const totalPages = Math.ceil(totalJobs / limitNum);
  const pagination = {
    totalJobs,
    page: pageNum,
    limit: limitNum,
    totalPages,
    hasNextPage: pageNum < totalPages,
    hasPrevPage: pageNum > 1,
  };

  return { jobs, pagination };
};
