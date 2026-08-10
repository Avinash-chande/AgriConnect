import { TrustProfile } from '../models/TrustProfile.js';
import { TrustScoreService } from './TrustScoreService.js';
import { AdminReview } from '../models/AdminReview.js';
import { VerificationHistory } from '../models/VerificationHistory.js';
import { User } from '../models/User.js';
import { AppError } from '../utils/appError.js';
import { logAuditEvent } from './auditLogger.js';
import {
  TRUST_VERIFICATION_STATUS,
  AUDIT_CATEGORY,
  AUDIT_SEVERITY,
} from '../constants/index.js';

export const getTrustVerifications = async ({
  page = 1,
  limit = 20,
  filterView = 'highest_score',
  status = '',
  trustLevel = '',
} = {}) => {
  const filter = {};
  let sortOption = { trustScore: -1 };

  if (status) filter.status = status;
  if (trustLevel) filter.trustLevel = trustLevel;

  if (filterView === 'recently_verified') {
    sortOption = { updatedAt: -1 };
  } else if (filterView === 'top_rated') {
    filter.trustLevel = 'TOP_RATED';
    sortOption = { averageRating: -1, trustScore: -1 };
  } else if (filterView === 'flagged') {
    filter.isFlagged = true;
  } else if (filterView === 'suspended') {
    filter.status = TRUST_VERIFICATION_STATUS.SUSPENDED;
  }

  const skip = (page - 1) * limit;

  const [records, total] = await Promise.all([
    TrustProfile.find(filter)
      .populate('user', 'name email role profileImage mobile isVerified identityVerified')
      .populate('badges')
      .sort(sortOption)
      .skip(skip)
      .limit(limit)
      .lean(),
    TrustProfile.countDocuments(filter),
  ]);

  return {
    records,
    pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / limit) },
  };
};

export const getTrustProfileByUser = async (userId) => {
  let profile = await TrustProfile.findOne({ user: userId }).populate('badges').lean();
  if (!profile) {
    profile = await TrustScoreService.updateTrustScore(userId, 'INITIAL_PROFILE_CREATION');
  }
  return profile;
};

/**
 * Review a trust profile (approve/reject/suspend)
 */
export const reviewTrustVerification = async (profileId, { status, reviewNotes = '' }, adminUser) => {
  const validStatuses = [
    TRUST_VERIFICATION_STATUS.VERIFIED,
    TRUST_VERIFICATION_STATUS.REJECTED,
    TRUST_VERIFICATION_STATUS.SUSPENDED,
  ];
  if (!validStatuses.includes(status)) {
    throw new AppError(`Invalid status. Must be one of: ${validStatuses.join(', ')}`, 400);
  }

  const profile = await TrustProfile.findById(profileId);
  if (!profile) throw new AppError('Trust profile not found', 404);

  const previousState = profile.toObject();
  profile.status = status;

  await profile.save();

  // Create AdminReview record
  await AdminReview.create({
    reviewer: adminUser._id,
    targetUser: profile.user,
    verificationType: 'SYSTEM_A_TRUST',
    targetEntity: { kind: 'TrustProfile', id: profile._id },
    decision: status === TRUST_VERIFICATION_STATUS.VERIFIED ? 'APPROVED' : status === TRUST_VERIFICATION_STATUS.SUSPENDED ? 'SUSPENDED' : 'REJECTED',
    reviewNotes,
  });

  // Record VerificationHistory
  await VerificationHistory.create({
    user: profile.user,
    verificationSystem: 'SYSTEM_A_TRUST',
    entityId: profile._id,
    previousState,
    newState: profile.toObject(),
    changedBy: adminUser._id,
    changeReason: `Admin trust profile review set to ${status}`,
  });

  await logAuditEvent({
    actor: adminUser._id,
    action: `TRUST_PROFILE_${status.toUpperCase()}`,
    status: 'SUCCESS',
    details: { profileId, userId: profile.user, reviewNotes },
    resource: { kind: 'TrustProfile', id: profileId },
    category: AUDIT_CATEGORY.ADMIN,
    severity: status === TRUST_VERIFICATION_STATUS.SUSPENDED ? AUDIT_SEVERITY.WARNING : AUDIT_SEVERITY.INFO,
  });

  return profile;
};

/**
 * Flag / Unflag Trust Profile
 */
export const flagTrustProfile = async (profileId, { isFlagged = true, reason = '' }, adminUser) => {
  const profile = await TrustProfile.findById(profileId);
  if (!profile) throw new AppError('Trust profile not found', 404);

  profile.isFlagged = isFlagged;
  profile.flaggedReason = reason;
  await profile.save();

  await logAuditEvent({
    actor: adminUser._id,
    action: isFlagged ? 'TRUST_PROFILE_FLAGGED' : 'TRUST_PROFILE_UNFLAGGED',
    status: 'SUCCESS',
    details: { profileId, userId: profile.user, reason },
    resource: { kind: 'TrustProfile', id: profileId },
    category: AUDIT_CATEGORY.ADMIN,
    severity: AUDIT_SEVERITY.WARNING,
  });

  return profile;
};

/**
 * Trigger Trust Score Update via Engine
 */
export const recalculateTrustScore = async (userId, adminUser = null, triggerReason = 'MANUAL_RECALCULATION') => {
  return TrustScoreService.updateTrustScore(userId, triggerReason, adminUser ? { kind: 'User', id: adminUser._id } : null);
};
