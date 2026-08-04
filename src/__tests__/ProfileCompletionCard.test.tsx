import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProfileCompletionCard } from '../components/profile/ProfileCompletionCard';

describe('ProfileCompletionCard Unit Tests', () => {
  it('should render percentage score gauge correctly', () => {
    render(<ProfileCompletionCard percentage={65} />);
    expect(screen.getByText('65%')).toBeInTheDocument();
  });

  it('should display Action Required status when percentage is below 80%', () => {
    render(<ProfileCompletionCard percentage={65} />);
    expect(screen.getByText('Profile Action Required')).toBeInTheDocument();
  });

  it('should display Verified & Complete badge when percentage is 80% or above', () => {
    render(<ProfileCompletionCard percentage={85} />);
    expect(screen.getByText('Verified & Complete')).toBeInTheDocument();
  });
});
