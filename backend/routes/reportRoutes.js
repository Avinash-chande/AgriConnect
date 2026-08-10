import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccessResponse } from '../utils/apiResponse.js';
import * as reportService from '../services/reportService.js';
import { validateCreateReport } from '../validators/adminValidator.js';

const router = express.Router();

router.use(protect);

// Create report
router.post(
  '/',
  validateCreateReport,
  asyncHandler(async (req, res) => {
    const report = await reportService.createReport(req.user._id, req.body);
    return sendSuccessResponse(res, 201, 'Report submitted successfully', report);
  })
);

// Get my reports
router.get(
  '/my-reports',
  asyncHandler(async (req, res) => {
    const reports = await reportService.getMyReports(req.user._id, req.query);
    return sendSuccessResponse(res, 200, 'Your reports fetched successfully', reports);
  })
);

export default router;
