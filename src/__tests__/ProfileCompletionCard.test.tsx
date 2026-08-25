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

  it('should display 8/8 Sections Complete and 100% when all 8 sections are complete for worker', () => {
    render(
      <ProfileCompletionCard
        percentage={100}
        completedSections={8}
        totalSections={8}
        role="worker"
      />
    );
    expect(screen.getByText('100%')).toBeInTheDocument();
    expect(screen.getByText('8/8 Sections Complete')).toBeInTheDocument();
    expect(screen.getByText('Verified & Complete')).toBeInTheDocument();
    expect(screen.getByText('Your Worker Profile is Fully Complete!')).toBeInTheDocument();
  });

  it('should display 7/8 Sections Complete and 88% with action required when 7 sections are complete', () => {
    render(
      <ProfileCompletionCard
        percentage={88}
        completedSections={7}
        totalSections={8}
        role="worker"
      />
    );
    expect(screen.getByText('88%')).toBeInTheDocument();
    expect(screen.getByText('7/8 Sections Complete')).toBeInTheDocument();
    expect(screen.getByText('Profile Action Required')).toBeInTheDocument();
  });
});
