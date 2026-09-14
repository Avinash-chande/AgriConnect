import api from './api';

export interface RegisterFarmerPayload {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  farmName: string;
  farmType?: string;
  location: string;
  totalAcreage?: number;
  farmDescription?: string;
}

export interface RegisterWorkerPayload {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  title?: string;
  location: string;
  hourlyRate?: number;
  dailyRate?: number;
  skills: string[];
  experienceYears?: number;
  experienceLevel?: string;
  languages?: string[];
  bio?: string;
}

export interface PendingOtpResult {
  requiresOtp: boolean;
  email: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface ForgotPasswordPayload {
  email?: string;
  phone?: string;
}

export interface ResetPasswordPayload {
  email?: string;
  phone?: string;
  otpCode: string;
  newPassword: string;
}

export interface VerifyOTPPayload {
  email?: string;
  phone?: string;
  otpCode: string;
}

export const registerFarmerApi = async (payload: RegisterFarmerPayload) => {
  const response = await api.post('/auth/register/farmer', payload);
  return response.data;
};

export const registerWorkerApi = async (payload: RegisterWorkerPayload) => {
  const response = await api.post('/auth/register/worker', payload);
  return response.data;
};

export const resendRegistrationOTPApi = async (email: string) => {
  const response = await api.post('/auth/resend-registration-otp', { email });
  return response.data;
};

export interface GoogleAuthPayload {
  credential: string;
  role: 'farmer' | 'worker';
}

export const googleAuthApi = async (payload: GoogleAuthPayload) => {
  const response = await api.post('/auth/google', payload);
  return response.data;
};

export const loginApi = async (payload: LoginPayload) => {
  const response = await api.post('/auth/login', payload);
  return response.data;
};

export const logoutApi = async () => {
  const response = await api.post('/auth/logout');
  return response.data;
};

export const forgotPasswordApi = async (payload: ForgotPasswordPayload) => {
  const response = await api.post('/auth/forgot-password', payload);
  return response.data;
};

export const resetPasswordApi = async (payload: ResetPasswordPayload) => {
  const response = await api.post('/auth/reset-password', payload);
  return response.data;
};

export const sendOTPApi = async (payload: ForgotPasswordPayload) => {
  const response = await api.post('/auth/send-otp', payload);
  return response.data;
};

export const verifyOTPApi = async (payload: VerifyOTPPayload) => {
  const response = await api.post('/auth/verify-otp', payload);
  return response.data;
};

export const getCurrentUserApi = async () => {
  const response = await api.get('/auth/me');
  return response.data;
};
