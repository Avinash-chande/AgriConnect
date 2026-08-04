export type UserRole = 'farmer' | 'worker';

export interface WorkerProfile {
  id: string;
  name: string;
  avatar: string;
  title: string;
  rating: number;
  reviewsCount: number;
  location: string;
  hourlyRate: string;
  dailyRate: string;
  skills: string[];
  experienceYears: number;
  languages: string[];
  isVerified: boolean;
  availability: 'Immediate' | 'Within 3 Days' | 'Seasonal';
  completedJobs: number;
  badge?: string;
  bio: string;
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
