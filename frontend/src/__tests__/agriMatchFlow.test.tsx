import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LandingPage } from '../pages/LandingPage';
import * as workerService from '../services/workerService';
import * as profileService from '../services/profileService';
import * as analyticsService from '../services/analyticsService';
import * as authService from '../services/authService';
import { AuthProvider } from '../context/AuthContext';
import type { WorkerProfile } from '../types';

vi.mock('../services/workerService', () => ({
  getAgriMatchRecommendationsApi: vi.fn(),
  searchWorkersApi: vi.fn(),
}));

vi.mock('../services/profileService', () => ({
  getFeaturedWorkersApi: vi.fn(),
}));

vi.mock('../services/analyticsService', () => ({
  getHomeStatisticsApi: vi.fn(),
}));

vi.mock('../services/authService', () => ({
  getCurrentUserApi: vi.fn(),
}));

const mockWorker1: WorkerProfile = {
  id: 'w-1',
  _id: 'w-1',
  ownerId: 'u-1',
  name: 'mayur pande',
  title: 'Combine Harvester & Heavy Tractor Operator',
  bio: 'Expert combine harvester operator',
  skills: ['Combine Harvester Operator', 'Tractor Driving'],
  experience: 4,
  experienceYears: 4,
  dailyWage: 650,
  expectedDailyWage: 650,
  monthlySalary: 18000,
  expectedMonthlySalary: 18000,
  hourlyRate: '₹80/hr',
  dailyRate: '₹650/day',
  availability: 'Immediate',
  preferredWorkType: 'Full-Time',
  preferredDistrict: 'Pune District',
  preferredState: 'Maharashtra',
  preferredVillage: '',
  location: 'Pune District, Maharashtra',
  avatar: '',
  profileImage: '',
  profileGallery: [],
  certificateImages: [],
  languages: ['Hindi', 'Marathi'],
  education: '10th Pass',
  rating: 5,
  totalJobsCompleted: 8,
  completedJobs: 8,
  reviewsCount: 8,
  slug: 'mayur-pande',
  aadhaarVerified: true,
  isVerified: true,
};

const mockWorker2: WorkerProfile = {
  id: 'w-2',
  _id: 'w-2',
  ownerId: 'u-2',
  name: 'Mayur Patil',
  title: 'Agricultural Specialist',
  bio: 'Experienced harvester',
  skills: ['Combine Harvester Operator', 'Tractor Driver & Ploughing'],
  experience: 3,
  experienceYears: 3,
  dailyWage: 600,
  expectedDailyWage: 600,
  monthlySalary: 16000,
  expectedMonthlySalary: 16000,
  hourlyRate: '₹75/hr',
  dailyRate: '₹600/day',
  availability: 'Immediate',
  preferredWorkType: 'Full-Time',
  preferredDistrict: 'Maharashtra',
  preferredState: 'India',
  preferredVillage: '',
  location: 'Maharashtra, India',
  avatar: '',
  profileImage: '',
  profileGallery: [],
  certificateImages: [],
  languages: ['Hindi', 'Marathi'],
  education: '10th Pass',
  rating: 5,
  totalJobsCompleted: 5,
  completedJobs: 5,
  reviewsCount: 5,
  slug: 'mayur-patil',
  aadhaarVerified: false,
  isVerified: true,
};

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

describe('AgriMatch AI Frontend Integration Suite', () => {
  let queryClient: QueryClient;
  const mockAddToast = vi.fn();

  beforeEach(() => {
    queryClient = createTestQueryClient();
    vi.clearAllMocks();
    localStorage.clear();
    vi.mocked(authService.getCurrentUserApi).mockRejectedValue(new Error('No token'));
    vi.mocked(profileService.getFeaturedWorkersApi).mockResolvedValue([mockWorker1, mockWorker2]);
    vi.mocked(analyticsService.getHomeStatisticsApi).mockResolvedValue({
      verifiedFarmWorkers: 2,
      activeFarmOwners: 1,
      successfulJobMatches: 3,
      successfulFarmJobsThisMonth: 1,
      averageMatchTimeHours: 2,
      badges: {
        verifiedWorkersBadge: 'Verified',
        activeOwnersBadge: 'Active',
        successfulMatchesBadge: 'Matches',
        averageMatchTimeBadge: 'Fast',
      },
    } as any);
  });

  const renderComponent = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <MemoryRouter initialEntries={['/']}>
            <LandingPage addToast={mockAddToast} />
          </MemoryRouter>
        </AuthProvider>
      </QueryClientProvider>
    );
  };

  it('1. Initially does NOT display static recommendation card before clicking button', () => {
    renderComponent();
    expect(screen.queryByText(/AI Recommendation Generated/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/verified workers near/i)).not.toBeInTheDocument();
  });

  it('2. Clicking "Run AgriMatch AI Engine" calls real API and renders 2 verified workers, NOT 5', async () => {
    vi.mocked(workerService.getAgriMatchRecommendationsApi).mockResolvedValue({
      matchedCount: 2,
      targetCrewSize: 5,
      score: 93,
      estimatedArrival: null,
      crop: 'Wheat Combine Harvesting',
      location: 'Maharashtra, India',
      workers: [mockWorker1, mockWorker2],
    });

    renderComponent();

    const runButton = screen.getByRole('button', { name: /Run AgriMatch AI Engine/i });
    fireEvent.click(runButton);

    await waitFor(() => {
      expect(workerService.getAgriMatchRecommendationsApi).toHaveBeenCalledWith({
        crop: 'Wheat Combine Harvesting',
        location: 'Maharashtra, India',
        targetCrewSize: 5,
      });
    });

    // Verify AI recommendation card is displayed
    await waitFor(() => {
      expect(screen.getByText(/AI Recommendation Generated/i)).toBeInTheDocument();
    });

    // Verify displayed count inside strong is 2 verified workers and NEVER 5
    expect(screen.getByText('2 verified workers')).toBeInTheDocument();
    expect(screen.queryByText(/5 verified workers/i)).not.toBeInTheDocument();

    const resultParagraph = screen.getByText('2 verified workers').closest('p');
    expect(resultParagraph).toHaveTextContent('Found 2 verified workers near Maharashtra, India with proven experience in Wheat Combine Harvesting.');

    // Must NOT have "5 verified workers"
    expect(resultParagraph).not.toHaveTextContent('Found 5 verified workers');

    // Target Crew Size must show 5 Workers while found count shows 2
    expect(screen.getByText('Target Crew Size:')).toBeInTheDocument();
    expect(screen.getByDisplayValue('5 Workers')).toBeInTheDocument();

    // Score must be dynamic (93%), not hardcoded 98.4%
    expect(screen.getByText(/93% Match/i)).toBeInTheDocument();
    expect(screen.queryByText(/98\.4%/i)).not.toBeInTheDocument();

    // No hardcoded 1.5 Hours ETA
    expect(screen.queryByText(/1\.5 Hours/i)).not.toBeInTheDocument();

    // Avatars should show initials for mayur pande and Mayur Patil
    const avatarInitials = screen.getAllByTitle(/mayur/i);
    expect(avatarInitials.length).toBe(2);
  });

  it('3. Renders clean empty state when 0 workers match (no fake fallback to 5 or mock workers)', async () => {
    vi.mocked(workerService.getAgriMatchRecommendationsApi).mockResolvedValue({
      matchedCount: 0,
      targetCrewSize: 5,
      score: 0,
      estimatedArrival: null,
      crop: 'Greenhouse Tomato Pickers',
      location: 'Punjab, India',
      workers: [],
    });

    renderComponent();

    const runButton = screen.getByRole('button', { name: /Run AgriMatch AI Engine/i });
    fireEvent.click(runButton);

    await waitFor(() => {
      expect(screen.getByText(/No matching verified workers found/i)).toBeInTheDocument();
    });

    expect(screen.queryByText(/Found 5/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Found 2/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/98\.4%/i)).not.toBeInTheDocument();
  });
});
