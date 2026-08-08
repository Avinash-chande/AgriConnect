import { api } from './api';

export interface JobAddress {
  addressLine?: string;
  village?: string;
  district: string;
  state: string;
  pincode?: string;
  latitude?: number;
  longitude?: number;
}

export interface JobData {
  _id?: string;
  title: string;
  description: string;
  category: string;
  cropType?: string;
  workType: string;
  numberOfWorkers: number;
  genderPreference?: 'Male' | 'Female' | 'Any';
  minimumAge?: number;
  maximumAge?: number;
  experienceRequired?: number;
  requiredSkills: string[];
  wageType: 'Daily' | 'Monthly' | 'Per Acre' | 'Per Quintal' | 'Contract';
  dailyWage?: number;
  monthlySalary?: number;
  startDate: string;
  endDate?: string;
  workingHours?: number;
  accommodationProvided?: boolean;
  foodProvided?: boolean;
  transportProvided?: boolean;
  status?: 'Draft' | 'Active' | 'Filled' | 'Paused' | 'Closed' | 'Expired';
  jobAddress: JobAddress;
  farmImages?: string[];
  jobImages?: string[];
  contactPerson?: string;
  contactMobile?: string;
  isFeatured?: boolean;
  isUrgent?: boolean;
  savedCount?: number;
  shareCount?: number;
  totalApplications?: number;
  totalViews?: number;
  createdAt?: string;
  farmer?: {
    _id: string;
    name: string;
    email: string;
    role: string;
  };
}

export interface FarmerDashboardStats {
  totalJobs: number;
  openJobs: number;
  closedJobs: number;
  totalApplications: number;
  totalViews: number;
  totalSaved: number;
  featuredJobs: number;
  applicationsChart: { title: string; applications: number }[];
  viewsTrendChart: { day: string; views: number }[];
}

export interface AutocompleteResult {
  titles: string[];
  crops: string[];
  skills: string[];
  locations: string[];
  farmers: string[];
}

export interface PaginationMeta {
  totalJobs: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export const jobService = {
  /**
   * Get All Jobs with Filtering & Pagination
   */
  getAllJobs: async (
    params: Record<string, any> = {}
  ): Promise<{ jobs: JobData[]; pagination: PaginationMeta }> => {
    const response = await api.get('/jobs', { params });
    return {
      jobs: response.data.data,
      pagination: response.data.meta?.pagination || {
        totalJobs: response.data.data.length,
        page: 1,
        limit: 10,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false,
      },
    };
  },

  /**
   * Get Farmer Dashboard Jobs & Performance Metrics
   */
  getFarmerDashboardJobs: async (
    params: { page?: number; limit?: number; status?: string } = {}
  ): Promise<{ jobs: JobData[]; stats: FarmerDashboardStats; pagination: PaginationMeta }> => {
    const response = await api.get('/jobs/farmer/my-jobs', { params });
    return {
      jobs: response.data.data,
      stats: response.data.meta?.stats || {
        totalJobs: 0,
        openJobs: 0,
        closedJobs: 0,
        totalApplications: 0,
        totalViews: 0,
        totalSaved: 0,
        featuredJobs: 0,
        applicationsChart: [],
        viewsTrendChart: [],
      },
      pagination: response.data.meta?.pagination || {
        totalJobs: response.data.data.length,
        page: 1,
        limit: 10,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false,
      },
    };
  },

  /**
   * Get Autocomplete Suggestions
   */
  getAutocomplete: async (query: string): Promise<AutocompleteResult> => {
    if (!query || query.trim().length < 2) {
      return { titles: [], crops: [], skills: [], locations: [], farmers: [] };
    }
    const response = await api.get('/jobs/autocomplete', { params: { q: query } });
    return response.data.data;
  },

  /**
   * Fetch single job vacancy details by ID
   */
  getJobById: async (id: string): Promise<JobData> => {
    const response = await api.get(`/jobs/${id}`);
    return response.data.data;
  },

  /**
   * Increment Share Count Metric
   */
  incrementShareCount: async (id: string): Promise<{ success: boolean; shareCount: number }> => {
    const response = await api.post(`/jobs/${id}/share`);
    return response.data.data;
  },

  /**
   * Toggle Save / Bookmark Job (Worker Only)
   */
  toggleSaveJob: async (
    id: string
  ): Promise<{ isSaved: boolean; savedCount: number; message: string }> => {
    const response = await api.post(`/jobs/${id}/save`);
    return response.data.data;
  },

  /**
   * Get Saved Jobs for Worker with Pagination & Search
   */
  getSavedJobs: async (
    params: { page?: number; limit?: number; q?: string } = {}
  ): Promise<{ jobs: JobData[]; pagination: PaginationMeta }> => {
    const response = await api.get('/jobs/saved', { params });
    return {
      jobs: response.data.data,
      pagination: response.data.meta?.pagination || {
        totalJobs: response.data.data.length,
        page: 1,
        limit: 10,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false,
      },
    };
  },

  /**
   * Post a new Job vacancy (Farmer Only)
   */
  createJob: async (jobData: FormData | Partial<JobData>): Promise<JobData> => {
    const isFormData = jobData instanceof FormData;
    const response = await api.post('/jobs', jobData, {
      headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : {},
    });
    return response.data.data;
  },

  /**
   * Edit an existing Job vacancy (Job Owner Only)
   */
  updateJob: async (id: string, jobData: FormData | Partial<JobData>): Promise<JobData> => {
    const isFormData = jobData instanceof FormData;
    const response = await api.put(`/jobs/${id}`, jobData, {
      headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : {},
    });
    return response.data.data;
  },

  /**
   * Soft Delete a Job vacancy (Job Owner or Admin Override)
   */
  deleteJob: async (id: string): Promise<{ success: boolean; message: string }> => {
    const response = await api.delete(`/jobs/${id}`);
    return response.data;
  },

  /**
   * Get Nearby Jobs within specified radius using 2dsphere index
   */
  getNearbyJobs: async (params: {
    latitude: number;
    longitude: number;
    radius?: number;
    page?: number;
    limit?: number;
    sort?: string;
    category?: string;
  }) => {
    const response = await api.get('/location/nearby-jobs', { params });
    return response.data;
  },
};

export interface NearbyJobItem {
  job: JobData & { formattedWage?: string };
  distanceKm: number;
  location: { type: 'Point'; coordinates: [number, number] };
  farmer: {
    _id: string;
    name: string;
    avatar?: string;
    isVerified?: boolean;
    rating?: number;
    totalJobsPosted?: number;
  };
}
