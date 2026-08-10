import { TrustProfile } from '../models/TrustProfile.js';
import { TrustScoreHistory } from '../models/TrustScoreHistory.js';
import { VerificationBadge } from '../models/VerificationBadge.js';
import { User } from '../models/User.js';
import { WorkerProfile } from '../models/WorkerProfile.js';
import { Application } from '../models/Application.js';
import { CertificateVerification } from '../models/CertificateVerification.js';
import { PlatformSetting } from '../models/PlatformSetting.js';
import { NOTIFICATION_TYPE } from '../models/Notification.js';
import { createNotificationService } from './notificationService.js';
import { AppError } from '../utils/appError.js';
import { logger } from '../utils/logger.js';
import {
  TRUST_LEVELS,
  VERIFICATION_BADGES,
  CERTIFICATE_STATUS,
  APPLICATION_STATUS,
} from '../constants/index.js';

/**
 * Default Configurable Signal Weights (Total = 100)
 * Can be overridden via PlatformSetting key 'trust_score_weights'
 */
const DEFAULT_SIGNAL_WEIGHTS = Object.freeze({
  mobile: 15,
  email: 10,
  profile: 15,
  certificates: 20,
  completedJobs: 20,
  ratings: 20,
});

/**
 * Default Configurable Trust Level Thresholds
 * Can be overridden via PlatformSetting key 'trust_level_thresholds'
 */
const DEFAULT_LEVEL_THRESHOLDS = Object.freeze({
  TOP_RATED: 85,
  TRUSTED: 70,
  SKILLED: 50,
  VERIFIED: 30,
  BASIC: 0,
});

/**
 * TrustScoreService — Engine for AgriConnect System A Trust Verification
 *
 * PRIVACY & ARCHITECTURE COMPLIANCE:
 * - Decoupled from Aadhaar e-KYC (System B).
 * - Never uses Aadhaar data to compute Trust Score.
 * - Never issues IDENTITY_VERIFIED badge from Trust Score logic.
 * - Fully configurable weights and thresholds via Platform Settings.
 */
export class TrustScoreService {
  /**
   * Load signal weights from PlatformSetting or fallback to defaults
   */
  static async loadWeights() {
    try {
      const setting = await PlatformSetting.findOne({ key: 'trust_score_weights' }).lean();
      if (setting && setting.value) {
        return { ...DEFAULT_SIGNAL_WEIGHTS, ...setting.value };
      }
    } catch (err) {
      logger.warn(`[TrustScoreService] Failed to load custom weights: ${err.message}`);
    }
    return DEFAULT_SIGNAL_WEIGHTS;
  }

  /**
   * Load level thresholds from PlatformSetting or fallback to defaults
   */
  static async loadThresholds() {
    try {
      const setting = await PlatformSetting.findOne({ key: 'trust_level_thresholds' }).lean();
      if (setting && setting.value) {
        return { ...DEFAULT_LEVEL_THRESHOLDS, ...setting.value };
      }
    } catch (err) {
      logger.warn(`[TrustScoreService] Failed to load custom thresholds: ${err.message}`);
    }
    return DEFAULT_LEVEL_THRESHOLDS;
  }

  /**
   * Calculate Trust Score (0 - 100) based on configurable signal weights
   *
   * @param {Object} signals
   * @param {boolean} signals.mobileVerified
   * @param {boolean} signals.emailVerified
   * @param {boolean} signals.profileCompleted
   * @param {number} signals.certificatesCount - Approved certificate count
   * @param {number} signals.completedJobsCount - Completed job count
   * @param {number} signals.averageRating - Rating out of 5
   * @param {boolean} signals.verifiedExperience
   * @param {Object} [customWeights] - Weight overrides
   * @returns {{ trustScore: number, breakdown: Object }}
   */
  static calculateTrustScore(signals, customWeights = {}) {
    const weights = { ...DEFAULT_SIGNAL_WEIGHTS, ...customWeights };

    const breakdown = {
      mobileScore: 0,
      emailScore: 0,
      profileScore: 0,
      certificatesScore: 0,
      completedJobsScore: 0,
      ratingsScore: 0,
    };

    // 1. Mobile Verification
    if (signals.mobileVerified) {
      breakdown.mobileScore = weights.mobile;
    }

    // 2. Email Verification
    if (signals.emailVerified) {
      breakdown.emailScore = weights.email;
    }

    // 3. Profile Completion
    if (signals.profileCompleted) {
      breakdown.profileScore = weights.profile;
    }

    // 4. Certificate Verification (max weights.certificates, 5 points per cert)
    const certCount = signals.certificatesCount || 0;
    breakdown.certificatesScore = Math.min(certCount * 5, weights.certificates);

    // 5. Completed Jobs (max weights.completedJobs, 2 points per completed job)
    const jobCount = signals.completedJobsCount || 0;
    breakdown.completedJobsScore = Math.min(jobCount * 2, weights.completedJobs);

    // 6. Ratings (max weights.ratings, proportional: (rating / 5) * weights.ratings)
    const rating = Math.min(Math.max(signals.averageRating || 0, 0), 5);
    breakdown.ratingsScore = Math.round((rating / 5) * weights.ratings);

    const totalRaw =
      breakdown.mobileScore +
      breakdown.emailScore +
      breakdown.profileScore +
      breakdown.certificatesScore +
      breakdown.completedJobsScore +
      breakdown.ratingsScore;

    const trustScore = Math.min(Math.max(Math.round(totalRaw), 0), 100);

    return { trustScore, breakdown };
  }

  /**
   * Determine Trust Level based on score and signals
   *
   * @param {number} score
   * @param {Object} signals
   * @param {Object} [customThresholds]
   * @returns {string} One of TRUST_LEVELS (BASIC, VERIFIED, SKILLED, TRUSTED, TOP_RATED)
   */
  static getTrustLevel(score, signals = {}, customThresholds = {}) {
    const thresholds = { ...DEFAULT_LEVEL_THRESHOLDS, ...customThresholds };

    if (score >= thresholds.TOP_RATED && (signals.averageRating || 0) >= 4.5) {
      return TRUST_LEVELS.TOP_RATED;
    }

    if (score >= thresholds.TRUSTED) {
      return TRUST_LEVELS.TRUSTED;
    }

    if (score >= thresholds.SKILLED || signals.certificatesCount > 0) {
      return TRUST_LEVELS.SKILLED;
    }

    if (score >= thresholds.VERIFIED || (signals.mobileVerified && signals.emailVerified)) {
      return TRUST_LEVELS.VERIFIED;
    }

    return TRUST_LEVELS.BASIC;
  }

  /**
   * Dynamically assign System A verification badges matching user signals
   *
   * @param {ObjectId|string} userId
   * @param {Object} signals
   * @param {number} score
   * @param {string} level
   * @returns {Promise<Array<ObjectId>>} Active badge IDs
   */
  static async assignBadges(userId, signals, score, level) {
    const badgesToEnsure = [];

    if (signals.mobileVerified) badgesToEnsure.push(VERIFICATION_BADGES.MOBILE_VERIFIED);
    if (signals.emailVerified) badgesToEnsure.push(VERIFICATION_BADGES.EMAIL_VERIFIED);
    if (signals.profileCompleted) badgesToEnsure.push(VERIFICATION_BADGES.PROFILE_COMPLETE);
    if (signals.certificatesCount > 0) badgesToEnsure.push(VERIFICATION_BADGES.SKILL_VERIFIED);
    if (signals.completedJobsCount >= 5) badgesToEnsure.push(VERIFICATION_BADGES.EXPERIENCED_WORKER);
    if (score >= 70) badgesToEnsure.push(VERIFICATION_BADGES.TRUSTED_WORKER);
    if ((signals.averageRating || 0) >= 4.5 && signals.completedJobsCount >= 3) {
      badgesToEnsure.push(VERIFICATION_BADGES.TOP_RATED_WORKER);
    }

    const badgeIds = [];

    for (const bType of badgesToEnsure) {
      // SAFETY CHECK: Never allow IDENTITY_VERIFIED badge to be generated here
      if (bType === VERIFICATION_BADGES.IDENTITY_VERIFIED) {
        continue;
      }

      const badge = await VerificationBadge.findOneAndUpdate(
        { user: userId, type: bType },
        {
          user: userId,
          type: bType,
          title: bType.replace(/_/g, ' '),
          description: `Verified badge for ${bType.toLowerCase().replace(/_/g, ' ')}`,
          status: 'active',
          issuedAt: new Date(),
          metadata: { source: 'SYSTEM_A_TRUST_ENGINE', score, level },
        },
        { upsert: true, new: true }
      );
      badgeIds.push(badge._id);
    }

    // Clean up any revoked/invalid badges
    await this.removeInvalidBadges(userId, badgesToEnsure);

    return badgeIds;
  }

  /**
   * Revoke any active System A badges that no longer meet signal requirements
   *
   * @param {ObjectId|string} userId
   * @param {Array<string>} validBadgeTypes
   * @returns {Promise<number>} Number of revoked badges
   */
  static async removeInvalidBadges(userId, validBadgeTypes) {
    // Exclude IDENTITY_VERIFIED which belongs exclusively to System B (Aadhaar e-KYC)
    const filter = {
      user: userId,
      status: 'active',
      type: { $ne: VERIFICATION_BADGES.IDENTITY_VERIFIED, $nin: validBadgeTypes },
    };

    const result = await VerificationBadge.updateMany(filter, {
      status: 'revoked',
    });

    return result.modifiedCount || 0;
  }

  /**
   * Core Engine Update — Recalculates Trust Score, Level, and Badges for a user
   *
   * @param {ObjectId|string} userId
   * @param {string} [triggerReason='ENGINE_RECALCULATION']
   * @param {Object} [triggerEntity=null]
   * @returns {Promise<TrustProfile>} Updated TrustProfile
   */
  static async updateTrustScore(userId, triggerReason = 'ENGINE_RECALCULATION', triggerEntity = null) {
    const user = await User.findById(userId);
    if (!user) throw new AppError('User not found', 404);

    // 1. Gather live platform signals
    const workerProfile = await WorkerProfile.findOne({ owner: userId }).lean();
    const approvedCertsCount = await CertificateVerification.countDocuments({
      user: userId,
      status: CERTIFICATE_STATUS.APPROVED,
    });
    const completedJobsCount = await Application.countDocuments({
      worker: userId,
      status: APPLICATION_STATUS.HIRED,
      isDeleted: { $ne: true },
    });

    const signals = {
      mobileVerified: !!user.mobile,
      emailVerified: user.isVerified || false,
      profileCompleted: user.profileCompleted || false,
      certificatesCount: approvedCertsCount,
      completedJobsCount,
      averageRating: workerProfile?.rating || 0,
      verifiedExperience: (workerProfile?.experience || 0) > 0 && completedJobsCount > 0,
    };

    // 2. Load configurable weights and thresholds
    const weights = await this.loadWeights();
    const thresholds = await this.loadThresholds();

    // 3. Compute score and level
    const { trustScore, breakdown } = this.calculateTrustScore(signals, weights);
    const trustLevel = this.getTrustLevel(trustScore, signals, thresholds);

    // 4. Fetch or create TrustProfile
    let profile = await TrustProfile.findOne({ user: userId });
    if (!profile) {
      profile = new TrustProfile({ user: userId });
    }

    const previousScore = profile.trustScore || 0;
    const previousLevel = profile.trustLevel || TRUST_LEVELS.BASIC;

    profile.mobileVerified = signals.mobileVerified;
    profile.emailVerified = signals.emailVerified;
    profile.profileCompleted = signals.profileCompleted;
    profile.certificateVerified = approvedCertsCount > 0;
    profile.completedJobs = completedJobsCount;
    profile.averageRating = signals.averageRating;
    profile.verifiedExperience = signals.verifiedExperience;
    profile.trustScore = trustScore;
    profile.trustLevel = trustLevel;
    profile.scoreBreakdown = breakdown;

    // 5. Assign System A badges
    const badgeIds = await this.assignBadges(userId, signals, trustScore, trustLevel);
    profile.badges = badgeIds;

    await profile.save();

    // 6. Record TrustScoreHistory if score or level changed
    if (previousScore !== trustScore || previousLevel !== trustLevel) {
      await TrustScoreHistory.create({
        user: userId,
        previousScore,
        newScore: trustScore,
        delta: trustScore - previousScore,
        previousLevel,
        newLevel: trustLevel,
        triggerReason,
        triggerEntity: triggerEntity || { kind: 'TrustProfile', id: profile._id },
        breakdown,
      });

      logger.info(
        `[TrustScoreEngine] Score updated for user ${userId}: ${previousScore} -> ${trustScore} (${previousLevel} -> ${trustLevel})`
      );

      // Dispatch Socket.IO notification
      try {
        await createNotificationService({
          type: NOTIFICATION_TYPE.TRUST_SCORE_CHANGED,
          recipientId: userId,
          payload: { score: trustScore, trustLevel },
        });
      } catch (err) {
        // Non-blocking notification
      }
    }

    // 7. Sync reference to User model
    await User.findByIdAndUpdate(userId, { trustVerificationId: profile._id });

    return profile;
  }
}

export const trustScoreService = TrustScoreService;
export default TrustScoreService;
