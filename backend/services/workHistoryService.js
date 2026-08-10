import { VerifiedWorkHistory } from '../models/VerifiedWorkHistory.js';
import { Application } from '../models/Application.js';
import { Job } from '../models/Job.js';
import { TrustScoreService } from './TrustScoreService.js';
import { Notification, NOTIFICATION_TYPE } from '../models/Notification.js';
import { AppError } from '../utils/appError.js';
import { logger } from '../utils/logger.js';

/**
 * WorkHistoryService — Handles verified job completions & work history records.
 *
 * STRICT INTEGRITY RULE:
 * - Can ONLY be invoked by verified job completion events (e.g. Farmer completing a job / application).
 * - Workers CANNOT manually add or edit completed job counts or work history.
 */
export class WorkHistoryService {
  /**
   * Record verified job completion for a worker
   *
   * @param {Object} params
   * @param {ObjectId|string} params.applicationId
   * @param {Object|string} params.farmerUser
   * @param {number} [params.rating=5]
   * @param {string} [params.farmerFeedback='']
   * @returns {Promise<{ application: Object, workHistory: Object, trustProfile: Object }>}
   */
  static async completeJobAndRecordWorkHistory({ applicationId, farmerUser, rating = 5, farmerFeedback = '' }) {
    const application = await Application.findById(applicationId).populate('job worker farmer');
    if (!application) throw new AppError('Application not found', 404);

    const farmerId = farmerUser._id ? farmerUser._id.toString() : farmerUser.toString();
    const appFarmerId = application.farmer._id ? application.farmer._id.toString() : application.farmer.toString();

    if (farmerId !== appFarmerId) {
      throw new AppError('Forbidden: Only the job farmer can mark job completion', 403);
    }

    // Mark Application as Completed
    application.status = 'Completed';
    if (farmerFeedback) application.farmerFeedback = farmerFeedback;
    await application.save();

    const workerId = application.worker._id;
    const job = application.job;

    // Calculate job duration in days
    let durationDays = 1;
    if (job?.startDate && job?.endDate) {
      const start = new Date(job.startDate);
      const end = new Date(job.endDate);
      const diffTime = Math.abs(end - start);
      durationDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    }

    // Create or update verified work history record
    const workHistory = await VerifiedWorkHistory.findOneAndUpdate(
      { application: application._id },
      {
        job: job._id,
        application: application._id,
        worker: workerId,
        farmer: farmerId,
        cropType: job?.cropType || '',
        skillsUsed: job?.requiredSkills || [],
        durationDays,
        completionDate: new Date(),
        rating,
        farmerFeedback,
        verifiedByEvent: 'FARMER_JOB_COMPLETION',
      },
      { upsert: true, new: true }
    );

    // Recalculate Worker Trust Score & Badges via System A Engine
    const updatedTrustProfile = await TrustScoreService.updateTrustScore(
      workerId,
      'VERIFIED_JOB_COMPLETED',
      { kind: 'Application', id: application._id }
    );

    // Notify Worker
    try {
      await Notification.create({
        recipient: workerId,
        type: NOTIFICATION_TYPE.USER_VERIFIED,
        title: 'Job Completed & Experience Verified! ⭐',
        message: `Farmer marked job "${job?.title || 'Job'}" as completed with a ${rating}/5 rating. Your Trust Score is now ${updatedTrustProfile.trustScore}/100.`,
        meta: {
          jobId: job._id,
          rating,
          trustScore: updatedTrustProfile.trustScore,
          trustLevel: updatedTrustProfile.trustLevel,
        },
      });
    } catch (err) {
      logger.warn(`Failed to create job completion notification: ${err.message}`);
    }

    return { application, workHistory, trustProfile: updatedTrustProfile };
  }

  /**
   * Get verified work history for a worker
   *
   * @param {ObjectId|string} workerId
   * @returns {Promise<Array>}
   */
  static async getWorkerWorkHistory(workerId) {
    return VerifiedWorkHistory.find({ worker: workerId })
      .populate('job', 'title category cropType workType dailyWage jobAddress')
      .populate('farmer', 'name email profileImage')
      .sort({ completionDate: -1 })
      .lean();
  }
}

export const workHistoryService = WorkHistoryService;
export default WorkHistoryService;
