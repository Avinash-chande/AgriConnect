import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { LandingPage } from '../pages/LandingPage';
import * as authService from '../services/authService';
import * as profileService from '../services/profileService';
import * as analyticsService from '../services/analyticsService';
import { AuthProvider, useAuth } from '../context/AuthContext';

vi.mock('../services/authService');
vi.mock('../services/profileService');
vi.mock('../services/analyticsService');

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

const LogoutTrigger = () => {
  const { logout } = useAuth();
  return (
    <button data-testid="logout-trigger" onClick={() => logout()}>
      Trigger Logout
    </button>
  );
};

describe('Landing Page Features Section Visibility Suite', () => {
  let queryClient: QueryClient;
  const mockAddToast = vi.fn();

  beforeEach(() => {
    queryClient = createTestQueryClient();
    vi.clearAllMocks();
    localStorage.clear();
    vi.mocked(profileService.getFeaturedWorkersApi).mockResolvedValue([]);
    vi.mocked(analyticsService.getHomeStatisticsApi).mockResolvedValue({
      verifiedFarmWorkers: 2,
      activeFarmOwners: 2,
      successfulJobMatches: 2,
      successfulFarmJobsThisMonth: 1,
      averageMatchTimeHours: 2,
      badges: {
        verifiedWorkersBadge: '100% Verified',
        activeFarmersBadge: '100% Active',
        successfulMatchesBadge: '50% fulfillment',
        averageMatchTimeBadge: 'Direct Dispatch',
      },
    } as any);
  });

  it('TEST 1 — LOGGED OUT: shows the complete #features section and cards', async () => {
    vi.mocked(authService.getCurrentUserApi).mockRejectedValue(new Error('No token'));

    const { container } = render(
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

    // Section container must be present
    await waitFor(() => {
      expect(container.querySelector('#features')).toBeInTheDocument();
    });

    // Heading and text must be visible
    expect(screen.getByText('Why Choose AgriConnect')).toBeInTheDocument();
    expect(screen.getByText('Built for Modern Agriculture')).toBeInTheDocument();
    expect(screen.getByText('Smart Geolocation & Crop-Skill Matching')).toBeInTheDocument();
    expect(screen.getByText('99.2% Match Accuracy')).toBeInTheDocument();
    expect(screen.getByText('100% Verified Profiles')).toBeInTheDocument();
    expect(screen.getByText('Instant Daily Payouts')).toBeInTheDocument();
    expect(screen.getByText('Flexible Contracting for Every Harvest Season')).toBeInTheDocument();
  });

  it('TEST 2 — FARMER LOGGED IN: #features is completely absent from DOM', async () => {
    vi.mocked(authService.getCurrentUserApi).mockResolvedValue({
      status: 'success',
      data: {
        user: {
          _id: 'f-1',
          name: 'Ramesh Farmer',
          email: 'farmer@agri.com',
          role: 'farmer',
          isVerified: true,
        },
      },
    } as any);

    const { container } = render(
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

    // Wait for auth to resolve
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Hire Farm Workers/i })).toBeInTheDocument();
    });

    // #features section container must NOT exist in DOM
    expect(container.querySelector('#features')).not.toBeInTheDocument();

    // Features headings must NOT exist
    expect(screen.queryByText('Why Choose AgriConnect')).not.toBeInTheDocument();
    expect(screen.queryByText('Built for Modern Agriculture')).not.toBeInTheDocument();
    expect(screen.queryByText('Smart Geolocation & Crop-Skill Matching')).not.toBeInTheDocument();
    expect(screen.queryByText('Flexible Contracting for Every Harvest Season')).not.toBeInTheDocument();
  });

  it('TEST 3 — WORKER LOGGED IN: #features is completely absent from DOM', async () => {
    vi.mocked(authService.getCurrentUserApi).mockResolvedValue({
      status: 'success',
      data: {
        user: {
          _id: 'w-1',
          name: 'Mayur Worker',
          email: 'worker@agri.com',
          role: 'worker',
          isVerified: true,
        },
      },
    } as any);

    const { container } = render(
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
      expect(screen.getByRole('button', { name: /Find Farm Work/i })).toBeInTheDocument();
    });

    // #features section container must NOT exist in DOM
    expect(container.querySelector('#features')).not.toBeInTheDocument();
    expect(screen.queryByText('Built for Modern Agriculture')).not.toBeInTheDocument();
  });

  it('TEST 4 — ADMIN LOGGED IN: #features is completely absent from DOM', async () => {
    vi.mocked(authService.getCurrentUserApi).mockResolvedValue({
      status: 'success',
      data: {
        user: {
          _id: 'a-1',
          name: 'Admin User',
          email: 'admin@agri.com',
          role: 'admin',
          isVerified: true,
        },
      },
    } as any);

    const { container } = render(
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
      expect(authService.getCurrentUserApi).toHaveBeenCalled();
    });

    // #features section container must NOT exist in DOM
    await waitFor(() => {
      expect(container.querySelector('#features')).not.toBeInTheDocument();
    });
    expect(screen.queryByText('Built for Modern Agriculture')).not.toBeInTheDocument();
  });

  it('TEST 5 — REFRESH / AUTH LOADING: #features does not flash while auth is loading', async () => {
    let resolveAuth: (val: any) => void;
    const authPromise = new Promise((resolve) => {
      resolveAuth = resolve;
    });
    vi.mocked(authService.getCurrentUserApi).mockReturnValue(authPromise as any);

    const { container } = render(
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

    // During loading state, #features must NOT be rendered (preventing flash)
    expect(container.querySelector('#features')).not.toBeInTheDocument();
    expect(screen.queryByText('Built for Modern Agriculture')).not.toBeInTheDocument();

    // Resolve as authenticated Farmer
    resolveAuth!({
      status: 'success',
      data: {
        user: {
          _id: 'f-1',
          name: 'Ramesh Farmer',
          role: 'farmer',
          isVerified: true,
        },
      },
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Hire Farm Workers/i })).toBeInTheDocument();
    });

    // Remains hidden after resolution
    expect(container.querySelector('#features')).not.toBeInTheDocument();
    expect(screen.queryByText('Built for Modern Agriculture')).not.toBeInTheDocument();
  });

  it('TEST 6 — LOGOUT: returning to logged out state restores the #features section', async () => {
    vi.mocked(authService.getCurrentUserApi).mockResolvedValue({
      status: 'success',
      data: {
        user: {
          _id: 'f-1',
          name: 'Ramesh Farmer',
          email: 'farmer@agri.com',
          role: 'farmer',
          isVerified: true,
        },
      },
    } as any);

    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <MemoryRouter initialEntries={['/']}>
            <div>
              <LogoutTrigger />
              <Routes>
                <Route path="/" element={<LandingPage addToast={mockAddToast} />} />
              </Routes>
            </div>
          </MemoryRouter>
        </AuthProvider>
      </QueryClientProvider>
    );

    // Initially authenticated: #features is hidden
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Hire Farm Workers/i })).toBeInTheDocument();
    });
    expect(container.querySelector('#features')).not.toBeInTheDocument();

    // Click logout
    const logoutBtn = screen.getByTestId('logout-trigger');
    logoutBtn.click();

    // Now logged out: #features returns to the DOM
    await waitFor(() => {
      expect(container.querySelector('#features')).toBeInTheDocument();
    });
    expect(screen.getByText('Built for Modern Agriculture')).toBeInTheDocument();
  });
});
