/**
 * AgriConnect Real Mobile Telephony Calling Flow Unit & Integration Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LandingPage } from '../pages/LandingPage';
import { useAuth } from '../context/AuthContext';
import { getFeaturedWorkersApi } from '../services/profileService';
import api from '../services/api';
import { initiateMobileCall, getCallHistory } from '../services/callService';
import type { WorkerProfile } from '../types';

vi.mock('../context/AuthContext');
vi.mock('../services/profileService');
vi.mock('../services/chatService', () => ({
  checkChatEligibility: vi.fn().mockResolvedValue({ isEligible: true }),
}));

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

const mockWorker: WorkerProfile = {
  id: 'worker-profile-101',
  _id: 'worker-profile-101',
  ownerId: 'worker-user-202',
  name: 'Mayur Pande',
  title: 'Senior Harvester Operator',
  avatar: 'https://images.unsplash.com/photo-1595152772835-219674b2a8a6',
  profileImage: 'https://images.unsplash.com/photo-1595152772835-219674b2a8a6',
  rating: 4.9,
  reviewsCount: 28,
  skills: ['Combine Harvester', 'Tractor Driving', 'Soil Tillage'],
  location: 'Amritsar, Punjab',
  dailyWage: 750,
  expectedDailyWage: 750,
  experience: 5,
  experienceYears: 5,
  completedJobs: 42,
  isVerified: true,
  bio: 'Experienced machinery operator specialized in wheat & paddy crops.',
};

describe('AgriConnect Real Mobile Telephony Calling Feature Suite', () => {
  const mockAddToast = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (getFeaturedWorkersApi as any).mockResolvedValue([mockWorker]);
  });

  const renderWithProviders = (ui: React.ReactElement) => {
    const queryClient = createTestQueryClient();
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>{ui}</MemoryRouter>
      </QueryClientProvider>
    );
  };

  describe('1. Hire Modal Actions & Phone Calling Button UI', () => {
    it('renders exactly 3 actions in the Worker Hire Modal: [ Cancel ], [ Call ], [ Confirm Hire ]', async () => {
      (useAuth as any).mockReturnValue({
        user: { _id: 'farmer-1', fullName: 'Harpreet Singh', role: 'farmer' },
        isAuthenticated: true,
      });

      renderWithProviders(<LandingPage addToast={mockAddToast} />);

      // Wait for worker card
      await waitFor(() => {
        expect(screen.getByText('Mayur Pande')).toBeInTheDocument();
      });

      // Open worker modal
      const quickHireButtons = screen.getAllByRole('button', { name: /quick hire/i });
      fireEvent.click(quickHireButtons[0]);

      // Verify Modal Title
      expect(screen.getByText(/Hire Mayur Pande/i)).toBeInTheDocument();

      // Verify the 3 bottom action buttons
      const cancelButton = screen.getByRole('button', { name: /^Cancel$/i });
      const callButton = screen.getByRole('button', { name: /^Call$/i });
      const confirmHireButton = screen.getByRole('button', { name: /^Confirm Hire$/i });

      expect(cancelButton).toBeInTheDocument();
      expect(callButton).toBeInTheDocument();
      expect(confirmHireButton).toBeInTheDocument();
    });

    it('redirects unauthenticated user to /login when clicking "Call"', async () => {
      (useAuth as any).mockReturnValue({
        user: null,
        isAuthenticated: false,
      });

      renderWithProviders(<LandingPage addToast={mockAddToast} />);

      await waitFor(() => {
        expect(screen.getByText('Mayur Pande')).toBeInTheDocument();
      });

      // Open worker modal
      const quickHireButtons = screen.getAllByRole('button', { name: /quick hire/i });
      fireEvent.click(quickHireButtons[0]);

      // Click Call
      const callButton = screen.getByRole('button', { name: /^Call$/i });
      fireEvent.click(callButton);

      // Verify Toast notification
      expect(mockAddToast).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'info',
          title: 'Sign In Required',
          message: expect.stringContaining('sign in as a Farmer to call Mayur Pande'),
        })
      );
    });

    it('authenticated Farmer clicking "Call" initiates mobile phone call API and displays success toast', async () => {
      (useAuth as any).mockReturnValue({
        user: { _id: 'farmer-1', fullName: 'Harpreet Singh', role: 'farmer' },
        isAuthenticated: true,
      });

      const apiSpy = vi.spyOn(api, 'post').mockResolvedValue({
        data: {
          success: true,
          message: 'Call initiated successfully',
          data: {
            callId: 'call-mongo-id-123',
            status: 'initiated',
            createdAt: new Date().toISOString(),
          },
        },
      });

      renderWithProviders(<LandingPage addToast={mockAddToast} />);

      await waitFor(() => {
        expect(screen.getByText('Mayur Pande')).toBeInTheDocument();
      });

      // Open modal
      const quickHireButtons = screen.getAllByRole('button', { name: /quick hire/i });
      fireEvent.click(quickHireButtons[0]);

      // Click Call
      const callButton = screen.getByRole('button', { name: /^Call$/i });
      fireEvent.click(callButton);

      // Verify API was called with route-relative /calls/mobile and worker ID
      await waitFor(() => {
        expect(apiSpy).toHaveBeenCalledWith('/calls/mobile', { workerId: 'worker-profile-101' });
      });

      // Verify Success Toast
      await waitFor(() => {
        expect(mockAddToast).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'success',
            title: 'Call Initiated',
          })
        );
      });

      apiSpy.mockRestore();
    });

    it('handles worker mobile not verified error and shows user-friendly message', async () => {
      (useAuth as any).mockReturnValue({
        user: { _id: 'farmer-1', fullName: 'Harpreet Singh', role: 'farmer' },
        isAuthenticated: true,
      });

      const err: any = new Error('Worker mobile number is not verified.');
      err.response = { data: { message: 'Worker mobile number is not verified.' }, status: 400 };
      const apiSpy = vi.spyOn(api, 'post').mockRejectedValue(err);

      renderWithProviders(<LandingPage addToast={mockAddToast} />);

      await waitFor(() => {
        expect(screen.getByText('Mayur Pande')).toBeInTheDocument();
      });

      // Open modal
      const quickHireButtons = screen.getAllByRole('button', { name: /quick hire/i });
      fireEvent.click(quickHireButtons[0]);

      // Click Call
      const callButton = screen.getByRole('button', { name: /^Call$/i });
      fireEvent.click(callButton);

      await waitFor(() => {
        expect(mockAddToast).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'error',
            title: 'Calling Failed',
            message: 'Worker mobile number is not verified.',
          })
        );
      });

      apiSpy.mockRestore();
    });

    it('handles unconfigured telephony provider error with clear message', async () => {
      (useAuth as any).mockReturnValue({
        user: { _id: 'farmer-1', fullName: 'Harpreet Singh', role: 'farmer' },
        isAuthenticated: true,
      });

      const err: any = new Error('Mobile calling is not configured yet. Please configure the call provider.');
      err.response = { data: { message: 'Mobile calling is not configured yet. Please configure the call provider.' }, status: 503 };
      const apiSpy = vi.spyOn(api, 'post').mockRejectedValue(err);

      renderWithProviders(<LandingPage addToast={mockAddToast} />);

      await waitFor(() => {
        expect(screen.getByText('Mayur Pande')).toBeInTheDocument();
      });

      // Open modal
      const quickHireButtons = screen.getAllByRole('button', { name: /quick hire/i });
      fireEvent.click(quickHireButtons[0]);

      // Click Call
      const callButton = screen.getByRole('button', { name: /^Call$/i });
      fireEvent.click(callButton);

      await waitFor(() => {
        expect(mockAddToast).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'error',
            title: 'Calling Failed',
            message: 'Mobile calling is not configured yet. Please configure the call provider.',
          })
        );
      });

      apiSpy.mockRestore();
    });
  });

  describe('2. Endpoint Path Normalization & No Double /api/v1 Prefix', () => {
    it('verifies callService uses route-relative /calls/mobile without double prefix', async () => {
      const postSpy = vi.spyOn(api, 'post').mockResolvedValue({
        data: {
          success: true,
          message: 'Call initiated',
          data: { callId: 'call-1', status: 'initiated', createdAt: new Date().toISOString() },
        },
      });

      await initiateMobileCall('worker-123');

      expect(postSpy).toHaveBeenCalledWith('/calls/mobile', { workerId: 'worker-123' });
      expect(postSpy).not.toHaveBeenCalledWith(expect.stringContaining('/api/v1/calls/mobile'), expect.anything());

      postSpy.mockRestore();
    });

    it('verifies callService uses route-relative /calls/history', async () => {
      const getSpy = vi.spyOn(api, 'get').mockResolvedValue({
        data: {
          success: true,
          data: [],
        },
      });

      await getCallHistory();

      expect(getSpy).toHaveBeenCalledWith('/calls/history');
      expect(getSpy).not.toHaveBeenCalledWith(expect.stringContaining('/api/v1/calls/history'));

      getSpy.mockRestore();
    });
  });
});
