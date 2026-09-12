/**
 * Phase 8 – JobMarker Component Tests
 * Tests: renders nothing for invalid coordinates, renders popup content,
 *        calls onClick on marker click, displays urgent badge, wage display.
 * External providers: react-leaflet is mocked.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { JobMarker, JobMarkerData } from '../../components/map/JobMarker';

// Mock react-leaflet and leaflet entirely
vi.mock('react-leaflet', () => ({
  Marker: ({ children, eventHandlers, position }: any) => (
    <div
      data-testid="leaflet-marker"
      data-lat={position?.[0]}
      data-lng={position?.[1]}
      onClick={eventHandlers?.click}
    >
      {children}
    </div>
  ),
  Popup: ({ children, minWidth }: any) => (
    <div data-testid="leaflet-popup" style={{ minWidth }}>{children}</div>
  ),
  MapContainer: ({ children }: any) => <div data-testid="map-container">{children}</div>,
  TileLayer: () => <div data-testid="tile-layer" />,
  useMap: vi.fn(() => ({ setView: vi.fn() })),
}));

vi.mock('leaflet', () => ({
  default: {
    Icon: { Default: { prototype: {}, mergeOptions: vi.fn() } },
    divIcon: vi.fn((opts: any) => ({ ...opts, _type: 'divIcon' })),
  },
}));

const validJob: JobMarkerData = {
  id: 'job-123',
  title: 'Wheat Harvesting Job',
  category: 'Harvesting',
  cropType: 'Wheat',
  dailyWage: 650,
  wageType: 'Daily',
  district: 'Amritsar',
  state: 'Punjab',
  latitude: 31.634,
  longitude: 75.8573,
  isUrgent: false,
};

const urgentJob: JobMarkerData = { ...validJob, id: 'job-456', isUrgent: true, title: 'Urgent Harvest' };

const invalidJob: JobMarkerData = {
  ...validJob,
  id: 'job-invalid',
  latitude: 200, // invalid
  longitude: 75.8573,
};

const renderJob = (job: JobMarkerData, onClick?: any) =>
  render(
    <MemoryRouter>
      <JobMarker job={job} onClick={onClick} />
    </MemoryRouter>
  );

describe('Phase 8 – JobMarker Component Tests', () => {
  it('1. renders marker for valid coordinates', () => {
    renderJob(validJob);
    expect(screen.getByTestId('leaflet-marker')).toBeDefined();
  });

  it('2. renders nothing (null) for invalid coordinates', () => {
    const { container } = renderJob(invalidJob);
    expect(container.firstChild).toBeNull();
  });

  it('3. renders popup with job title', () => {
    renderJob(validJob);
    expect(screen.getByText('Wheat Harvesting Job')).toBeDefined();
  });

  it('4. renders district and state in popup', () => {
    renderJob(validJob);
    expect(screen.getByText(/Amritsar/)).toBeDefined();
    expect(screen.getByText(/Punjab/)).toBeDefined();
  });

  it('5. renders wage in popup', () => {
    renderJob(validJob);
    // Wage displayed in popup
    expect(screen.getByText(/650/)).toBeDefined();
  });

  it('6. renders category badge', () => {
    renderJob(validJob);
    expect(screen.getByText('Harvesting')).toBeDefined();
  });

  it('7. renders Urgent badge span for urgent job', () => {
    renderJob(urgentJob);
    // Use getAllByText since title 'Urgent Harvest' also contains 'Urgent'
    const matches = screen.getAllByText(/Urgent/i);
    // At least one match should be the badge span (exact text = 'Urgent')
    const badge = matches.find(el => el.textContent?.trim() === 'Urgent');
    expect(badge).toBeDefined();
  });

  it('8. does not render Urgent badge for non-urgent job', () => {
    renderJob(validJob);
    expect(screen.queryByText(/Urgent/i)).toBeNull();
  });

  it('9. calls onClick when marker is clicked', () => {
    const handleClick = vi.fn();
    renderJob(validJob, handleClick);

    fireEvent.click(screen.getByTestId('leaflet-marker'));
    expect(handleClick).toHaveBeenCalledWith(validJob);
  });

  it('10. renders "View Job Vacancy" link with correct href', () => {
    renderJob(validJob);
    const link = screen.getByText(/View Job Vacancy/i).closest('a');
    expect(link?.getAttribute('href')).toContain('job-123');
  });

  it('11. renders crop type label when cropType provided', () => {
    renderJob(validJob);
    // cropType is rendered as "Crop: Wheat" inside a span
    expect(screen.getByText(/Crop:/i)).toBeDefined();
  });

  it('12. passes correct lat/lng to marker position', () => {
    renderJob(validJob);
    const marker = screen.getByTestId('leaflet-marker');
    expect(marker.getAttribute('data-lat')).toBe('31.634');
    expect(marker.getAttribute('data-lng')).toBe('75.8573');
  });
});
