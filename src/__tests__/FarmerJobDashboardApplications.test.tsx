import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { FarmerJobDashboardPage } from '../pages/FarmerJobDashboardPage';
import { jobService } from '../services/jobService';

vi.mock('../services/jobService', () => ({
  jobService: {
    getFarmerDashboardJobs: vi.fn(),
    deleteJob: vi.fn(),
  },
}));

describe('FarmerJobDashboardPage - Real Application Counts & Pluralization', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders exact application counts with correct pluralization for 0, 1, and N applicants', async () => {
    vi.mocked(jobService.getFarmerDashboardJobs).mockResolvedValue({
      jobs: [
        {
          _id: 'job-1',
          title: 'Vegetable Farm Worker',
          description: 'Vegetable farm tasks',
          category: 'Harvesting',
          workType: 'Daily Basis',
          numberOfWorkers: 3,
          wageType: 'Daily',
          dailyWage: 600,
          startDate: '2026-09-01',
          status: 'Active',
          jobAddress: { district: 'Ludhiana', state: 'Punjab' },
          requiredSkills: ['Harvesting'],
          applicationCount: 0,
          totalApplications: 0,
          totalViews: 45,
        },
        {
          _id: 'job-2',
          title: 'Wheat Harvesting Specialist',
          description: 'Wheat harvesting operations',
          category: 'Harvesting',
          workType: 'Daily Basis',
          numberOfWorkers: 5,
          wageType: 'Daily',
          dailyWage: 750,
          startDate: '2026-09-01',
          status: 'Active',
          jobAddress: { district: 'Ludhiana', state: 'Punjab' },
          requiredSkills: ['Harvesting'],
          applicationCount: 1,
          totalApplications: 1,
          totalViews: 80,
        },
        {
          _id: 'job-3',
          title: 'Tractor Driver for Plowing',
          description: 'Field plowing',
          category: 'Plowing / Tillage',
          workType: 'Daily Basis',
          numberOfWorkers: 2,
          wageType: 'Daily',
          dailyWage: 900,
          startDate: '2026-09-01',
          status: 'Active',
          jobAddress: { district: 'Ludhiana', state: 'Punjab' },
          requiredSkills: ['Tractor Driving'],
          applicationCount: 5,
          totalApplications: 5,
          totalViews: 120,
        },
      ],
      stats: {
        totalJobs: 3,
        openJobs: 3,
        closedJobs: 0,
        totalApplications: 6,
        totalViews: 245,
        totalSaved: 10,
        featuredJobs: 0,
        applicationsChart: [
          { title: 'Vegetable Farm Worker', applications: 0 },
          { title: 'Wheat Harvesting Specialist', applications: 1 },
          { title: 'Tractor Driver for Plowing', applications: 5 },
        ],
        viewsTrendChart: [
          { day: 'Mon', views: 10 },
          { day: 'Tue', views: 20 },
          { day: 'Wed', views: 15 },
          { day: 'Thu', views: 25 },
          { day: 'Fri', views: 30 },
          { day: 'Sat', views: 18 },
          { day: 'Sun', views: 22 },
        ],
      },
      pagination: {
        totalJobs: 3,
        page: 1,
        limit: 10,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false,
      },
    });

    render(
      <MemoryRouter>
        <FarmerJobDashboardPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Applications per Job Vacancy')).toBeInTheDocument();
    });

    // 1. Check Applications per Job Vacancy chart counts & pluralization
    expect(screen.getByText('0 Applicants')).toBeInTheDocument();
    expect(screen.getByText('1 Applicant')).toBeInTheDocument();
    expect(screen.getByText('5 Applicants')).toBeInTheDocument();

    // 2. Check total applications summary metric
    expect(screen.getByText('6')).toBeInTheDocument(); // total applications = 0 + 1 + 5 = 6

    // 3. Verify that fake counts (e.g., 9 or 14) are NOT rendered
    expect(screen.queryByText('9 Applicants')).not.toBeInTheDocument();
    expect(screen.queryByText('14 Applicants')).not.toBeInTheDocument();
  });
});
