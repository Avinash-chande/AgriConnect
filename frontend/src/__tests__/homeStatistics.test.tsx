import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { LandingPage } from '../pages/LandingPage';
import * as analyticsService from '../services/analyticsService';
import * as profileService from '../services/profileService';
import * as authService from '../services/authService';
import { AuthProvider } from '../context/AuthContext';

vi.mock('../services/analyticsService');
vi.mock('../services/profileService');
vi.mock('../services/authService');

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

describe('Home Page Dynamic Statistics Cards Suite', () => {
  let queryClient: QueryClient;
  const mockAddToast = vi.fn();

  beforeEach(() => {
    queryClient = createTestQueryClient();
    vi.clearAllMocks();
    localStorage.clear();
    vi.mocked(profileService.getFeaturedWorkersApi).mockResolvedValue([]);
    vi.mocked(authService.getCurrentUserApi).mockRejectedValue(new Error('No token'));
  });

  it('TEST 1: Fetches real statistics from API and renders them in the four cards', async () => {
    vi.mocked(analyticsService.getHomeStatisticsApi).mockResolvedValue({
      verifiedFarmWorkers: 2,
      activeFarmOwners: 2,
      successfulJobMatches: 2,
      successfulFarmJobsThisMonth: 1,
      averageMatchTimeHours: 212.6,
      badges: {
        verifiedWorkersBadge: '100% Verified',
        activeFarmersBadge: '100% Active',
        successfulMatchesBadge: '50% fulfillment',
        averageMatchTimeBadge: 'Direct Dispatch',
      },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <MemoryRouter initialEntries={['/home']}>
            <LandingPage addToast={mockAddToast} />
          </MemoryRouter>
        </AuthProvider>
      </QueryClientProvider>
    );

    // Verify loading skeletons or initial fetch
    expect(analyticsService.getHomeStatisticsApi).toHaveBeenCalled();

    // Wait for the dynamic values to render
    await waitFor(() => {
      // Metric titles
      expect(screen.getByText('Verified Farm Workers')).toBeInTheDocument();
      expect(screen.getByText('Active Farm Owners')).toBeInTheDocument();
      expect(screen.getByText('Successful Job Matches')).toBeInTheDocument();
      expect(screen.getByText('Average Match Time')).toBeInTheDocument();
    });

    // Check rendered real values
    await waitFor(() => {
      expect(screen.getByText('212.6 Hours')).toBeInTheDocument();
      expect(screen.getByText('100% Verified')).toBeInTheDocument();
      expect(screen.getByText('100% Active')).toBeInTheDocument();
      expect(screen.getByText('50% fulfillment')).toBeInTheDocument();
      expect(screen.getByText('Direct Dispatch')).toBeInTheDocument();
      expect(screen.getByText(/1 Farm Job/)).toBeInTheDocument();
      expect(screen.getByText(/successfully matched this month/)).toBeInTheDocument();
    });

    // ABSOLUTE INVARIANT: Old hardcoded marketing numbers must NOT exist anywhere in DOM
    expect(screen.queryByText('45,800+')).not.toBeInTheDocument();
    expect(screen.queryByText('18,400+')).not.toBeInTheDocument();
    expect(screen.queryByText('124,500+')).not.toBeInTheDocument();
    expect(screen.queryByText('< 1.8 Hours')).not.toBeInTheDocument();
    expect(screen.queryByText('+24% this month')).not.toBeInTheDocument();
    expect(screen.queryByText('+18% this month')).not.toBeInTheDocument();
    expect(screen.queryByText('4x faster than traditional agencies')).not.toBeInTheDocument();
    expect(screen.queryByText(/12,400\+/)).not.toBeInTheDocument();
  });

  it('TEST 2: Renders "0" when database counts are zero (no fake fallbacks)', async () => {
    vi.mocked(analyticsService.getHomeStatisticsApi).mockResolvedValue({
      verifiedFarmWorkers: 0,
      activeFarmOwners: 0,
      successfulJobMatches: 0,
      successfulFarmJobsThisMonth: 0,
      averageMatchTimeHours: null,
      badges: {
        verifiedWorkersBadge: '0% Verified',
        activeFarmersBadge: '0% Active',
        successfulMatchesBadge: '0% fulfillment',
        averageMatchTimeBadge: 'Direct Dispatch',
      },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <MemoryRouter initialEntries={['/home']}>
            <LandingPage addToast={mockAddToast} />
          </MemoryRouter>
        </AuthProvider>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Average Match Time')).toBeInTheDocument();
    });

    // Match time should show truthful "—" when null
    expect(screen.getByText('—')).toBeInTheDocument();

    // Banner should show "0 Farm Jobs successfully matched this month"
    expect(screen.getByText(/0 Farm Jobs/)).toBeInTheDocument();

    // ABSOLUTE INVARIANT: Old hardcoded numbers must NOT be used as fallback
    expect(screen.queryByText('45,800+')).not.toBeInTheDocument();
    expect(screen.queryByText('18,400+')).not.toBeInTheDocument();
    expect(screen.queryByText('124,500+')).not.toBeInTheDocument();
    expect(screen.queryByText(/12,400\+/)).not.toBeInTheDocument();
  });
});
