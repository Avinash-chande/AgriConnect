import { asyncHandler } from '../utils/asyncHandler.js';
import { sendResponse } from '../utils/apiResponse.js';
import { HTTP_STATUS } from '../constants/index.js';
import {
  applyForJobService,
  getMyApplicationsService,
  getFarmerReceivedApplicationsService,
  withdrawApplicationService,
  acceptApplicationService,
  rejectApplicationService,
  toggleShortlistApplicationService,
  cancelHiringService,
  getDashboardStatsService,
} from '../services/applicationService.js';

/**
 * @desc    Submit a new Job Application (Worker Only)
 * @route   POST /api/v1/jobs/:id/apply OR POST /api/v1/applications/jobs/:jobId
 * @access  Private (Worker Only)
 */
export const applyForJob = asyncHandler(async (req, res) => {
  const jobId = req.params.jobId || req.params.id;
  const application = await applyForJobService(req.user, jobId, req.body);

  return sendResponse(
    res,
    HTTP_STATUS.CREATED,
    'Job application submitted successfully',
    application
  );
});

/**
 * @desc    Get Worker's Submitted Applications History
 * @route   GET /api/v1/applications/my-applications
 * @access  Private (Worker Only)
 */
export const getMyApplications = asyncHandler(async (req, res) => {
  const result = await getMyApplicationsService(req.user._id, req.query);

  return sendResponse(
    res,
    HTTP_STATUS.OK,
    'My job applications retrieved successfully',
    result.applications,
    { pagination: result.pagination }
  );
});

/**
 * @desc    Get Farmer's Received Applications for posted jobs
 * @route   GET /api/v1/applications/farmer
 * @access  Private (Farmer Only)
 */
export const getFarmerApplications = asyncHandler(async (req, res) => {
  const result = await getFarmerReceivedApplicationsService(req.user._id, req.query);

  return sendResponse(
    res,
    HTTP_STATUS.OK,
    'Received job applications retrieved successfully',
    result.applications,
    {
      pagination: result.pagination,
      statistics: result.statistics,
    }
  );
});

/**
 * @desc    Withdraw Application (Worker Only)
 * @route   PATCH /api/v1/applications/:id/withdraw
 * @access  Private (Worker Only)
 */
export const withdrawApplication = asyncHandler(async (req, res) => {
  const applicationId = req.params.id || req.params.applicationId;
  const application = await withdrawApplicationService(req.user, applicationId);

  return sendResponse(
    res,
    HTTP_STATUS.OK,
    'Job application withdrawn successfully',
    application
  );
});

/**
 * @desc    Accept Job Application (Farmer Only)
 * @route   PATCH /api/v1/applications/:id/accept
 * @access  Private (Farmer Only)
 */
export const acceptApplication = asyncHandler(async (req, res) => {
  const applicationId = req.params.id || req.params.applicationId;
  const result = await acceptApplicationService(req.user, applicationId, req.body);

  return sendResponse(
    res,
    HTTP_STATUS.OK,
    'Job application accepted successfully',
    result.application,
    {
      job: result.job,
      statistics: result.statistics,
    }
  );
});

/**
 * @desc    Reject Job Application (Farmer Only)
 * @route   PATCH /api/v1/applications/:id/reject
 * @access  Private (Farmer Only)
 */
export const rejectApplication = asyncHandler(async (req, res) => {
  const applicationId = req.params.id || req.params.applicationId;
  const result = await rejectApplicationService(req.user, applicationId, req.body);

  return sendResponse(
    res,
    HTTP_STATUS.OK,
    'Job application rejected successfully',
    result.application,
    {
      statistics: result.statistics,
    }
  );
});

/**
 * @desc    Toggle Shortlist Status of Job Application (Farmer Only)
 * @route   POST /api/v1/applications/:id/shortlist OR PATCH /api/v1/applications/:id/shortlist
 * @access  Private (Farmer Only)
 */
export const toggleShortlistApplication = asyncHandler(async (req, res) => {
  const applicationId = req.params.id || req.params.applicationId;
  const result = await toggleShortlistApplicationService(req.user, applicationId);

  const message = result.shortlisted
    ? 'Candidate shortlisted successfully'
    : 'Candidate removed from shortlist';

  return sendResponse(
    res,
    HTTP_STATUS.OK,
    message,
    result.application,
    {
      shortlisted: result.shortlisted,
      statistics: result.statistics,
    }
  );
});

/**
 * @desc    Cancel Hiring (Farmer Only, allowed before worker joins)
 * @route   PATCH /api/v1/applications/:id/cancel-hiring
 * @access  Private (Farmer Only)
 */
export const cancelHiring = asyncHandler(async (req, res) => {
  const applicationId = req.params.id || req.params.applicationId;
  const result = await cancelHiringService(req.user, applicationId, req.body);

  return sendResponse(
    res,
    HTTP_STATUS.OK,
    'Hiring cancelled successfully',
    result.application,
    {
      previousStatus: result.previousStatus,
      statistics: result.statistics,
    }
  );
});

/**
 * @desc    Get Farmer Application Dashboard Analytics
 * @route   GET /api/v1/applications/dashboard/stats
 * @access  Private (Farmer Only)
 */
export const getDashboardStats = asyncHandler(async (req, res) => {
  const daysBack = parseInt(req.query.daysBack) || 30;
  const result = await getDashboardStatsService(req.user._id, daysBack);

  return sendResponse(
    res,
    HTTP_STATUS.OK,
    'Farmer application dashboard stats retrieved successfully',
    result
  );
});
