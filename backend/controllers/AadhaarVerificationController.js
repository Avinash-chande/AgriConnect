import { asyncHandler } from '../utils/asyncHandler.js';
import { sendResponse } from '../utils/apiResponse.js';
import { AadhaarVerificationService } from '../services/AadhaarVerificationService.js';
import { AadhaarVerificationRepository } from '../repositories/AadhaarVerificationRepository.js';

export const uploadAadhaarKyc = asyncHandler(async (req, res) => {
  const { shareCode } = req.body;
  const zipFilePayload = req.file ? req.file.path || req.file.buffer : req.body.zipBuffer;

  const result = await AadhaarVerificationService.processAadhaarKyc(req.user, zipFilePayload, shareCode);

  return sendResponse(res, 200, result.message, result);
});

export const getMyKycStatus = asyncHandler(async (req, res) => {
  const record = await AadhaarVerificationRepository.findByUserId(req.user._id);

  return sendResponse(res, 200, 'Aadhaar e-KYC status fetched successfully', record || {
    status: 'NOT_STARTED',
    identityVerified: req.user.identityVerified || false,
  });
});
