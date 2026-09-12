import api from './api';

export interface TrustProfileResponse {
  _id: string;
  mobileVerified: boolean;
  emailVerified: boolean;
  profileCompleted: boolean;
  certificateVerified: boolean;
  verifiedExperience: boolean;
  completedJobs: number;
  averageRating: number;
  trustScore: number;
  trustLevel: 'BASIC' | 'VERIFIED' | 'SKILLED' | 'TRUSTED' | 'TOP_RATED';
  scoreBreakdown?: {
    mobileScore?: number;
    emailScore?: number;
    profileScore?: number;
    certificatesScore?: number;
    completedJobsScore?: number;
    ratingsScore?: number;
  };
  badges: Array<{
    _id: string;
    type: string;
    title: string;
    description: string;
    issuedAt: string;
  }>;
}

export interface AadhaarKycStatusResponse {
  _id?: string;
  status: 'NOT_STARTED' | 'PENDING' | 'PROCESSING' | 'VERIFIED' | 'REJECTED' | 'MANUAL_REVIEW' | 'RESUBMISSION_REQUIRED';
  referenceId?: string; // Masked string like "XXXX-XXXX-1234"
  signatureVerified?: boolean;
  nameMatch?: boolean;
  dobMatch?: boolean;
  verifiedAt?: string;
  identityVerified?: boolean;
}

export const getMyTrustProfileApi = async () => {
  const res = await api.get<{ data: TrustProfileResponse }>('/profiles/me');
  return res.data;
};

export const getAadhaarKycStatusApi = async () => {
  const res = await api.get<{ data: AadhaarKycStatusResponse }>('/kyc/status');
  return res.data.data;
};

export const uploadAadhaarKycApi = async (formData: FormData) => {
  const res = await api.post<{ success: boolean; message: string; data: AadhaarKycStatusResponse }>(
    '/kyc/upload',
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  );
  return res.data;
};
