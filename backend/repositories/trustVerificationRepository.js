import { TrustVerification } from '../models/TrustVerification.js';

/**
 * Trust Verification Repository (System A)
 */

export const findByUser = async (userId) => {
  return TrustVerification.findOne({ user: userId }).populate('reviewedBy', 'name email').lean();
};

export const findOrCreate = async (userId) => {
  let record = await TrustVerification.findOne({ user: userId });
  if (!record) {
    record = await TrustVerification.create({ user: userId });
  }
  return record;
};

export const findById = async (id) => {
  return TrustVerification.findById(id).populate('user', 'name email role profileImage').populate('reviewedBy', 'name email').lean();
};

export const getPaginated = async ({
  page = 1,
  limit = 20,
  status = '',
  sortBy = 'trustScore',
  sortOrder = 'desc',
} = {}) => {
  const filter = {};
  if (status) filter.status = status;

  const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };
  const skip = (page - 1) * limit;

  const [records, total] = await Promise.all([
    TrustVerification.find(filter)
      .populate('user', 'name email role profileImage mobile isVerified')
      .populate('reviewedBy', 'name email')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    TrustVerification.countDocuments(filter),
  ]);

  return {
    records,
    pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / limit) },
  };
};

export const updateById = async (id, updateData) => {
  return TrustVerification.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
};

export const updateByUser = async (userId, updateData) => {
  return TrustVerification.findOneAndUpdate({ user: userId }, updateData, {
    new: true,
    runValidators: true,
    upsert: true,
  });
};
