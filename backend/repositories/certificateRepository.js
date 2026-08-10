import { CertificateVerification } from '../models/CertificateVerification.js';

/**
 * Certificate Verification Repository
 */

export const create = async (data) => {
  return CertificateVerification.create(data);
};

export const findById = async (id) => {
  return CertificateVerification.findById(id)
    .populate('user', 'name email role profileImage')
    .populate('reviewedBy', 'name email')
    .lean();
};

export const getPaginated = async ({
  page = 1,
  limit = 20,
  status = '',
  certificateType = '',
  userId = '',
  sortBy = 'createdAt',
  sortOrder = 'desc',
} = {}) => {
  const filter = {};
  if (status) filter.status = status;
  if (certificateType) filter.certificateType = certificateType;
  if (userId) filter.user = userId;

  const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };
  const skip = (page - 1) * limit;

  const [certificates, total] = await Promise.all([
    CertificateVerification.find(filter)
      .populate('user', 'name email role profileImage')
      .populate('reviewedBy', 'name email')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    CertificateVerification.countDocuments(filter),
  ]);

  return {
    certificates,
    pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / limit) },
  };
};

export const updateById = async (id, updateData) => {
  return CertificateVerification.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true,
  });
};

export const countByUserAndStatus = async (userId, status) => {
  return CertificateVerification.countDocuments({ user: userId, status });
};
