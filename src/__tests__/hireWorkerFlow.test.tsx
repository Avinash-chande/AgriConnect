import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { LandingPage } from '../pages/LandingPage';
import { LoginPage } from '../pages/LoginPage';
import * as authService from '../services/authService';
import * as chatService from '../services/chatService';
import * as profileService from '../services/profileService';
import { AuthProvider } from '../context/AuthContext';
import type { WorkerProfile } from '../types';

vi.mock('../services/authService');
vi.mock('../services/chatService');
vi.mock('../services/profileService');

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

// Component to inspect location state in test assertions
const LocationDisplay = () => {
  const location = useLocation();
  return (
    <div>
      <div data-testid="location-pathname">{location.pathname}</div>
      <div data-testid="location-state">{JSON.stringify(location.state)}</div>
    </div>
  );
};

const sampleWorkers: WorkerProfile[] = [
  {
    id: 'worker-mongo-1',
    _id: 'worker-mongo-1',
    ownerId: 'user-mongo-1',
    name: 'Ramesh Patel',
    title: 'Senior Harvester Specialist',
    bio: '8+ years of expertise in large-scale harvesting.',
    skills: ['Combine Operator', 'Wheat Harvesting'],
    experience: 8,
    experienceYears: 8,
    dailyWage: 750,
    expectedDailyWage: 750,
    hourlyRate: '₹94/hr',
    dailyRate: '₹750/day',
    rating: 4.9,
    reviewsCount: 24,
    completedJobs: 24,
    totalJobsCompleted: 24,
    location: 'Punjab, India',
    avatar: 'https://images.example.com/ramesh.jpg',
    profileImage: 'https://images.example.com/ramesh.jpg',
    isVerified: true,
    aadhaarVerified: true,
    availability: 'Immediate',
    badge: 'Top Rated Harvester',
  },
  {
    id: 'worker-mongo-2',
    _id: 'worker-mongo-2',
    ownerId: 'user-mongo-2',
    name: 'Sunil Verma',
    title: 'Tractor Driver',
    bio: 'Experienced tractor driver.',
    skills: ['Tractor Driving'],
    experience: 4,
    experienceYears: 4,
    dailyWage: 500,
    expectedDailyWage: 500,
    hourlyRate: '₹62/hr',
    dailyRate: '₹500/day',
    rating: 4.6,
    reviewsCount: 12,
    completedJobs: 12,
    totalJobsCompleted: 12,
    location: 'Haryana, India',
    avatar: '',
    profileImage: '',
    isVerified: false,
    aadhaarVerified: false,
    availability: 'Immediate',
  },
];

describe('AgriConnect Worker Hiring & Real Worker Integration Suite', () => {
  let queryClient: QueryClient;
  const mockAddToast = vi.fn();

  beforeEach(() => {
    queryClient = createTestQueryClient();
    vi.clearAllMocks();
    localStorage.clear();
    vi.mocked(chatService.checkChatEligibility).mockResolvedValue({ canChat: false } as any);
    vi.mocked(profileService.getFeaturedWorkersApi).mockResolvedValue(sampleWorkers);
  });

  describe('Real Workers Rendering on LandingPage', () => {
    it('fetches and displays real registered workers from MongoDB API', async () => {
      vi.mocked(authService.getCurrentUserApi).mockRejectedValue(new Error('No token'));

      render(
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <MemoryRouter initialEntries={['/']}>
              <Routes>
                <Route path="/" element={<LandingPage addToast={mockAddToast} />} />
              </Routes>
            </MemoryRouter>
          </AuthProvider>
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(profileService.getFeaturedWorkersApi).toHaveBeenCalledWith(6);
        expect(screen.getByText('Ramesh Patel')).toBeInTheDocument();
        expect(screen.getByText('Senior Harvester Specialist')).toBeInTheDocument();
        expect(screen.getByText('₹750')).toBeInTheDocument();
        expect(screen.getByText('Sunil Verma')).toBeInTheDocument();
      });
    });

    it('displays empty state when no registered workers are returned', async () => {
      vi.mocked(authService.getCurrentUserApi).mockRejectedValue(new Error('No token'));
      vi.mocked(profileService.getFeaturedWorkersApi).mockResolvedValue([]);

      render(
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <MemoryRouter initialEntries={['/']}>
              <Routes>
                <Route path="/" element={<LandingPage addToast={mockAddToast} />} />
              </Routes>
            </MemoryRouter>
          </AuthProvider>
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('No verified workers available yet.')).toBeInTheDocument();
      });
    });

    it('displays error state with retry button when API fails', async () => {
      vi.mocked(authService.getCurrentUserApi).mockRejectedValue(new Error('No token'));
      vi.mocked(profileService.getFeaturedWorkersApi).mockRejectedValue(new Error('Network error'));

      render(
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <MemoryRouter initialEntries={['/']}>
              <Routes>
                <Route path="/" element={<LandingPage addToast={mockAddToast} />} />
              </Routes>
            </MemoryRouter>
          </AuthProvider>
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Unable to load verified workers')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
      });
    });
  });

  describe('LandingPage "Confirm Hire" Behavior', () => {
    it('Case 1: Redirects unauthenticated user to /login with preserved worker state and toast', async () => {
      vi.mocked(authService.getCurrentUserApi).mockRejectedValue(new Error('No token'));

      render(
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <MemoryRouter initialEntries={['/']}>
              <Routes>
                <Route path="/" element={<LandingPage addToast={mockAddToast} />} />
                <Route
                  path="/login"
                  element={
                    <div>
                      <div>Login Page</div>
                      <LocationDisplay />
                    </div>
                  }
                />
              </Routes>
            </MemoryRouter>
          </AuthProvider>
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Ramesh Patel')).toBeInTheDocument();
      });

      // Open worker modal by clicking "Quick Hire"
      const quickHireButtons = screen.getAllByRole('button', { name: /quick hire/i });
      expect(quickHireButtons.length).toBeGreaterThan(0);
      fireEvent.click(quickHireButtons[0]);

      // Verify modal is open with real worker details
      expect(screen.getByText(/Hire Ramesh Patel/i)).toBeInTheDocument();
      const confirmHireBtn = screen.getByRole('button', { name: /confirm hire/i });
      expect(confirmHireBtn).toBeInTheDocument();

      // Click "Confirm Hire"
      fireEvent.click(confirmHireBtn);

      // Should navigate to /login
      expect(screen.getByText('Login Page')).toBeInTheDocument();
      expect(screen.getByTestId('location-pathname').textContent).toBe('/login');

      // Should preserve state
      const state = JSON.parse(screen.getByTestId('location-state').textContent || '{}');
      expect(state.from).toBe('/farmer/applications');
      expect(state.action).toBe('hire-worker');
      expect(state.workerName).toBe('Ramesh Patel');
      expect(state.workerId).toBe('worker-mongo-1');

      // Should show info toast
      expect(mockAddToast).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'info',
          title: 'Sign In Required',
          message: expect.stringContaining('Please sign in to continue hiring Ramesh Patel'),
        })
      );
    });

    it('Case 2: Authenticated Farmer is redirected to /farmer/applications with success toast without opening /login', async () => {
      localStorage.setItem('agri_access_token', 'farmer-mock-jwt');
      vi.mocked(authService.getCurrentUserApi).mockResolvedValue({
        status: 'success',
        data: {
          user: {
            _id: 'farmer-123',
            name: 'Gurpreet Singh',
            fullName: 'Gurpreet Singh',
            email: 'farmer@example.com',
            role: 'farmer',
          },
        },
      } as any);

      render(
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <MemoryRouter initialEntries={['/']}>
              <Routes>
                <Route path="/" element={<LandingPage addToast={mockAddToast} />} />
                <Route path="/farmer/applications" element={<div>Farmer Applications Page</div>} />
                <Route path="/login" element={<div>Login Page</div>} />
              </Routes>
            </MemoryRouter>
          </AuthProvider>
        </QueryClientProvider>
      );

      // Wait for session check and real worker data
      await waitFor(() => {
        expect(authService.getCurrentUserApi).toHaveBeenCalled();
        expect(screen.getByText('Ramesh Patel')).toBeInTheDocument();
      });

      // Open worker modal
      const quickHireButtons = screen.getAllByRole('button', { name: /quick hire/i });
      fireEvent.click(quickHireButtons[0]);

      const confirmHireBtn = screen.getByRole('button', { name: /confirm hire/i });
      fireEvent.click(confirmHireBtn);

      // Should navigate to /farmer/applications, NOT /login
      expect(screen.getByText('Farmer Applications Page')).toBeInTheDocument();
      expect(screen.queryByText('Login Page')).not.toBeInTheDocument();

      // Should show success toast
      expect(mockAddToast).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'success',
          title: 'Continue Hiring',
          message: expect.stringContaining('You are signed in as a Farmer. Continue hiring Ramesh Patel'),
        })
      );
    });

    it('Case 3: Logged in Worker is prevented from hiring and receives an error toast', async () => {
      localStorage.setItem('agri_access_token', 'worker-mock-jwt');
      vi.mocked(authService.getCurrentUserApi).mockResolvedValue({
        status: 'success',
        data: {
          user: {
            _id: 'worker-456',
            name: 'Ramesh Kumar',
            fullName: 'Ramesh Kumar',
            email: 'worker@example.com',
            role: 'worker',
          },
        },
      } as any);

      render(
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <MemoryRouter initialEntries={['/']}>
              <Routes>
                <Route path="/" element={<LandingPage addToast={mockAddToast} />} />
                <Route path="/farmer/applications" element={<div>Farmer Applications Page</div>} />
                <Route path="/login" element={<div>Login Page</div>} />
              </Routes>
            </MemoryRouter>
          </AuthProvider>
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(authService.getCurrentUserApi).toHaveBeenCalled();
        expect(screen.getByText('Ramesh Patel')).toBeInTheDocument();
      });

      // Open worker modal
      const quickHireButtons = screen.getAllByRole('button', { name: /quick hire/i });
      fireEvent.click(quickHireButtons[0]);

      const confirmHireBtn = screen.getByRole('button', { name: /confirm hire/i });
      fireEvent.click(confirmHireBtn);

      // Should NOT navigate to /farmer/applications or /login
      expect(screen.queryByText('Farmer Applications Page')).not.toBeInTheDocument();
      expect(screen.queryByText('Login Page')).not.toBeInTheDocument();

      // Should show error toast
      expect(mockAddToast).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error',
          title: 'Farmer Access Required',
          message: 'Only Farmers can hire agricultural workers.',
        })
      );
    });

    it('Case 4: Logged in Admin is prevented from entering Farmer hiring flow', async () => {
      localStorage.setItem('agri_access_token', 'admin-mock-jwt');
      vi.mocked(authService.getCurrentUserApi).mockResolvedValue({
        status: 'success',
        data: {
          user: {
            _id: 'admin-789',
            name: 'Platform Admin',
            fullName: 'Platform Admin',
            email: 'admin@agriconnect.com',
            role: 'admin',
          },
        },
      } as any);

      render(
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <MemoryRouter initialEntries={['/']}>
              <Routes>
                <Route path="/" element={<LandingPage addToast={mockAddToast} />} />
                <Route path="/farmer/applications" element={<div>Farmer Applications Page</div>} />
                <Route path="/login" element={<div>Login Page</div>} />
              </Routes>
            </MemoryRouter>
          </AuthProvider>
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(authService.getCurrentUserApi).toHaveBeenCalled();
        expect(screen.getByText('Ramesh Patel')).toBeInTheDocument();
      });

      // Open worker modal
      const quickHireButtons = screen.getAllByRole('button', { name: /quick hire/i });
      fireEvent.click(quickHireButtons[0]);

      const confirmHireBtn = screen.getByRole('button', { name: /confirm hire/i });
      fireEvent.click(confirmHireBtn);

      // Should NOT navigate to /farmer/applications
      expect(screen.queryByText('Farmer Applications Page')).not.toBeInTheDocument();

      // Should show admin info toast
      expect(mockAddToast).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'info',
          title: 'Admin Access',
          message: 'Admin accounts cannot hire workers directly.',
        })
      );
    });
  });

  describe('LoginPage Return Flow for hire-worker Action', () => {
    it('Farmer logging in with hire-worker action continues to /farmer/applications', async () => {
      vi.mocked(authService.loginApi).mockResolvedValue({
        status: 'success',
        data: {
          user: {
            _id: 'farmer-101',
            fullName: 'Harpreet Singh',
            email: 'harpreet@farm.com',
            role: 'farmer',
          },
          tokens: { accessToken: 'farmer-token-abc' },
        },
      } as any);

      render(
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <MemoryRouter
              initialEntries={[
                {
                  pathname: '/login',
                  state: {
                    from: '/farmer/applications',
                    action: 'hire-worker',
                    workerId: 'w-1',
                    workerName: 'Rajesh Kumar',
                  },
                },
              ]}
            >
              <Routes>
                <Route path="/login" element={<LoginPage addToast={mockAddToast} />} />
                <Route
                  path="/farmer/applications"
                  element={
                    <div>
                      <div>Farmer Applications Portal</div>
                      <LocationDisplay />
                    </div>
                  }
                />
              </Routes>
            </MemoryRouter>
          </AuthProvider>
        </QueryClientProvider>
      );

      // Fill in credentials and submit
      const emailInput = screen.getByLabelText(/Email Address/i);
      const passwordInput = screen.getByPlaceholderText(/••••••••••••/i);
      const submitBtn = screen.getByRole('button', { name: /Sign In as Farmer/i });

      fireEvent.change(emailInput, { target: { value: 'harpreet@farm.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByText('Farmer Applications Portal')).toBeInTheDocument();
      });

      expect(screen.getByTestId('location-pathname').textContent).toBe('/farmer/applications');
      const state = JSON.parse(screen.getByTestId('location-state').textContent || '{}');
      expect(state.action).toBe('hire-worker');
      expect(state.workerName).toBe('Rajesh Kumar');
    });

    it('Worker logging in when action is hire-worker is redirected to /worker/dashboard with warning toast', async () => {
      vi.mocked(authService.loginApi).mockResolvedValue({
        status: 'success',
        data: {
          user: {
            _id: 'worker-202',
            fullName: 'Suresh Patel',
            email: 'suresh@workers.com',
            role: 'worker',
          },
          tokens: { accessToken: 'worker-token-xyz' },
        },
      } as any);

      render(
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <MemoryRouter
              initialEntries={[
                {
                  pathname: '/login',
                  state: {
                    from: '/farmer/applications',
                    action: 'hire-worker',
                    workerId: 'w-1',
                    workerName: 'Rajesh Kumar',
                  },
                },
              ]}
            >
              <Routes>
                <Route path="/login" element={<LoginPage addToast={mockAddToast} />} />
                <Route path="/worker/dashboard" element={<div>Worker Dashboard Portal</div>} />
                <Route path="/farmer/applications" element={<div>Farmer Applications Portal</div>} />
              </Routes>
            </MemoryRouter>
          </AuthProvider>
        </QueryClientProvider>
      );

      // Switch to Worker tab
      const workerTab = screen.getByRole('button', { name: /I am a Worker/i });
      fireEvent.click(workerTab);

      const emailInput = screen.getByLabelText(/Email Address/i);
      const passwordInput = screen.getByPlaceholderText(/••••••••••••/i);
      const submitBtn = screen.getByRole('button', { name: /Sign In as Agricultural Worker/i });

      fireEvent.change(emailInput, { target: { value: 'suresh@workers.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByText('Worker Dashboard Portal')).toBeInTheDocument();
      });

      expect(screen.queryByText('Farmer Applications Portal')).not.toBeInTheDocument();
      expect(mockAddToast).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error',
          title: 'Farmer Access Required',
          message: 'You logged in as a Worker. Only Farmers can hire workers.',
        })
      );
    });
  });
});
