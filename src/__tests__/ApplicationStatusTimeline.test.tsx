import React from 'react';
import { render, screen } from '@testing-library/react';
import { ApplicationStatusTimeline } from '../components/applications/ApplicationStatusTimeline';
import type { JobApplication } from '../types/application';

const mockApplication: JobApplication = {
  _id: 'app123',
  job: 'job123' as any,
  worker: 'worker123' as any,
  farmer: 'farmer123' as any,
  status: 'Shortlisted',
  coverLetter: 'I have 5 years experience operating harvesters.',
  expectedDailyWage: 750,
  farmerFeedback: 'Great candidate, shortlisted for interview.',
  shortlisted: true,
  createdAt: '2026-08-01T10:00:00.000Z',
  updatedAt: '2026-08-02T12:00:00.000Z',
};

describe('ApplicationStatusTimeline Component', () => {
  test('renders step titles and current status badge', () => {
    render(<ApplicationStatusTimeline application={mockApplication} />);

    expect(screen.getByText('Shortlisted')).toBeInTheDocument();
    expect(screen.getByText('Current Status')).toBeInTheDocument();
  });

  test('renders farmer feedback when present', () => {
    render(<ApplicationStatusTimeline application={mockApplication} />);

    expect(screen.getByText(/Great candidate, shortlisted for interview/i)).toBeInTheDocument();
  });

  test('renders compact mode correctly', () => {
    const { container } = render(
      <ApplicationStatusTimeline application={mockApplication} compact={true} />
    );

    expect(container).toBeInTheDocument();
  });
});
