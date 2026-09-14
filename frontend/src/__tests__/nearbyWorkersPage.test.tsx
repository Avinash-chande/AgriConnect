import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { NearbyWorkersPage } from '../pages/NearbyWorkersPage';
import * as locationService from '../services/locationService';
import * as profileService from '../services/profileService';

import * as authService from '../services/authService';
import { AuthProvider } from '../context/AuthContext';

vi.mock('../services/authService');
vi.mock('../services/locationService');
vi.mock('../services/profileService');
vi.mock('../hooks/useCurrentLocation', () => ({
  useCurrentLocation: () => ({
    coordinates: { latitude: 21.1458, longitude: 79.0882 },
    loading: false,
    refetchLocation: vi.fn(),
  }),
}));

// Mock LocationMap to avoid Leaflet leaflet-container DOM issues in jsdom
vi.mock('../components/map/LocationMap', () => ({
  LocationMap: ({ children }: any) => <div data-testid="mock-location-map">{children}</div>,
}));
vi.mock('../components/map/WorkerMarker', () => ({
  WorkerMarker: ({ name, onClick }: any) => (
    <div data-testid="mock-worker-marker" onClick={onClick}>
      {name}
    </div>
  ),
}));
vi.mock('../components/map/UserLocationMarker', () => ({
  UserLocationMarker: ({ popupText }: any) => <div data-testid="mock-user-marker">{popupText}</div>,
}));
vi.mock('react-leaflet', () => ({
  Circle: ({ radius }: any) => <div data-testid="mock-radius-circle">{radius}m</div>,
  MapContainer: ({ children }: any) => <div data-testid="mock-react-leaflet-map-container">{children}</div>,
  TileLayer: () => <div data-testid="mock-tile-layer" />,
  Marker: ({ children }: any) => <div data-testid="mock-leaflet-marker">{children}</div>,
  Popup: ({ children }: any) => <div data-testid="mock-leaflet-popup">{children}</div>,
  useMap: () => ({ setView: vi.fn(), flyTo: vi.fn(), invalidateSize: vi.fn(), getZoom: () => 12 }),
  useMapEvents: () => ({}),
}));

const mockWorkersList = [
  {
    worker: {
      _id: 'w1',
      ownerId: 'u1',
      name: 'Rahul Patil',
      title: 'Tractor Driving & Sowing Specialist',
      skills: ['Tractor Driving', 'Sowing'],
      experience: 5,
      languages: ['Marathi', 'Hindi'],
      expectedDailyWage: 550,
      availability: 'Immediate',
      rating: 4.8,
      totalJobsCompleted: 28,
      isVerified: true,
      address: { village: 'Sitabuldi', district: 'Nagpur', state: 'Maharashtra' },
    },
    distanceKm: 0.6,
    location: {
      type: 'Point' as const,
      coordinates: [79.0830, 21.1445] as [number, number],
    },
  },
  {
    worker: {
      _id: 'w2',
      ownerId: 'u2',
      name: 'Sachin Deshmukh',
      title: 'Soybean & Cotton Cultivation Worker',
      skills: ['Cotton Picking', 'Soybean Farming'],
      experience: 3,
      languages: ['Marathi', 'Hindi'],
      expectedDailyWage: 500,
      availability: 'Within 3 Days',
      rating: 4.5,
      totalJobsCompleted: 15,
      isVerified: true,
      address: { village: 'Dharampeth', district: 'Nagpur', state: 'Maharashtra' },
    },
    distanceKm: 2.8,
    location: {
      type: 'Point' as const,
      coordinates: [79.0620, 21.1410] as [number, number],
    },
  },
];

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

describe('NearbyWorkersPage (/farmer/nearby-workers) Integration Suite', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createTestQueryClient();
    vi.clearAllMocks();
    vi.mocked(authService.getCurrentUserApi).mockResolvedValue({
      _id: 'farmer123',
      name: 'Nagpur Farmer (Patil)',
      role: 'Farmer',
      email: 'farmer.nagpur@agriconnect.in',
    } as any);
    vi.mocked(locationService.reverseGeocodeApi).mockResolvedValue({
      data: { village: 'Hingna', district: 'Nagpur', state: 'Maharashtra' },
    } as any);
    vi.mocked(locationService.getNearbyWorkersApi).mockResolvedValue({
      success: true,
      data: mockWorkersList,
      meta: { pagination: { total: 2, page: 1, limit: 10, totalPages: 1 } },
    } as any);
    vi.mocked(profileService.getMyProfileApi).mockResolvedValue({
      data: {
        profile: {
          farmName: 'Nagpur Agro Farms',
          farmAddress: {
            latitude: 21.1458,
            longitude: 79.0882,
            village: 'Hingna',
            district: 'Nagpur',
            state: 'Maharashtra',
          },
        },
      },
    } as any);
  });

  const renderPage = (initialRoute = '/farmer/nearby-workers') => {
    return render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <MemoryRouter initialEntries={[initialRoute]}>
            <Routes>
              <Route path="/farmer/nearby-workers" element={<NearbyWorkersPage />} />
            </Routes>
          </MemoryRouter>
        </AuthProvider>
      </QueryClientProvider>
    );
  };

  it('1. Loads page and fetches real workers for default 10 km radius', async () => {
    renderPage();

    await waitFor(() => {
      expect(locationService.getNearbyWorkersApi).toHaveBeenCalledWith(
        expect.objectContaining({
          radius: 10,
          sort: 'distance',
          page: 1,
        })
      );
    });

    // Displays worker name on card and pin
    const cards = await screen.findAllByText('Rahul Patil');
    expect(cards.length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Sachin Deshmukh').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('0.6 km away')).toBeInTheDocument();
    expect(screen.getByText('2.8 km away')).toBeInTheDocument();
  });

  it('2. Changes radius filter to 5 km, 25 km, 50 km, 100 km and re-fetches', async () => {
    renderPage();

    await screen.findAllByText('Rahul Patil');

    const btn5km = screen.getByRole('button', { name: '5 km' });
    fireEvent.click(btn5km);

    await waitFor(() => {
      expect(locationService.getNearbyWorkersApi).toHaveBeenCalledWith(
        expect.objectContaining({ radius: 5 })
      );
    });

    const btn25km = screen.getByRole('button', { name: '25 km' });
    fireEvent.click(btn25km);

    await waitFor(() => {
      expect(locationService.getNearbyWorkersApi).toHaveBeenCalledWith(
        expect.objectContaining({ radius: 25 })
      );
    });

    const btn50km = screen.getByRole('button', { name: '50 km' });
    fireEvent.click(btn50km);

    await waitFor(() => {
      expect(locationService.getNearbyWorkersApi).toHaveBeenCalledWith(
        expect.objectContaining({ radius: 50 })
      );
    });

    const btn100km = screen.getByRole('button', { name: '100 km' });
    fireEvent.click(btn100km);

    await waitFor(() => {
      expect(locationService.getNearbyWorkersApi).toHaveBeenCalledWith(
        expect.objectContaining({ radius: 100 })
      );
    });
  });

  it('3. Filters by Required Skill dynamically', async () => {
    renderPage();

    await screen.findAllByText('Rahul Patil');

    const skillSelect = screen.getByLabelText(/Required Skill/i);
    fireEvent.change(skillSelect, { target: { value: 'Tractor Driving' } });

    await waitFor(() => {
      expect(locationService.getNearbyWorkersApi).toHaveBeenCalledWith(
        expect.objectContaining({ skills: 'Tractor Driving' })
      );
    });
  });

  it('4. Filters by Minimum Experience', async () => {
    renderPage();

    await screen.findAllByText('Rahul Patil');

    const expSelect = screen.getByLabelText(/Min Experience/i);
    fireEvent.change(expSelect, { target: { value: '3' } });

    await waitFor(() => {
      expect(locationService.getNearbyWorkersApi).toHaveBeenCalledWith(
        expect.objectContaining({ minExperience: 3 })
      );
    });
  });

  it('5. Filters by Availability status', async () => {
    renderPage();

    await screen.findAllByText('Rahul Patil');

    const availSelect = screen.getByLabelText(/Availability/i);
    fireEvent.change(availSelect, { target: { value: 'Immediate' } });

    await waitFor(() => {
      expect(locationService.getNearbyWorkersApi).toHaveBeenCalledWith(
        expect.objectContaining({ availability: 'Immediate' })
      );
    });
  });

  it('6. Filters by Max Daily Wage', async () => {
    renderPage();

    await screen.findAllByText('Rahul Patil');

    const wageSelect = screen.getByLabelText(/Max Daily Wage/i);
    fireEvent.change(wageSelect, { target: { value: '800' } });

    await waitFor(() => {
      expect(locationService.getNearbyWorkersApi).toHaveBeenCalledWith(
        expect.objectContaining({ maxWage: 800 })
      );
    });
  });

  it('7. Filters by Minimum Rating', async () => {
    renderPage();

    await screen.findAllByText('Rahul Patil');

    const ratingSelect = screen.getByLabelText(/Min Rating/i);
    fireEvent.change(ratingSelect, { target: { value: '4.5' } });

    await waitFor(() => {
      expect(locationService.getNearbyWorkersApi).toHaveBeenCalledWith(
        expect.objectContaining({ minRating: 4.5 })
      );
    });
  });

  it('8. Changes Sort Workers By option', async () => {
    renderPage();

    await screen.findAllByText('Rahul Patil');

    const sortSelect = screen.getByLabelText(/Sort Workers By/i);
    fireEvent.change(sortSelect, { target: { value: 'rating' } });

    await waitFor(() => {
      expect(locationService.getNearbyWorkersApi).toHaveBeenCalledWith(
        expect.objectContaining({ sort: 'rating' })
      );
    });

    fireEvent.change(sortSelect, { target: { value: 'wage' } });

    await waitFor(() => {
      expect(locationService.getNearbyWorkersApi).toHaveBeenCalledWith(
        expect.objectContaining({ sort: 'wage' })
      );
    });

    fireEvent.change(sortSelect, { target: { value: 'experience' } });

    await waitFor(() => {
      expect(locationService.getNearbyWorkersApi).toHaveBeenCalledWith(
        expect.objectContaining({ sort: 'experience' })
      );
    });
  });

  it('9. Combines multiple filters simultaneously', async () => {
    renderPage();

    await screen.findAllByText('Rahul Patil');

    fireEvent.click(screen.getByRole('button', { name: '25 km' }));
    fireEvent.change(screen.getByLabelText(/Required Skill/i), { target: { value: 'Tractor Driving' } });
    fireEvent.change(screen.getByLabelText(/Min Experience/i), { target: { value: '2' } });
    fireEvent.change(screen.getByLabelText(/Availability/i), { target: { value: 'Immediate' } });
    fireEvent.change(screen.getByLabelText(/Max Daily Wage/i), { target: { value: '800' } });
    fireEvent.change(screen.getByLabelText(/Min Rating/i), { target: { value: '4' } });
    fireEvent.change(screen.getByLabelText(/Sort Workers By/i), { target: { value: 'rating' } });

    await waitFor(() => {
      expect(locationService.getNearbyWorkersApi).toHaveBeenCalledWith(
        expect.objectContaining({
          radius: 25,
          skills: 'Tractor Driving',
          minExperience: 2,
          availability: 'Immediate',
          maxWage: 800,
          minRating: 4,
          sort: 'rating',
        })
      );
    });
  });

  it('10. Resets all filters when "Reset All Filters" is clicked', async () => {
    renderPage();

    await screen.findAllByText('Rahul Patil');

    // Apply some filters
    fireEvent.click(screen.getByRole('button', { name: '50 km' }));
    fireEvent.change(screen.getByLabelText(/Min Experience/i), { target: { value: '5' } });

    const resetBtn = await screen.findByRole('button', { name: /Reset All Filters/i });
    fireEvent.click(resetBtn);

    await waitFor(() => {
      expect(locationService.getNearbyWorkersApi).toHaveBeenCalledWith(
        expect.objectContaining({
          radius: 10,
          skills: undefined,
          minExperience: undefined,
          availability: undefined,
          maxWage: undefined,
          minRating: undefined,
          sort: 'distance',
        })
      );
    });
  });

  it('11. Displays dynamic Empty State and expands radius dynamically', async () => {
    vi.mocked(locationService.getNearbyWorkersApi).mockResolvedValueOnce({
      success: true,
      data: [],
      meta: { pagination: { total: 0, page: 1, limit: 10, totalPages: 1 } },
    } as any);

    renderPage();

    expect(await screen.findByText(/No Workers Found Within 10 km/i)).toBeInTheDocument();

    // The expand radius button should dynamically suggest 25 km
    const expandBtn = screen.getByRole('button', { name: 'Expand Radius to 25 km' });
    expect(expandBtn).toBeInTheDocument();

    fireEvent.click(expandBtn);

    await waitFor(() => {
      expect(locationService.getNearbyWorkersApi).toHaveBeenCalledWith(
        expect.objectContaining({ radius: 25 })
      );
    });
  });

  it('12. Switches view modes between Split View, Worker Cards, and Worker Map', async () => {
    renderPage();

    await screen.findAllByText('Rahul Patil');

    // Worker Cards grid mode
    const gridBtn = screen.getByRole('button', { name: /Worker Cards/i });
    fireEvent.click(gridBtn);

    expect(screen.getByRole('heading', { name: /Rahul Patil/i })).toBeInTheDocument();

    // Worker Map mode
    const mapBtn = screen.getByRole('button', { name: /Worker Map/i });
    fireEvent.click(mapBtn);

    expect(await screen.findByText(/Geographic Worker Map Discovery/i)).toBeInTheDocument();

    // Back to Split View
    const splitBtn = screen.getByRole('button', { name: /Split View/i });
    fireEvent.click(splitBtn);

    expect(screen.getByText(/Interactive Worker Map/i)).toBeInTheDocument();
  });

  it('13. "My Farm" button retrieves farmer profile coordinates and updates search center', async () => {
    vi.mocked(profileService.getMyProfileApi).mockResolvedValue({
      data: {
        profile: {
          farmAddress: {
            latitude: 21.1458,
            longitude: 79.0882,
            village: 'Hingna',
            district: 'Nagpur',
            state: 'Maharashtra',
          },
        },
      },
    } as any);

    renderPage();

    await screen.findAllByText('Rahul Patil');

    const myFarmBtn = screen.getByRole('button', { name: /My Farm/i });
    fireEvent.click(myFarmBtn);

    await waitFor(() => {
      expect(locationService.getNearbyWorkersApi).toHaveBeenCalledWith(
        expect.objectContaining({
          latitude: 21.1458,
          longitude: 79.0882,
        })
      );
    });
  });

  it('14. "Set Pin" button opens AgriLocationPickerModal', async () => {
    renderPage();

    await screen.findAllByText('Rahul Patil');

    const setPinBtn = screen.getByRole('button', { name: 'Set Pin' });
    fireEvent.click(setPinBtn);

    // Modal title should appear
    expect(await screen.findByText('Set Search Center for Nearby Worker Discovery')).toBeInTheDocument();
  });
});
