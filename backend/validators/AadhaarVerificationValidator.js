import { AppError } from '../utils/appError.js';

export const validateAadhaarKycUpload = (req, res, next) => {
  const { shareCode } = req.body;

  if (!shareCode || typeof shareCode !== 'string' || shareCode.trim().length !== 4 || !/^\d{4}$/.test(shareCode.trim())) {
    return next(new AppError('Please enter a valid 4-digit numeric Share Code.', 400));
  }

  if (!req.file && !req.files) {
    return next(new AppError('Please upload your official UIDAI Offline e-KYC ZIP file.', 400));
  }

  next();
};

export const validateKycReviewInput = (req, res, next) => {
  const { status, reviewNotes } = req.body;
  const allowed = ['VERIFIED', 'REJECTED', 'MANUAL_REVIEW', 'RESUBMISSION_REQUIRED'];

  if (!status || !allowed.includes(status)) {
    return next(new AppError(`Invalid status. Allowed: ${allowed.join(', ')}`, 400));
  }

  next();
};
