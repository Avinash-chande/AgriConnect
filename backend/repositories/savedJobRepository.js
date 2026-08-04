import { SavedJob } from '../models/SavedJob.js';

export const findSavedJobRecordRepo = async (workerId, jobId) => {
  return await SavedJob.findOne({ worker: workerId, job: jobId });
};

export const createSavedJobRepo = async (workerId, jobId) => {
  return await SavedJob.create({ worker: workerId, job: jobId });
};

export const deleteSavedJobRepo = async (workerId, jobId) => {
  return await SavedJob.findOneAndDelete({ worker: workerId, job: jobId });
};

export const findSavedJobsRepo = async (workerId, skip = 0, limit = 10, searchRegex = null) => {
  const pipeline = [
    { $match: { worker: workerId } },
    {
      $lookup: {
        from: 'jobs',
        localField: 'job',
        foreignField: '_id',
        as: 'job',
      },
    },
    { $unwind: '$job' },
    { $match: { 'job.isDeleted': { $ne: true } } },
  ];

  if (searchRegex) {
    pipeline.push({
      $match: {
        $or: [
          { 'job.title': searchRegex },
          { 'job.category': searchRegex },
          { 'job.cropType': searchRegex },
          { 'job.jobAddress.district': searchRegex },
        ],
      },
    });
  }

  pipeline.push(
    {
      $lookup: {
        from: 'users',
        localField: 'job.farmer',
        foreignField: '_id',
        as: 'job.farmer',
      },
    },
    { $unwind: { path: '$job.farmer', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: '$job._id',
        savedJobId: '$_id',
        savedAt: '$createdAt',
        title: '$job.title',
        slug: '$job.slug',
        category: '$job.category',
        cropType: '$job.cropType',
        workType: '$job.workType',
        numberOfWorkers: '$job.numberOfWorkers',
        wageType: '$job.wageType',
        dailyWage: '$job.dailyWage',
        monthlySalary: '$job.monthlySalary',
        status: '$job.status',
        isUrgent: '$job.isUrgent',
        isFeatured: '$job.isFeatured',
        jobAddress: '$job.jobAddress',
        farmer: {
          _id: '$job.farmer._id',
          name: '$job.farmer.name',
          email: '$job.farmer.email',
          mobile: '$job.farmer.mobile',
          role: '$job.farmer.role',
        },
      },
    },
    { $sort: { savedAt: -1 } },
    { $skip: skip },
    { $limit: limit }
  );

  return await SavedJob.aggregate(pipeline);
};

export const countSavedJobsRepo = async (workerId, searchRegex = null) => {
  const pipeline = [
    { $match: { worker: workerId } },
    {
      $lookup: {
        from: 'jobs',
        localField: 'job',
        foreignField: '_id',
        as: 'job',
      },
    },
    { $unwind: '$job' },
    { $match: { 'job.isDeleted': { $ne: true } } },
  ];

  if (searchRegex) {
    pipeline.push({
      $match: {
        $or: [
          { 'job.title': searchRegex },
          { 'job.category': searchRegex },
          { 'job.cropType': searchRegex },
          { 'job.jobAddress.district': searchRegex },
        ],
      },
    });
  }

  pipeline.push({ $count: 'total' });

  const result = await SavedJob.aggregate(pipeline);
  return result.length > 0 ? result[0].total : 0;
};
