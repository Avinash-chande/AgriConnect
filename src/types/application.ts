export type ApplicationStatus =
  | 'Pending'
  | 'Shortlisted'
  | 'Accepted'
  | 'Rejected'
  | 'Withdrawn'
  | 'Cancelled'
  | 'Hired';

export interface UserSummary {
  _id: string;
  id?: string;
  name: string;
  email: string;
  mobile?: string;
  role?: string;
  profileImage?: string;
  isVerified?: boolean;
  identityVerified?: boolean;
  trustVerificationId?: string;
  trustProfile?: {
    trustScore: number;
    trustLevel: string;
    completedJobs: number;
    averageRating: number;
    certificateVerified: boolean;
    badges: any[];
  };
  workerProfile?: {
    title?: string;
    skills?: string[];
    experience?: number;
    experienceYears?: number;
    rating?: number;
    certificateVerified?: boolean;
    completedJobs?: number;
    dailyRate?: number;
  };
}

export interface JobSummary {
  _id: string;
  id?: string;
  title: string;
  category?: string;
  cropType?: string;
  dailyWage?: number;
  wageType?: string;
  status?: string;
  jobAddress?: {
    district?: string;
    state?: string;
    village?: string;
  };
}

export interface JobApplication {
  _id: string;
  id?: string;
  worker: UserSummary;
  farmer: UserSummary;
  job: JobSummary;
  status: ApplicationStatus;
  coverLetter?: string;
  expectedJoiningDate?: string;
  expectedDailyWage?: number;
  notes?: string;
  farmerFeedback?: string;
  workerFeedback?: string;
  shortlisted: boolean;
  interviewDate?: string;
  hiredDate?: string;
  rejectedDate?: string;
  withdrawnDate?: string;
  cancelledDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApplyJobPayload {
  coverLetter?: string;
  expectedJoiningDate?: string;
  expectedDailyWage?: number;
  notes?: string;
}

export interface GetApplicationsQueryParams {
  status?: string;
  jobId?: string;
  page?: number;
  limit?: number;
  search?: string;
}
