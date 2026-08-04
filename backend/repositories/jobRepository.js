import { Job } from '../models/Job.js';

/**
 * Job Repository Layer - Optimized Database Query Interface
 */
export const createJobRepo = async (jobData) => {
  return await Job.create(jobData);
};

export const findJobByIdRepo = async (id, populateFarmer = false, useLean = false) => {
  const query = Job.findById(id).select('-__v -isDeleted -deletedAt');
  if (populateFarmer) {
    query.populate('farmer', 'name email mobile role profileImage isVerified');
  }
  if (useLean) {
    query.lean();
  }
  return await query.exec();
};

export const findJobBySlugRepo = async (slug, populateFarmer = false) => {
  return await Job.findOne({ slug })
    .select('-__v -isDeleted -deletedAt')
    .populate(populateFarmer ? 'farmer' : '', 'name email mobile role profileImage isVerified')
    .lean()
    .exec();
};

export const updateJobRepo = async (id, updateData) => {
  return await Job.findByIdAndUpdate(id, { $set: updateData }, { new: true, runValidators: true })
    .select('-__v -isDeleted -deletedAt')
    .lean();
};

export const softDeleteJobRepo = async (id) => {
  const job = await Job.findById(id);
  if (!job) return null;
  return await job.softDelete();
};

export const findJobsRepo = async (filter = {}, skip = 0, limit = 10, sort = { createdAt: -1 }) => {
  return await Job.find(filter)
    .select('-__v -isDeleted -deletedAt')
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .populate('farmer', 'name email mobile role profileImage isVerified')
    .lean()
    .exec();
};

export const countJobsRepo = async (filter = {}) => {
  return await Job.countDocuments(filter);
};
