import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { LandingPage } from '../pages/LandingPage';
import * as authService from '../services/authService';
import * as profileService from '../services/profileService';
import { AuthProvider, useAuth } from '../context/AuthContext';

vi.mock('../services/authService');
vi.mock('../services/profileService');

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

// Component to inspect location in test assertions
const LocationTracker = () => {
  const location = useLocation();
  return (
    <div>
      <div data-testid="location-path">{location.pathname}</div>
      <div data-testid="location-state">{JSON.stringify(location.state)}</div>
    </div>
  );
};

// Component to simulate logout button from navbar
const LogoutSimulator = () => {
  const { logout } = useAuth();
  return (
    <button data-testid="logout-btn" onClick={() => logout()}>
      Logout Simulator
    </button>
  );
};

describe('Home Page Role-Based CTA Buttons Suite', () => {
  let queryClient: QueryClient;
  const mockAddToast = vi.fn();

  beforeEach(() => {
    queryClient = createTestQueryClient();
    vi.clearAllMocks();
    localStorage.clear();
    vi.mocked(profileService.getFeaturedWorkersApi).mockResolvedValue([]);
  });

  it('TEST 1 — Logged out: displays BOTH "Hire Farm Workers" and "Find Farm Work" buttons', async () => {
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

    // Wait for auth check to finish
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Hire Farm Workers/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Find Farm Work/i })).toBeInTheDocument();
    });
  });

  it('TEST 2 — Logged in as FARMER: displays ONLY "Hire Farm Workers" and hides "Find Farm Work"', async () => {
    localStorage.setItem('agri_access_token', 'farmer-jwt');
    vi.mocked(authService.getCurrentUserApi).mockResolvedValue({
      status: 'success',
      data: {
        user: {
          _id: 'farmer-1',
          name: 'Farmer John',
          email: 'farmer@agri.com',
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
            </Routes>
          </MemoryRouter>
        </AuthProvider>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Hire Farm Workers/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Find Farm Work/i })).not.toBeInTheDocument();
    });
  });

  it('TEST 2b — Farmer with uppercase/mixed case role (FARMER / Farmer): displays only "Hire Farm Workers"', async () => {
    localStorage.setItem('agri_access_token', 'farmer-jwt');
    vi.mocked(authService.getCurrentUserApi).mockResolvedValue({
      status: 'success',
      data: {
        user: {
          _id: 'farmer-2',
          name: 'Farmer Jane',
          email: 'farmerjane@agri.com',
          role: 'Farmer',
        },
      },
    } as any);

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
      expect(screen.getByRole('button', { name: /Hire Farm Workers/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Find Farm Work/i })).not.toBeInTheDocument();
    });
  });

  it('TEST 3 — Logged in as WORKER: displays ONLY "Find Farm Work" and hides "Hire Farm Workers"', async () => {
    localStorage.setItem('agri_access_token', 'worker-jwt');
    vi.mocked(authService.getCurrentUserApi).mockResolvedValue({
      status: 'success',
      data: {
        user: {
          _id: 'worker-1',
          name: 'Worker Bob',
          email: 'worker@agri.com',
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
            </Routes>
          </MemoryRouter>
        </AuthProvider>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Find Farm Work/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Hire Farm Workers/i })).not.toBeInTheDocument();
    });
  });

  it('TEST 4 — Farmer refresh: after session revalidation on refresh, remains strictly role-based', async () => {
    localStorage.setItem('agri_access_token', 'farmer-refresh-token');
    vi.mocked(authService.getCurrentUserApi).mockResolvedValue({
      status: 'success',
      data: {
        user: {
          _id: 'farmer-refresh-1',
          name: 'Refreshing Farmer',
          email: 'farmer_ref@agri.com',
          role: 'farmer',
        },
      },
    } as any);

    const { rerender } = render(
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
      expect(screen.getByRole('button', { name: /Hire Farm Workers/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Find Farm Work/i })).not.toBeInTheDocument();
    });

    // Simulate page remount/refresh
    rerender(
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
      expect(screen.getByRole('button', { name: /Hire Farm Workers/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Find Farm Work/i })).not.toBeInTheDocument();
    });
  });

  it('TEST 5 — Worker refresh: after session revalidation on refresh, remains strictly role-based', async () => {
    localStorage.setItem('agri_access_token', 'worker-refresh-token');
    vi.mocked(authService.getCurrentUserApi).mockResolvedValue({
      status: 'success',
      data: {
        user: {
          _id: 'worker-refresh-1',
          name: 'Refreshing Worker',
          email: 'worker_ref@agri.com',
          role: 'worker',
        },
      },
    } as any);

    const { rerender } = render(
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
      expect(screen.queryByRole('button', { name: /Hire Farm Workers/i })).not.toBeInTheDocument();
    });

    // Simulate page remount/refresh
    rerender(
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
      expect(screen.queryByRole('button', { name: /Hire Farm Workers/i })).not.toBeInTheDocument();
    });
  });

  it('TEST 6 — Logout: returning to logged out state restores BOTH buttons', async () => {
    localStorage.setItem('agri_access_token', 'active-token');
    vi.mocked(authService.getCurrentUserApi).mockResolvedValue({
      status: 'success',
      data: {
        user: {
          _id: 'farmer-logout-1',
          name: 'Farmer Logging Out',
          email: 'logout_farmer@agri.com',
          role: 'farmer',
        },
      },
    } as any);
    vi.mocked(authService.logoutApi).mockResolvedValue({ status: 'success' } as any);

    render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <MemoryRouter initialEntries={['/']}>
            <LogoutSimulator />
            <Routes>
              <Route path="/" element={<LandingPage addToast={mockAddToast} />} />
            </Routes>
          </MemoryRouter>
        </AuthProvider>
      </QueryClientProvider>
    );

    // First verify only Hire Farm Workers is visible
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Hire Farm Workers/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Find Farm Work/i })).not.toBeInTheDocument();
    });

    // Perform logout
    fireEvent.click(screen.getByTestId('logout-btn'));

    // Verify both buttons become visible
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Hire Farm Workers/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Find Farm Work/i })).toBeInTheDocument();
    });
  });

  it('Navigation: Authenticated FARMER clicking "Hire Farm Workers" goes directly to worker search page without redirecting to login', async () => {
    localStorage.setItem('agri_access_token', 'farmer-jwt');
    vi.mocked(authService.getCurrentUserApi).mockResolvedValue({
      status: 'success',
      data: {
        user: {
          _id: 'farmer-nav-1',
          name: 'Nav Farmer',
          email: 'navfarmer@agri.com',
          role: 'farmer',
        },
      },
    } as any);

    render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <MemoryRouter initialEntries={['/']}>
            <LocationTracker />
            <Routes>
              <Route path="/" element={<LandingPage addToast={mockAddToast} />} />
              <Route path="/farmer/nearby-workers" element={<div>Farmer Nearby Workers Page</div>} />
              <Route path="/login" element={<div>Login Page</div>} />
            </Routes>
          </MemoryRouter>
        </AuthProvider>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Hire Farm Workers/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Hire Farm Workers/i }));

    await waitFor(() => {
      expect(screen.getByText('Farmer Nearby Workers Page')).toBeInTheDocument();
      expect(screen.getByTestId('location-path').textContent).toBe('/farmer/nearby-workers');
      expect(screen.queryByText('Login Page')).not.toBeInTheDocument();
    });
  });

  it('Navigation: Logged out user clicking "Hire Farm Workers" is redirected to /login with destination preserved', async () => {
    vi.mocked(authService.getCurrentUserApi).mockRejectedValue(new Error('No token'));

    render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <MemoryRouter initialEntries={['/']}>
            <LocationTracker />
            <Routes>
              <Route path="/" element={<LandingPage addToast={mockAddToast} />} />
              <Route path="/login" element={<div>Login Page</div>} />
            </Routes>
          </MemoryRouter>
        </AuthProvider>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Hire Farm Workers/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Hire Farm Workers/i }));

    await waitFor(() => {
      expect(screen.getByText('Login Page')).toBeInTheDocument();
      expect(screen.getByTestId('location-path').textContent).toBe('/login');
      const state = JSON.parse(screen.getByTestId('location-state').textContent || '{}');
      expect(state.from).toBe('/farmer/nearby-workers');
    });
  });

  it('Navigation: Authenticated WORKER clicking "Find Farm Work" navigates directly to /jobs without redirecting to login', async () => {
    localStorage.setItem('agri_access_token', 'worker-jwt');
    vi.mocked(authService.getCurrentUserApi).mockResolvedValue({
      status: 'success',
      data: {
        user: {
          _id: 'worker-nav-1',
          name: 'Nav Worker',
          email: 'navworker@agri.com',
          role: 'worker',
        },
      },
    } as any);

    render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <MemoryRouter initialEntries={['/']}>
            <LocationTracker />
            <Routes>
              <Route path="/" element={<LandingPage addToast={mockAddToast} />} />
              <Route path="/jobs" element={<div>Worker Jobs Feed Page</div>} />
              <Route path="/login" element={<div>Login Page</div>} />
            </Routes>
          </MemoryRouter>
        </AuthProvider>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Find Farm Work/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Find Farm Work/i }));

    await waitFor(() => {
      expect(screen.getByText('Worker Jobs Feed Page')).toBeInTheDocument();
      expect(screen.getByTestId('location-path').textContent).toBe('/jobs');
      expect(screen.queryByText('Login Page')).not.toBeInTheDocument();
    });
  });
});
