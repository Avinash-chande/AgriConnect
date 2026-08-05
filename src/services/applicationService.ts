import api from './api';
import type {
  JobApplication,
  ApplyJobPayload,
  GetApplicationsQueryParams,
} from '../types/application';

export type { JobApplication, ApplyJobPayload, GetApplicationsQueryParams };

/**
 * Frontend Service for Job Application Operations
 */

/**
 * Submit job application (Worker Only)
 */
export const applyForJob = async (jobId: string, payload: ApplyJobPayload): Promise<JobApplication> => {
  const response = await api.post(`/jobs/${jobId}/apply`, payload);
  return response.data.data;
};

/**
 * Withdraw application (Worker Only)
 */
export const withdrawApplication = async (applicationId: string): Promise<JobApplication> => {
  const response = await api.patch(`/applications/${applicationId}/withdraw`);
  return response.data.data;
};

/**
 * Fetch Worker's submitted applications
 */
export const getMyApplications = async (
  params?: GetApplicationsQueryParams
): Promise<{ applications: JobApplication[]; pagination: any }> => {
  const response = await api.get('/applications/my-applications', { params });
  return {
    applications: response.data.data,
    pagination: response.data.meta?.pagination || {},
  };
};

/**
 * Fetch Farmer's received applications
 */
export const getFarmerApplications = async (
  params?: GetApplicationsQueryParams
): Promise<{ applications: JobApplication[]; pagination: any; statistics?: any }> => {
  const response = await api.get('/applications/farmer', { params });
  return {
    applications: response.data.data,
    pagination: response.data.meta?.pagination || {},
    statistics: response.data.meta?.statistics || {},
  };
};

/**
 * Toggle Shortlist status of an application (Farmer Only)
 */
export const toggleShortlistApplication = async (
  applicationId: string
): Promise<{ application: JobApplication; shortlisted: boolean; statistics?: any }> => {
  const response = await api.post(`/applications/${applicationId}/shortlist`);
  return {
    application: response.data.data,
    shortlisted: response.data.meta?.shortlisted,
    statistics: response.data.meta?.statistics,
  };
};

/**
 * Accept a job application (Farmer Only)
 */
export const acceptApplication = async (
  applicationId: string,
  payload?: { farmerFeedback?: string; rejectOthers?: boolean; rejectionFeedback?: string }
): Promise<{ application: JobApplication; job?: any; statistics?: any }> => {
  const response = await api.patch(`/applications/${applicationId}/accept`, payload);
  return {
    application: response.data.data,
    job: response.data.meta?.job,
    statistics: response.data.meta?.statistics,
  };
};

/**
 * Reject a job application (Farmer Only)
 */
export const rejectApplication = async (
  applicationId: string,
  payload?: { reason?: string }
): Promise<{ application: JobApplication; statistics?: any }> => {
  const response = await api.patch(`/applications/${applicationId}/reject`, payload);
  return {
    application: response.data.data,
    statistics: response.data.meta?.statistics,
  };
};

/**
 * Cancel Hiring (Farmer Only)
 */
export const cancelHiring = async (
  applicationId: string,
  payload?: { reason?: string }
): Promise<{ application: JobApplication; previousStatus?: string; statistics?: any }> => {
  const response = await api.patch(`/applications/${applicationId}/cancel-hiring`, payload);
  return {
    application: response.data.data,
    previousStatus: response.data.meta?.previousStatus,
    statistics: response.data.meta?.statistics,
  };
};

/**
 * Fetch Farmer Application Dashboard Analytics
 */
export const getFarmerDashboardStats = async (daysBack = 30): Promise<{
  overview: Record<string, number>;
  perJob: Array<{
    jobId: string;
    jobTitle: string;
    category: string;
    status: string;
    total: number;
    pending: number;
    shortlisted: number;
    accepted: number;
    hired: number;
    rejected: number;
  }>;
  perDay: Array<{ date: string; count: number }>;
  recentApplicants: JobApplication[];
}> => {
  const response = await api.get('/applications/dashboard/stats', { params: { daysBack } });
  return response.data.data;
};

