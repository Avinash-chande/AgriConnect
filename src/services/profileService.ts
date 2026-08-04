import api from './api';

export interface FarmAddress {
  addressLine?: string;
  village?: string;
  district: string;
  state: string;
  pincode?: string;
  latitude?: number;
  longitude?: number;
}

export interface FarmerProfilePayload {
  farmName: string;
  farmDescription?: string;
  farmSize: number;
  farmSizeUnit?: 'Acres' | 'Hectares' | 'Bigha' | 'Gunta' | 'Sq Ft';
  cropTypes?: string[];
  livestock?: string[];
  equipment?: string[];
  irrigationType?: string;
  farmAddress: FarmAddress;
  workingDays?: string[];
  phone?: string;
  email?: string;
}

export interface WorkerProfilePayload {
  title?: string;
  bio?: string;
  skills: string[];
  experience?: number;
  languages?: string[];
  education?: string;
  expectedDailyWage: number;
  expectedMonthlySalary?: number;
  availability?: 'Immediate' | 'Within 3 Days' | 'Seasonal' | 'Unavailable';
  preferredWorkType?: 'Full-Time' | 'Part-Time' | 'Contractual / Seasonal' | 'Daily Basis';
  preferredDistrict?: string;
  preferredState?: string;
  preferredVillage?: string;
  aadhaarNumber?: string;
  aadhaarVerified?: boolean;
}

export const getMyProfileApi = async () => {
  const response = await api.get('/profiles/me');
  return response.data;
};

export const updateFarmerProfileApi = async (payload: Partial<FarmerProfilePayload> & { name?: string }) => {
  const response = await api.put('/profiles/me', payload);
  return response.data;
};

export const updateWorkerProfileApi = async (payload: Partial<WorkerProfilePayload> & { name?: string }) => {
  const response = await api.put('/profiles/me', payload);
  return response.data;
};

export const uploadAvatarApi = async (file: File) => {
  const formData = new FormData();
  formData.append('image', file);
  const response = await api.post('/profiles/upload-avatar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

export const uploadFarmImagesApi = async (files: File[]) => {
  const formData = new FormData();
  files.forEach((file) => formData.append('images', file));
  const response = await api.post('/profiles/upload-farm-images', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

export const uploadCertificatesApi = async (files: File[], target: 'certificateImages' | 'profileGallery' = 'certificateImages') => {
  const formData = new FormData();
  files.forEach((file) => formData.append('images', file));
  const response = await api.post(`/profiles/upload-certificates?target=${target}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

export const deleteImageApi = async (imageUrl: string, imageType: 'farmImages' | 'certificateImages' | 'profileGallery') => {
  const response = await api.delete('/profiles/images', {
    data: { imageUrl, imageType },
  });
  return response.data;
};

export const getProfileByIdOrSlugApi = async (identifier: string) => {
  const response = await api.get(`/profiles/user/${identifier}`);
  return response.data;
};
