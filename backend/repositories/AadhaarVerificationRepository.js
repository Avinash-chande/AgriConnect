import { IdentityVerification } from '../models/IdentityVerification.js';

export class AadhaarVerificationRepository {
  static async findByUserId(userId) {
    return IdentityVerification.findOne({ user: userId }).populate('user', 'name email mobile');
  }

  static async findById(id) {
    return IdentityVerification.findById(id).populate('user', 'name email mobile');
  }

  static async upsertVerification(userId, updateData) {
    return IdentityVerification.findOneAndUpdate(
      { user: userId },
      { ...updateData, user: userId },
      { upsert: true, new: true, runValidators: true }
    );
  }

  static async updateStatus(id, status, reviewNotes = '', reviewedBy = null) {
    const update = { status, reviewNotes };
    if (reviewedBy) update.reviewedBy = reviewedBy;
    if (status === 'VERIFIED') update.verifiedAt = new Date();

    return IdentityVerification.findByIdAndUpdate(id, update, { new: true });
  }

  static async findPaginated({ page = 1, limit = 20, status = '' } = {}) {
    const filter = {};
    if (status) filter.status = status;

    const skip = (page - 1) * limit;

    const [records, total] = await Promise.all([
      IdentityVerification.find(filter)
        .populate('user', 'name email mobile role profileImage')
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      IdentityVerification.countDocuments(filter),
    ]);

    return {
      records,
      pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / limit) },
    };
  }
}

export default AadhaarVerificationRepository;
