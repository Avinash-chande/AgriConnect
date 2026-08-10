import { Report } from '../models/Report.js';

/**
 * Report Repository — CRUD + assignment + resolution
 */

export const create = async (data) => {
  return Report.create(data);
};

export const findById = async (id, includeInternalNotes = false) => {
  const query = Report.findOne({ _id: id, isDeleted: { $ne: true } })
    .populate('reporter', 'name email role profileImage')
    .populate('reportedUser', 'name email role profileImage')
    .populate('reportedJob', 'title category status')
    .populate('reportedCertificate', 'title certificateType status')
    .populate('assignedTo', 'name email')
    .populate('resolvedBy', 'name email');

  if (includeInternalNotes) {
    query.select('+internalNotes');
  }

  return query.lean();
};

export const getPaginated = async ({
  page = 1,
  limit = 20,
  status = '',
  category = '',
  priority = '',
  assignedTo = '',
  sortBy = 'createdAt',
  sortOrder = 'desc',
  includeInternalNotes = true,
} = {}) => {
  const filter = { isDeleted: { $ne: true } };

  if (status) filter.status = status;
  if (category) filter.category = category;
  if (priority) filter.priority = priority;
  if (assignedTo) filter.assignedTo = assignedTo;

  const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };
  const skip = (page - 1) * limit;

  const query = Report.find(filter)
    .populate('reporter', 'name email role profileImage')
    .populate('reportedUser', 'name email role profileImage')
    .populate('reportedJob', 'title category status')
    .populate('reportedCertificate', 'title certificateType status')
    .populate('assignedTo', 'name email')
    .sort(sort)
    .skip(skip)
    .limit(limit);

  if (includeInternalNotes) {
    query.select('+internalNotes');
  }

  const [reports, total] = await Promise.all([query.lean(), Report.countDocuments(filter)]);

  return {
    reports,
    pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / limit) },
  };
};

export const getByReporter = async (userId, { page = 1, limit = 20 } = {}) => {
  const filter = { reporter: userId, isDeleted: { $ne: true } };
  const skip = (page - 1) * limit;

  // STRICT COMPLIANCE: Regular users do NOT see internalNotes
  const [reports, total] = await Promise.all([
    Report.find(filter)
      .populate('reportedUser', 'name email')
      .populate('reportedJob', 'title')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Report.countDocuments(filter),
  ]);

  return {
    reports,
    pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / limit) },
  };
};

export const updateById = async (id, updateData) => {
  return Report.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
};
