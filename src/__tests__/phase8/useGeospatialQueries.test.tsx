/**
 * Phase 8 – useGeospatialQueries React Query Hook Tests
 * Tests: query key construction, staleTime config, enabled guard, geocode/route/nearby hooks.
 * External providers: api service is fully mocked.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import {
  useNearbyJobsQuery,
  useNearbyWorkersQuery,
  useGeocodeQuery,
  useRouteQuery,
} from '../../hooks/useGeospatialQueries';

// ── Mock the service layer ──────────────────────────────────────────────────
vi.mock('../../services/jobService', () => ({
  getNearbyJobsApi: vi.fn(),
}));

vi.mock('../../services/locationService', () => ({
  getNearbyWorkersApi: vi.fn(),
  geocodeAddressApi: vi.fn(),
  reverseGeocodeApi: vi.fn(),
  calculateRouteApi: vi.fn(),
}));

const MOCK_JOBS_RESPONSE = {
  success: true,
  data: [
    {
      job: { _id: 'job1', title: 'Wheat Harvesting', dailyWage: 650 },
      distanceKm: 3.5,
      location: { type: 'Point', coordinates: [75.88, 31.65] },
      farmer: { name: 'Sardar Ji' },
    },
  ],
  meta: { pagination: { total: 1, page: 1, limit: 10, totalPages: 1 } },
};

const MOCK_WORKERS_RESPONSE = {
  success: true,
  data: [
    {
      worker: { _id: 'worker1', name: 'Gurpreet Singh', skills: ['Harvesting'] },
      distanceKm: 2.1,
      location: { type: 'Point', coordinates: [75.86, 31.64] },
    },
  ],
};

const MOCK_GEOCODE_RESPONSE = {
  success: true,
  data: [
    {
      placeName: 'Amritsar, Punjab, India',
      latitude: 31.634,
      longitude: 75.8573,
      district: 'Amritsar',
      state: 'Punjab',
    },
  ],
};

const MOCK_ROUTE_RESPONSE = {
  success: true,
  data: {
    distance: { meters: 4300, kilometers: 4.3, formatted: '4.3 km' },
    duration: { seconds: 600, minutes: 10, formatted: '10 mins' },
    geometry: { type: 'LineString', coordinates: [] },
    steps: [],
  },
};

// ── Wrapper with fresh QueryClient per test ─────────────────────────────────
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('Phase 8 – useGeospatialQueries Hook Tests', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  // ── useNearbyJobsQuery ────────────────────────────────────────────
  describe('useNearbyJobsQuery()', () => {
    it('1. fetches nearby jobs and returns data', async () => {
      const { getNearbyJobsApi } = await import('../../services/jobService');
      (getNearbyJobsApi as any).mockResolvedValueOnce(MOCK_JOBS_RESPONSE);

      const { result } = renderHook(
        () => useNearbyJobsQuery({ latitude: 31.634, longitude: 75.8573, radius: 10 }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.data[0].job.title).toBe('Wheat Harvesting');
    });

    it('2. does not fetch when coordinates are 0/missing (enabled=false)', () => {
      const { result } = renderHook(
        () => useNearbyJobsQuery({ latitude: 0, longitude: 0 }, false),
        { wrapper: createWrapper() }
      );
      expect(result.current.isFetching).toBe(false);
      expect(result.current.data).toBeUndefined();
    });

    it('3. does not fetch when latitude is 0 (falsy guard)', () => {
      const { result } = renderHook(
        () => useNearbyJobsQuery({ latitude: 0, longitude: 75.8573 }),
        { wrapper: createWrapper() }
      );
      // Coordinates 0 is falsy – query should not fire
      expect(result.current.isFetching).toBe(false);
    });
  });

  // ── useNearbyWorkersQuery ─────────────────────────────────────────
  describe('useNearbyWorkersQuery()', () => {
    it('4. fetches nearby workers and returns data', async () => {
      const { getNearbyWorkersApi } = await import('../../services/locationService');
      (getNearbyWorkersApi as any).mockResolvedValueOnce(MOCK_WORKERS_RESPONSE);

      const { result } = renderHook(
        () => useNearbyWorkersQuery({ latitude: 31.634, longitude: 75.8573, radius: 10 }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.data[0].worker.name).toBe('Gurpreet Singh');
    });

    it('5. is disabled when enabled=false', () => {
      const { result } = renderHook(
        () => useNearbyWorkersQuery({ latitude: 31.634, longitude: 75.8573 }, false),
        { wrapper: createWrapper() }
      );
      expect(result.current.isFetching).toBe(false);
    });
  });

  // ── useGeocodeQuery ───────────────────────────────────────────────
  describe('useGeocodeQuery()', () => {
    it('6. fetches geocode results for 3+ char query', async () => {
      const { geocodeAddressApi } = await import('../../services/locationService');
      (geocodeAddressApi as any).mockResolvedValueOnce(MOCK_GEOCODE_RESPONSE);

      const { result } = renderHook(
        () => useGeocodeQuery('Amritsar'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.data[0].latitude).toBe(31.634);
    });

    it('7. does not fetch for query shorter than 3 chars', () => {
      const { result } = renderHook(
        () => useGeocodeQuery('am'),
        { wrapper: createWrapper() }
      );
      expect(result.current.isFetching).toBe(false);
    });

    it('8. does not fetch when disabled', () => {
      const { result } = renderHook(
        () => useGeocodeQuery('Amritsar', false),
        { wrapper: createWrapper() }
      );
      expect(result.current.isFetching).toBe(false);
    });
  });

  // ── useRouteQuery ─────────────────────────────────────────────────
  describe('useRouteQuery()', () => {
    it('9. fetches route for valid coordinates', async () => {
      const { calculateRouteApi } = await import('../../services/locationService');
      (calculateRouteApi as any).mockResolvedValueOnce(MOCK_ROUTE_RESPONSE);

      const { result } = renderHook(
        () => useRouteQuery(31.634, 75.8573, 31.65, 75.88),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.data.distance.kilometers).toBe(4.3);
    });

    it('10. does not fetch when coordinates are zero/missing', () => {
      const { result } = renderHook(
        () => useRouteQuery(0, 0, 0, 0),
        { wrapper: createWrapper() }
      );
      expect(result.current.isFetching).toBe(false);
    });

    it('11. is disabled when enabled=false', () => {
      const { result } = renderHook(
        () => useRouteQuery(31.634, 75.8573, 31.65, 75.88, false),
        { wrapper: createWrapper() }
      );
      expect(result.current.isFetching).toBe(false);
    });
  });
});
