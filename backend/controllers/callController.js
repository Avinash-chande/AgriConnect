/**
 * AgriConnect Telephony Call Controller
 * Handles mobile call requests, webhooks, and call history.
 */

import mongoose from 'mongoose';
import { callService } from '../services/callService.js';
import { WorkerProfile } from '../models/WorkerProfile.js';
import { User } from '../models/User.js';
import { Call } from '../models/Call.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendResponse } from '../utils/apiResponse.js';
import { AppError } from '../utils/appError.js';
import { logger } from '../utils/logger.js';

/**
 * @desc    Initiate a real mobile phone call to a worker's registered mobile number
 * @route   POST /api/v1/calls/mobile
 * @access  Private (Authenticated Farmers)
 */
export const initiateMobileCallController = asyncHandler(async (req, res) => {
  const callerUser = req.user;
  const { workerId } = req.body || {};

  if (process.env.NODE_ENV !== 'production') {
    logger.info('📞 Mobile call request received');
    logger.info(`📞 Authenticated user: ${callerUser?._id}`);
    logger.info(`📞 Target worker: ${workerId}`);
  }

  if (!workerId) {
    throw new AppError('Worker ID is required to initiate a call.', 400);
  }

  // Prevent user from calling themselves
  if (workerId.toString() === callerUser._id.toString()) {
    throw new AppError('You cannot initiate a phone call to yourself.', 400);
  }

  let workerProfile = null;
  let workerUser = null;

  // 1. Look up by WorkerProfile _id or owner
  if (mongoose.Types.ObjectId.isValid(workerId)) {
    workerProfile = await WorkerProfile.findOne({
      $or: [{ _id: workerId }, { owner: workerId }],
      isDeleted: { $ne: true },
    }).populate('owner');

    if (workerProfile && workerProfile.owner) {
      workerUser = workerProfile.owner;
    } else {
      // Direct User lookup if not found via WorkerProfile
      workerUser = await User.findOne({ _id: workerId, isDeleted: { $ne: true } });
    }
  }

  if (!workerUser) {
    throw new AppError('Worker account not found.', 404);
  }

  // Optional: Build webhook URL if hosted domain available
  const baseUrl = process.env.BACKEND_PUBLIC_URL || `${req.protocol}://${req.get('host')}`;
  const webhookUrl = `${baseUrl}/api/v1/calls/webhook`;

  // Initiate telecom phone call via CallService
  const result = await callService.initiateMobileCall({
    callerUser,
    workerUser,
    workerProfile,
    webhookUrl,
  });

  // Return strictly sanitized response (NO phone number or secrets exposed)
  return sendResponse(res, 200, 'Call initiated successfully', {
    callId: result.callId,
    status: result.status,
    createdAt: result.createdAt,
  });
});

/**
 * @desc    Handle Telephony Provider Status Webhook (e.g. Twilio StatusCallback)
 * @route   POST /api/v1/calls/webhook
 * @access  Public (Provider Webhook)
 */
export const handleCallWebhookController = asyncHandler(async (req, res) => {
  const body = req.body || {};
  const providerCallId = body.CallSid || body.callSid || body.id;
  const callStatus = body.CallStatus || body.callStatus || body.status;
  const duration = parseInt(body.CallDuration || body.duration || '0', 10);

  logger.info(`📡 [CallWebhook] Status callback: ${providerCallId} -> ${callStatus} (Duration: ${duration}s)`);

  if (providerCallId && callStatus) {
    await callService.updateCallStatusByProviderId(providerCallId, callStatus.toLowerCase(), duration);
  }

  // TwiML / standard 200 response to acknowledge carrier webhook
  res.status(200).type('text/xml').send('<Response/>');
});

/**
 * @desc    Get user's call history
 * @route   GET /api/v1/calls/history
 * @access  Private
 */
export const getCallHistoryController = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const calls = await Call.find({
    $or: [{ caller: userId }, { receiver: userId }],
  })
    .populate('caller', 'name role profileImage')
    .populate('receiver', 'name role profileImage')
    .populate('workerProfile', 'title skills rating')
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  return sendResponse(res, 200, 'Call history retrieved successfully', calls);
});
