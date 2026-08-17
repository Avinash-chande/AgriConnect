import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { ProtectedRoute } from '../components/common/ProtectedRoute';
import { NAV_ITEMS, AdminSidebar } from '../components/admin/AdminSidebar';
import { AdminLayout } from '../components/admin/AdminLayout';
import { AdminDashboardPage } from '../pages/admin/AdminDashboardPage';
import * as authService from '../services/authService';
import * as adminService from '../services/adminService';
import { AuthProvider } from '../context/AuthContext';

// Mock authService and adminService
vi.mock('../services/authService');
vi.mock('../services/adminService');

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

describe('AgriConnect Admin Authentication & Routing Suite', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createTestQueryClient();
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('1. ProtectedRoute Role Guards', () => {
    it('redirects unauthenticated users to /login', () => {
      vi.mocked(authService.getCurrentUserApi).mockRejectedValue(new Error('No token'));

      render(
        <AuthProvider>
          <MemoryRouter initialEntries={['/admin/dashboard']}>
            <Routes>
              <Route
                path="/admin/dashboard"
                element={
                  <ProtectedRoute allowedRoles={['Admin', 'admin']}>
                    <div>Admin Dashboard Content</div>
                  </ProtectedRoute>
                }
              />
              <Route path="/login" element={<div>Login Page Mock</div>} />
            </Routes>
          </MemoryRouter>
        </AuthProvider>
      );

      expect(screen.getByText(/Login Page Mock/i)).toBeInTheDocument();
    });

    it('blocks farmer/worker user and redirects them to / (home)', async () => {
      localStorage.setItem('agri_access_token', 'test_worker_token');
      vi.mocked(authService.getCurrentUserApi).mockResolvedValue({
        success: true,
        message: 'User found',
        data: {
          user: {
            _id: 'w123',
            name: 'Ramesh Worker',
            fullName: 'Ramesh Worker',
            email: 'ramesh@example.com',
            role: 'worker',
          },
        },
      } as any);

      render(
        <AuthProvider>
          <MemoryRouter initialEntries={['/admin/dashboard']}>
            <Routes>
              <Route
                path="/admin/dashboard"
                element={
                  <ProtectedRoute allowedRoles={['Admin', 'admin']}>
                    <div>Admin Dashboard Content</div>
                  </ProtectedRoute>
                }
              />
              <Route path="/" element={<div>Public Home Page Mock</div>} />
            </Routes>
          </MemoryRouter>
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/Public Home Page Mock/i)).toBeInTheDocument();
      });
      expect(screen.queryByText(/Admin Dashboard Content/i)).not.toBeInTheDocument();
    });

    it('allows Admin user (case-insensitive "Admin" role) to access /admin/dashboard', async () => {
      localStorage.setItem('agri_access_token', 'test_admin_token');
      vi.mocked(authService.getCurrentUserApi).mockResolvedValue({
        success: true,
        message: 'User found',
        data: {
          user: {
            _id: 'a123',
            name: 'Super Admin',
            fullName: 'Super Admin',
            email: 'admin@agriconnect.com',
            role: 'Admin',
          },
        },
      } as any);

      render(
        <AuthProvider>
          <MemoryRouter initialEntries={['/admin/dashboard']}>
            <Routes>
              <Route
                path="/admin/dashboard"
                element={
                  <ProtectedRoute allowedRoles={['Admin', 'admin']}>
                    <div>Admin Dashboard Content</div>
                  </ProtectedRoute>
                }
              />
            </Routes>
          </MemoryRouter>
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/Admin Dashboard Content/i)).toBeInTheDocument();
      });
    });

    it('allows Admin user (lowercase "admin" role) to access /admin/dashboard', async () => {
      localStorage.setItem('agri_access_token', 'test_admin_token');
      vi.mocked(authService.getCurrentUserApi).mockResolvedValue({
        success: true,
        message: 'User found',
        data: {
          user: {
            _id: 'a123',
            name: 'Admin Lowercase',
            fullName: 'Admin Lowercase',
            email: 'admin@agriconnect.com',
            role: 'admin',
          },
        },
      } as any);

      render(
        <AuthProvider>
          <MemoryRouter initialEntries={['/admin/dashboard']}>
            <Routes>
              <Route
                path="/admin/dashboard"
                element={
                  <ProtectedRoute allowedRoles={['Admin', 'admin']}>
                    <div>Admin Dashboard Content</div>
                  </ProtectedRoute>
                }
              />
            </Routes>
          </MemoryRouter>
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/Admin Dashboard Content/i)).toBeInTheDocument();
      });
    });
  });

  describe('2. AdminSidebar & Route Mapping', () => {
    it('contains all 15 required Admin navigation items', () => {
      const expectedPaths = [
        '/admin/dashboard',
        '/admin/users',
        '/admin/jobs',
        '/admin/applications',
        '/admin/trust',
        '/admin/certificates',
        '/admin/aadhaar-kyc',
        '/admin/reports',
        '/admin/payments',
        '/admin/premium',
        '/admin/roles',
        '/admin/settings',
        '/admin/audit-logs',
        '/admin/analytics',
        '/admin/notifications',
      ];

      const actualPaths = NAV_ITEMS.map((item) => item.path);
      expect(actualPaths).toEqual(expectedPaths);
    });

    it('renders all navigation links in AdminSidebar', () => {
      render(
        <MemoryRouter initialEntries={['/admin/dashboard']}>
          <AdminSidebar collapsed={false} onToggleCollapse={() => {}} />
        </MemoryRouter>
      );

      NAV_ITEMS.forEach((item) => {
        expect(screen.getByText(item.label)).toBeInTheDocument();
      });
    });
  });

  describe('3. Admin Layout Header & Session Display', () => {
    it('renders the admin display name and current section title in AdminLayout', async () => {
      localStorage.setItem('agri_access_token', 'test_admin_token');
      vi.mocked(authService.getCurrentUserApi).mockResolvedValue({
        success: true,
        message: 'User found',
        data: {
          user: {
            _id: 'a123',
            name: 'Vikram Admin',
            fullName: 'Vikram Admin',
            email: 'vikram@agriconnect.com',
            role: 'Admin',
          },
        },
      } as any);

      render(
        <AuthProvider>
          <MemoryRouter initialEntries={['/admin/users']}>
            <AdminLayout>
              <div>Users Page Content</div>
            </AdminLayout>
          </MemoryRouter>
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getAllByText(/User Management/i).length).toBeGreaterThanOrEqual(1);
        expect(screen.getByText(/Users Page Content/i)).toBeInTheDocument();
      });
    });
  });

  describe('4. AdminDashboardPage Resiliency', () => {
    it('renders telemetry cards safely when API returns metrics data', async () => {
      localStorage.setItem('agri_access_token', 'test_admin_token');
      vi.mocked(authService.getCurrentUserApi).mockResolvedValue({
        success: true,
        message: 'User found',
        data: {
          user: {
            _id: 'a123',
            name: 'Vikram Admin',
            fullName: 'Vikram Admin',
            email: 'vikram@agriconnect.com',
            role: 'Admin',
          },
        },
      } as any);

      vi.mocked(adminService.getAdminDashboardApi).mockResolvedValue({
        metrics: {
          totalUsers: 1540,
          farmers: 620,
          workers: 920,
          verifiedWorkers: 430,
          trustedWorkers: 210,
          identityVerifiedWorkers: 390,
          premiumUsers: 85,
          totalJobs: 340,
          applications: 1250,
          hires: 410,
          pendingCertificates: 12,
          pendingIdentityVerifications: 8,
          revenue: 145000,
          monthlyRevenue: 28500,
        },
        charts: {
          userGrowth: [],
          trustDistribution: [],
        },
        recentAuditLogs: [],
      });

      render(
        <AuthProvider>
          <QueryClientProvider client={queryClient}>
            <MemoryRouter initialEntries={['/admin/dashboard']}>
              <AdminDashboardPage />
            </MemoryRouter>
          </QueryClientProvider>
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('1,540')).toBeInTheDocument();
        expect(screen.getByText('430')).toBeInTheDocument();
        expect(screen.getByText('390')).toBeInTheDocument();
        expect(screen.getByText('₹1,45,000')).toBeInTheDocument();
      });
    });

    it('renders gracefully with error banner when dashboard API fails without crashing', async () => {
      localStorage.setItem('agri_access_token', 'test_admin_token');
      vi.mocked(authService.getCurrentUserApi).mockResolvedValue({
        success: true,
        message: 'User found',
        data: {
          user: {
            _id: 'a123',
            name: 'Vikram Admin',
            fullName: 'Vikram Admin',
            email: 'admin@agriconnect.com',
            role: 'Admin',
          },
        },
      } as any);

      vi.mocked(adminService.getAdminDashboardApi).mockRejectedValue(
        new Error('Network error connecting to telemetry service')
      );

      render(
        <AuthProvider>
          <QueryClientProvider client={queryClient}>
            <MemoryRouter initialEntries={['/admin/dashboard']}>
              <AdminDashboardPage />
            </MemoryRouter>
          </QueryClientProvider>
        </AuthProvider>
      );

      await waitFor(() => {
        expect(
          screen.getByText(/Failed to fetch real-time dashboard telemetry/i)
        ).toBeInTheDocument();
        expect(screen.getByText(/Retry/i)).toBeInTheDocument();
      });
    });
  });
});
