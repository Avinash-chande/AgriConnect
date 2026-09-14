import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { LandingPage } from '../pages/LandingPage';
import { WorkerSearchPage } from '../pages/WorkerSearchPage';
import * as workerService from '../services/workerService';
import * as profileService from '../services/profileService';
import * as authService from '../services/authService';
import { AuthProvider } from '../context/AuthContext';
import type { WorkerProfile } from '../types';

vi.mock('../services/workerService');
vi.mock('../services/profileService');
vi.mock('../services/authService');

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

const LocationInspector = () => {
  const location = useLocation();
  return (
    <div>
      <div data-testid="current-path">{location.pathname}</div>
      <div data-testid="current-search">{location.search}</div>
    </div>
  );
};

const sampleWorker: WorkerProfile = {
  id: 'w-test-1',
  _id: 'w-test-1',
  name: 'Ramesh Nagpur',
  avatar: 'https://example.com/avatar.jpg',
  title: 'Expert Tractor Operator',
  rating: 4.9,
  reviewsCount: 15,
  location: 'Nagpur, Maharashtra',
  skills: ['Tractor Driving', 'Heavy Machinery'],
  isVerified: true,
  availability: 'Immediate',
  completedJobs: 12,
  dailyWage: 650,
  expectedDailyWage: 650,
  bio: 'Specialized tractor operator with 5 years experience.',
};

describe('Worker Search Flow Suite (Home -> WorkerSearchPage)', () => {
  let queryClient: QueryClient;
  const mockAddToast = vi.fn();

  beforeEach(() => {
    queryClient = createTestQueryClient();
    vi.clearAllMocks();
    localStorage.clear();
    vi.mocked(profileService.getFeaturedWorkersApi).mockResolvedValue([]);
    vi.mocked(authService.getCurrentUserApi).mockRejectedValue(new Error('No token'));
  });

  it('1. Logged out visitor can search from Home and navigate to /workers without login redirect', async () => {
    vi.mocked(workerService.searchWorkersApi).mockResolvedValue({
      workers: [sampleWorker],
      pagination: { page: 1, limit: 12, total: 1, totalPages: 1 },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <MemoryRouter initialEntries={['/']}>
            <LocationInspector />
            <Routes>
              <Route path="/" element={<LandingPage addToast={mockAddToast} />} />
              <Route path="/workers" element={<WorkerSearchPage addToast={mockAddToast} />} />
              <Route path="/login" element={<div data-testid="login-page">Login Page</div>} />
            </Routes>
          </MemoryRouter>
        </AuthProvider>
      </QueryClientProvider>
    );

    // Verify Home page search bar is present
    const searchInput = screen.getByPlaceholderText(/Skill, crop type/i);
    expect(searchInput).toBeInTheDocument();

    // Type keyword "tractor"
    fireEvent.change(searchInput, { target: { value: 'tractor' } });

    // Click "Search Workers"
    const searchButton = screen.getByRole('button', { name: /Search Workers/i });
    fireEvent.click(searchButton);

    // Verify it navigated to /workers with search query parameter and NOT to /login
    await waitFor(() => {
      expect(screen.getByTestId('current-path')).toHaveTextContent('/workers');
      expect(screen.getByTestId('current-search')).toHaveTextContent('search=tractor');
    });

    // Ensure login page is NOT rendered
    expect(screen.queryByTestId('login-page')).not.toBeInTheDocument();
  });

  it('2. WorkerSearchPage reads URL query parameters and displays matching workers', async () => {
    vi.mocked(workerService.searchWorkersApi).mockResolvedValue({
      workers: [sampleWorker],
      pagination: { page: 1, limit: 12, total: 1, totalPages: 1 },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <MemoryRouter initialEntries={['/workers?search=tractor&location=Nagpur%2C+Maharashtra&category=Heavy+Machinery']}>
            <Routes>
              <Route path="/workers" element={<WorkerSearchPage addToast={mockAddToast} />} />
            </Routes>
          </MemoryRouter>
        </AuthProvider>
      </QueryClientProvider>
    );

    // Expect searchWorkersApi to have been called with parameters from URL
    await waitFor(() => {
      expect(workerService.searchWorkersApi).toHaveBeenCalledWith({
        search: 'tractor',
        location: 'Nagpur, Maharashtra',
        category: 'Heavy Machinery',
        page: 1,
        limit: 12,
      });
    });

    // Expect worker card to be rendered with real data
    await waitFor(() => {
      expect(screen.getByText('Ramesh Nagpur')).toBeInTheDocument();
      expect(screen.getByText('Expert Tractor Operator')).toBeInTheDocument();
      expect(screen.getByText(/₹650/)).toBeInTheDocument();
    });
  });

  it('3. Displays empty state when no workers match without throwing errors', async () => {
    vi.mocked(workerService.searchWorkersApi).mockResolvedValue({
      workers: [],
      pagination: { page: 1, limit: 12, total: 0, totalPages: 1 },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <MemoryRouter initialEntries={['/workers?search=nonexistent']}>
            <Routes>
              <Route path="/workers" element={<WorkerSearchPage addToast={mockAddToast} />} />
            </Routes>
          </MemoryRouter>
        </AuthProvider>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/No Workers Found/i)).toBeInTheDocument();
    });
  });
});
