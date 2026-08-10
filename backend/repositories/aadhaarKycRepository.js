import { AadhaarKyc } from '../models/AadhaarKyc.js';

/**
 * Aadhaar KYC Repository (System B)
 * PRIVACY: Never returns raw XML data. Strict field selection enforced.
 */

const SAFE_FIELDS = 'user status referenceId signatureValid verifiedAt expiresAt reviewedBy rejectionReason createdAt updatedAt';

export const findByUser = async (userId) => {
  return AadhaarKyc.findOne({ user: userId })
    .select(SAFE_FIELDS)
    .populate('reviewedBy', 'name email')
    .lean();
};

export const findById = async (id) => {
  return AadhaarKyc.findById(id)
    .select(SAFE_FIELDS)
    .populate('user', 'name email role profileImage mobile')
    .populate('reviewedBy', 'name email')
    .lean();
};

export const getPaginated = async ({
  page = 1,
  limit = 20,
  status = '',
  sortBy = 'createdAt',
  sortOrder = 'desc',
} = {}) => {
  const filter = {};
  if (status) filter.status = status;

  const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };
  const skip = (page - 1) * limit;

  const [records, total] = await Promise.all([
    AadhaarKyc.find(filter)
      .select(SAFE_FIELDS)
      .populate('user', 'name email role profileImage')
      .populate('reviewedBy', 'name email')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    AadhaarKyc.countDocuments(filter),
  ]);

  return {
    records,
    pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / limit) },
  };
};

export const createOrUpdate = async (userId, data) => {
  return AadhaarKyc.findOneAndUpdate({ user: userId }, data, {
    new: true,
    upsert: true,
    runValidators: true,
  });
};

export const updateById = async (id, updateData) => {
  return AadhaarKyc.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
};
