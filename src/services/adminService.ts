import api from './api';
import type {
  AdminDashboardKpis,
  AdminUser,
  AdminJob,
  TrustProfileData,
  CertificateData,
  IdentityKycData,
  ReportData,
  AdminRoleData,
  PlatformSettingData,
  AuditLogData,
} from '../types/admin';

// Dashboard
export const getAdminDashboardApi = async () => {
  const res = await api.get<{ data: { kpis: AdminDashboardKpis } }>('/admin/dashboard');
  return res.data.data.kpis;
};

// Users
export const getAdminUsersApi = async (params?: Record<string, any>) => {
  const res = await api.get<{ data: { users: AdminUser[]; pagination: any } }>('/admin/users', { params });
  return res.data.data;
};

export const getUserByIdApi = async (id: string) => {
  const res = await api.get<{ data: AdminUser }>(`/admin/users/${id}`);
  return res.data.data;
};

export const getUserOverviewApi = async (id: string) => {
  const res = await api.get<{ data: any }>(`/admin/users/${id}/overview`);
  return res.data.data;
};

export const suspendUserApi = async (id: string) => {
  const res = await api.patch(`/admin/users/${id}/suspend`);
  return res.data;
};

export const activateUserApi = async (id: string) => {
  const res = await api.patch(`/admin/users/${id}/activate`);
  return res.data;
};

export const deleteUserApi = async (id: string) => {
  const res = await api.delete(`/admin/users/${id}`);
  return res.data;
};

// Jobs
export const getAdminJobsApi = async (params?: Record<string, any>) => {
  const res = await api.get<{ data: { jobs: AdminJob[]; pagination: any } }>('/admin/jobs', { params });
  return res.data.data;
};

export const getJobModerationOverviewApi = async (jobId: string) => {
  const res = await api.get<{ data: any }>(`/admin/jobs/${jobId}/overview`);
  return res.data.data;
};

export const moderateJobApi = async (id: string, action: string, reason?: string) => {
  const res = await api.patch(`/admin/jobs/${id}/moderate`, { action, reason });
  return res.data;
};

export const featureJobApi = async (id: string, featured: boolean, durationDays?: number) => {
  const res = await api.patch(`/admin/jobs/${id}/feature`, { featured, durationDays });
  return res.data;
};

// Applications
export const getAdminApplicationsApi = async (params?: Record<string, any>) => {
  const res = await api.get<{ data: { applications: any[]; pagination: any } }>('/admin/applications', { params });
  return res.data.data;
};

export const getApplicationByIdApi = async (id: string) => {
  const res = await api.get<{ data: any }>(`/admin/applications/${id}`);
  return res.data.data;
};

export const flagApplicationApi = async (id: string, isFlagged: boolean, reason?: string) => {
  const res = await api.patch(`/admin/applications/${id}/flag`, { isFlagged, reason });
  return res.data;
};

export const overrideApplicationApi = async (id: string, status: string, adminNotes?: string) => {
  const res = await api.patch(`/admin/applications/${id}/override`, { status, adminNotes });
  return res.data;
};

// Trust Verification (System A)
export const getAdminTrustProfilesApi = async (params?: Record<string, any>) => {
  const res = await api.get<{ data: { records: TrustProfileData[]; pagination: any } }>('/admin/trust-verifications', { params });
  return res.data.data;
};

export const reviewTrustProfileApi = async (id: string, status: string, reviewNotes?: string) => {
  const res = await api.patch(`/admin/trust-verifications/${id}/review`, { status, reviewNotes });
  return res.data;
};

export const flagTrustProfileApi = async (id: string, isFlagged: boolean, reason?: string) => {
  const res = await api.patch(`/admin/trust-verifications/${id}/flag`, { isFlagged, reason });
  return res.data;
};

export const recalculateTrustScoreApi = async (userId: string) => {
  const res = await api.post(`/admin/trust-verifications/${userId}/recalculate`);
  return res.data;
};

// Certificates
export const getAdminCertificatesApi = async (params?: Record<string, any>) => {
  const res = await api.get<{ data: { certificates: CertificateData[]; pagination: any } }>('/admin/certificates', { params });
  return res.data.data;
};

export const reviewCertificateApi = async (id: string, status: string, reviewNotes?: string) => {
  const res = await api.patch(`/admin/certificates/${id}/review`, { status, reviewNotes });
  return res.data;
};

// Aadhaar KYC (System B)
export const getAdminKycRequestsApi = async (params?: Record<string, any>) => {
  const res = await api.get<{ data: { records: IdentityKycData[]; pagination: any } }>('/admin/kyc', { params });
  return res.data.data;
};

export const reviewKycApi = async (id: string, status: string, reviewNotes?: string) => {
  const res = await api.patch(`/admin/kyc/${id}/review`, { status, reviewNotes });
  return res.data;
};

// Reports
export const getAdminReportsApi = async (params?: Record<string, any>) => {
  const res = await api.get<{ data: { reports: ReportData[]; pagination: any } }>('/admin/reports', { params });
  return res.data.data;
};

export const assignReportApi = async (id: string, assigneeId: string) => {
  const res = await api.patch(`/admin/reports/${id}/assign`, { assigneeId });
  return res.data;
};

export const resolveReportApi = async (id: string, status: string, resolution?: string, internalNotes?: string) => {
  const res = await api.patch(`/admin/reports/${id}/resolve`, { status, resolution, internalNotes });
  return res.data;
};

// Payments
export const getAdminPaymentsApi = async (params?: Record<string, any>) => {
  const res = await api.get<{ data: { payments: any[]; pagination: any } }>('/admin/payments', { params });
  return res.data.data;
};

export const getAdminPaymentOverviewApi = async () => {
  const res = await api.get<{ data: any }>('/admin/payments/overview');
  return res.data.data;
};

export const processAdminRefundApi = async (id: string, reason?: string) => {
  const res = await api.post(`/admin/payments/${id}/refund`, { reason });
  return res.data;
};

// Premium
export const getAdminSubscriptionsApi = async (params?: Record<string, any>) => {
  const res = await api.get<{ data: { subscriptions: any[]; pagination: any } }>('/admin/subscriptions', { params });
  return res.data.data;
};

export const grantPremiumApi = async (userId: string, durationDays: number) => {
  const res = await api.post('/admin/subscriptions/grant', { userId, durationDays });
  return res.data;
};

export const revokePremiumApi = async (subscriptionId: string) => {
  const res = await api.patch(`/admin/subscriptions/${subscriptionId}/revoke`);
  return res.data;
};

// Roles
export const getAdminRolesApi = async () => {
  const res = await api.get<{ data: AdminRoleData[] }>('/admin/roles');
  return res.data.data;
};

export const createAdminRoleApi = async (roleData: { name: string; permissions: string[]; description?: string }) => {
  const res = await api.post('/admin/roles', roleData);
  return res.data;
};

export const assignAdminRoleApi = async (userId: string, roleId: string) => {
  const res = await api.post('/admin/roles/assign', { userId, roleId });
  return res.data;
};

// Platform Settings
export const getPlatformSettingsApi = async (category?: string) => {
  const res = await api.get<{ data: PlatformSettingData[] }>('/admin/settings', { params: { category } });
  return res.data.data;
};

export const updatePlatformSettingApi = async (key: string, value: any) => {
  const res = await api.put(`/admin/settings/${key}`, { value });
  return res.data;
};

export const bulkUpdatePlatformSettingsApi = async (settings: Array<{ key: string; value: any }>) => {
  const res = await api.put('/admin/settings/bulk', { settings });
  return res.data;
};

// Audit Logs
export const getAdminAuditLogsApi = async (params?: Record<string, any>) => {
  const res = await api.get<{ data: { logs: AuditLogData[]; pagination: any } }>('/admin/audit-logs', { params });
  return res.data.data;
};

// Analytics
export const getAnalyticsUserGrowthApi = async (days = 30) => {
  const res = await api.get<{ data: any[] }>('/admin/analytics/user-growth', { params: { days } });
  return res.data.data;
};

export const getAnalyticsJobTrendsApi = async (days = 30) => {
  const res = await api.get<{ data: any[] }>('/admin/analytics/job-trends', { params: { days } });
  return res.data.data;
};

// Notifications
export const broadcastNotificationApi = async (data: { title: string; message: string; targetRole?: string }) => {
  const res = await api.post('/admin/notifications/broadcast', data);
  return res.data;
};
