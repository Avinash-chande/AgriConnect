export type UserRole = 'farmer' | 'worker';

export interface WorkerProfile {
  id: string;
  _id?: string;
  ownerId?: string;
  name: string;
  avatar: string;
  profileImage?: string;
  title: string;
  rating: number;
  reviewsCount: number;
  location: string;
  hourlyRate?: string;
  dailyRate?: string;
  dailyWage?: number;
  expectedDailyWage?: number;
  expectedMonthlySalary?: number;
  skills: string[];
  experienceYears?: number;
  experience?: number;
  languages?: string[];
  education?: string;
  isVerified: boolean;
  aadhaarVerified?: boolean;
  availability: 'Immediate' | 'Within 3 Days' | 'Seasonal' | 'Unavailable' | string;
  completedJobs: number;
  totalJobsCompleted?: number;
  badge?: string;
  bio: string;
  profileGallery?: string[];
  certificateImages?: string[];
  preferredDistrict?: string;
  preferredState?: string;
  preferredVillage?: string;
  slug?: string;
}

export interface JobCategory {
  id: string;
  title: string;
  iconName: string;
  description: string;
  activeJobsCount: number;
  popularSkills: string[];
  bgGradient: string;
}

export interface Testimonial {
  id: string;
  name: string;
  role: 'Farmer' | 'Worker';
  farmOrLocation: string;
  avatar: string;
  content: string;
  rating: number;
  verifiedBadge: string;
}

export interface StatisticsMetric {
  label: string;
  value: string;
  change: string;
  isPositive: boolean;
  description: string;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message?: string;
}

export interface AIMatchRequest {
  cropType: string;
  location: string;
  urgency: string;
  workersNeeded: number;
  skillsRequired: string[];
}

export interface AIMatchResult {
  confidenceScore: number;
  estimatedArrival: string;
  recommendedWorkers: WorkerProfile[];
  reasoning: string[];
}
