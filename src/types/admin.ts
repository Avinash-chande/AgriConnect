export interface AdminDashboardKpis {
  users: {
    total: number;
    farmers: number;
    workers: number;
    admins: number;
    active: number;
    suspended: number;
    newThisMonth: number;
    newThisWeek: number;
  };
  jobs: {
    total: number;
    active: number;
    closed: number;
    filled: number;
    expired: number;
  };
  applications: {
    total: number;
    pending: number;
    hired: number;
    rejected: number;
  };
  revenue: {
    total: number;
    monthly: number;
  };
  openReports: number;
  recentSignups: Array<{ _id: string; count: number }>;
  charts?: any;
  recentAuditLogs?: AuditLogData[];
  auditPagination?: {
    total: number;
    page: number;
    pages: number;
  };
}

export interface AdminUser {
  _id: string;
  name: string;
  email: string;
  mobile: string;
  role: 'Farmer' | 'Worker' | 'Admin' | 'farmer' | 'worker' | 'admin';
  isVerified: boolean;
  profileCompleted: boolean;
  isActive: boolean;
  identityVerified: boolean;
  createdAt: string;
  adminRole?: {
    _id: string;
    name: string;
    permissions: string[];
  };
}

export interface AdminJob {
  _id: string;
  title: string;
  category: string;
  status: string;
  dailyWage?: number;
  monthlySalary?: number;
  wageType: string;
  totalApplications: number;
  hiredWorkersCount: number;
  isFeatured: boolean;
  createdAt: string;
  farmer: {
    _id: string;
    name: string;
    email: string;
    mobile: string;
  };
}

export interface TrustProfileData {
  _id: string;
  user: AdminUser;
  mobileVerified: boolean;
  emailVerified: boolean;
  profileCompleted: boolean;
  certificateVerified: boolean;
  verifiedExperience: boolean;
  completedJobs: number;
  averageRating: number;
  trustScore: number;
  trustLevel: 'BASIC' | 'VERIFIED' | 'SKILLED' | 'TRUSTED' | 'TOP_RATED';
  badges: any[];
  isFlagged?: boolean;
  status: string;
  updatedAt: string;
}

export interface CertificateData {
  _id: string;
  user: AdminUser;
  certificateType: 'AGRICULTURAL' | 'TRAINING' | 'TRACTOR_OPERATOR' | 'EQUIPMENT_TRAINING' | 'ITI_CERTIFICATE' | 'GOVERNMENT_SKILL' | 'OTHER';
  title: string;
  issuer: string;
  certificateNumber: string;
  documentReference: string;
  isPrivate?: boolean;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'RESUBMISSION_REQUESTED';
  submittedAt: string;
  reviewedAt?: string;
  reviewNotes?: string;
  identityDisclaimer?: string;
}

export interface IdentityKycData {
  _id: string;
  user: AdminUser;
  verificationType: string;
  status: 'PENDING' | 'PROCESSING' | 'VERIFIED' | 'REJECTED' | 'MANUAL_REVIEW' | 'RESUBMISSION_REQUIRED';
  referenceId: string;
  signatureVerified: boolean;
  nameMatch: boolean;
  dobMatch: boolean;
  verifiedAt?: string;
  reviewNotes?: string;
  createdAt: string;
}

export interface ReportData {
  _id: string;
  reporter: AdminUser;
  reportedUser?: AdminUser;
  reportedJob?: { _id: string; title: string };
  category: string;
  title: string;
  description: string;
  evidence: string[];
  status: 'open' | 'in_review' | 'resolved' | 'dismissed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  assignedTo?: { _id: string; name: string; email: string };
  resolution?: string;
  createdAt: string;
}

export interface AdminRoleData {
  _id: string;
  name: string;
  permissions: string[];
  description: string;
  isSystem: boolean;
  createdAt: string;
}

export interface PlatformSettingData {
  _id: string;
  key: string;
  value: any;
  type: 'boolean' | 'number' | 'string' | 'json';
  category: string;
  description: string;
}

export interface AuditLogData {
  _id: string;
  actor?: { _id: string; name: string; email: string; role: string };
  action: string;
  ipAddress: string;
  status: 'SUCCESS' | 'FAILURE' | 'WARNING';
  category: string;
  severity: 'info' | 'warning' | 'critical';
  details: any;
  createdAt: string;
}
