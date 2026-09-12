import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ApplyJobModal } from '../components/applications/ApplyJobModal';
import type { JobData } from '../services/jobService';

const mockJob: JobData = {
  _id: 'job999',
  title: 'Paddy Transplanting Worker',
  description: 'Need skilled farm workers for seasonal paddy planting.',
  category: 'Paddy Planting',
  workType: 'Daily Basis',
  numberOfWorkers: 5,
  requiredSkills: ['Paddy Transplanting'],
  wageType: 'Daily',
  dailyWage: 700,
  startDate: '2026-08-10',
  jobAddress: {
    district: 'Ludhiana',
    state: 'Punjab',
  },
};

describe('ApplyJobModal Component', () => {
  test('does not render when isOpen is false', () => {
    const { container } = render(
      <ApplyJobModal
        job={mockJob}
        isOpen={false}
        onClose={jest.fn()}
        onSuccess={jest.fn()}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  test('renders form controls when isOpen is true', () => {
    render(
      <ApplyJobModal
        job={mockJob}
        isOpen={true}
        onClose={jest.fn()}
        onSuccess={jest.fn()}
      />
    );

    expect(screen.getByText('Apply for Job')).toBeInTheDocument();
    expect(screen.getByText('Paddy Transplanting Worker')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Describe your relevant experience/i)).toBeInTheDocument();
  });
});
