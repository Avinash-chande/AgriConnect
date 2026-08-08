/**
 * Phase 8 – Geocoding & Route Service Tests
 * All external Nominatim/OSRM requests are MOCKED by replacing globalThis.fetch.
 * Uses Jest (backend runner). fetch is replaced in beforeAll to avoid ESM top-level jest reference issues.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, jest } from '@jest/globals';
import { cacheService } from '../../services/cacheService.js';
import {
  geocodeAddressService,
  reverseGeocodeService,
  searchLocationAutocompleteService,
  calculateRouteService,
} from '../../services/locationService.js';

const NOMINATIM_GEOCODE_RESPONSE = [
  {
    lat: '31.634',
    lon: '75.8573',
    display_name: 'Amritsar, Punjab, India',
    address: {
      road: 'GT Road',
      village: 'Amritsar',
      state_district: 'Amritsar',
      state: 'Punjab',
      country: 'India',
      postcode: '143001',
    },
    type: 'city',
    class: 'place',
  },
];

const NOMINATIM_REVERSE_RESPONSE = {
  lat: '31.634',
  lon: '75.8573',
  display_name: 'GT Road, Amritsar, Punjab, India',
  address: {
    road: 'GT Road',
    village: 'Amritsar',
    state_district: 'Amritsar',
    state: 'Punjab',
    country: 'India',
    postcode: '143001',
  },
};

const OSRM_ROUTE_RESPONSE = {
  code: 'Ok',
  routes: [
    {
      distance: 4300,
      duration: 600,
      geometry: {
        type: 'LineString',
        coordinates: [[75.8573, 31.634], [75.88, 31.65]],
      },
      legs: [
        {
          steps: [
            { name: 'GT Road', distance: 2000, duration: 240, maneuver: { type: 'depart', modifier: 'right' } },
            { name: 'NH1', distance: 2300, duration: 360, maneuver: { type: 'arrive', modifier: 'left' } },
          ],
        },
      ],
    },
  ],
};

// mockFetch is set in beforeAll once jest is available in scope
let mockFetch;
const originalFetch = globalThis.fetch;

describe('Phase 8 – Geocoding & Route Service Tests (Mocked External Providers)', () => {
  beforeAll(() => {
    mockFetch = jest.fn();
    globalThis.fetch = mockFetch;
  });

  afterAll(() => {
    globalThis.fetch = originalFetch;
  });

  beforeEach(() => {
    cacheService.flush();
    mockFetch.mockClear();
  });

  // ── Geocoding ─────────────────────────────────────────────────────
  describe('geocodeAddressService()', () => {
    it('1. returns normalized array for valid query', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => NOMINATIM_GEOCODE_RESPONSE });

      const results = await geocodeAddressService('Amritsar');
      expect(Array.isArray(results)).toBe(true);
      expect(results[0]).toMatchObject({
        latitude: 31.634,
        longitude: 75.8573,
        state: 'Punjab',
        country: 'India',
      });
    });

    it('2. returns cached result on second call (no extra fetch)', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => NOMINATIM_GEOCODE_RESPONSE });

      await geocodeAddressService('Amritsar Cache Test');
      await geocodeAddressService('Amritsar Cache Test');

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('3. returns empty array when Nominatim returns no results', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => [] });

      const results = await geocodeAddressService('ZZZNoResultQueryXXX');
      expect(results).toEqual([]);
    });

    it('4. returns fallback response when Nominatim is unreachable', async () => {
      // withRetry fires up to 3 times - mock all calls to fail
      mockFetch.mockRejectedValue(new Error('Network error'));

      const results = await geocodeAddressService('FallbackQuery');
      expect(Array.isArray(results)).toBe(true);
      expect(results[0].country).toBe('India');

      mockFetch.mockReset();
    });

    it('5. throws AppError 400 for empty or blank search query', async () => {
      await expect(geocodeAddressService('')).rejects.toMatchObject({ statusCode: 400 });
      await expect(geocodeAddressService('   ')).rejects.toMatchObject({ statusCode: 400 });
    });
  });

  // ── Reverse Geocoding ─────────────────────────────────────────────
  describe('reverseGeocodeService()', () => {
    it('6. returns normalized object for valid coordinates', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => NOMINATIM_REVERSE_RESPONSE });

      const result = await reverseGeocodeService(31.634, 75.8573);
      expect(result).toMatchObject({ latitude: 31.634, longitude: 75.8573, state: 'Punjab', country: 'India' });
    });

    it('7. throws AppError 400 for out-of-range latitude', async () => {
      await expect(reverseGeocodeService(95, 75.8573)).rejects.toMatchObject({ statusCode: 400 });
    });

    it('8. throws AppError 400 for out-of-range longitude', async () => {
      await expect(reverseGeocodeService(31.634, 200)).rejects.toMatchObject({ statusCode: 400 });
    });
  });

  // ── Autocomplete ──────────────────────────────────────────────────
  describe('searchLocationAutocompleteService()', () => {
    it('9. returns empty array for query shorter than 3 characters', async () => {
      const results = await searchLocationAutocompleteService('am');
      expect(results).toEqual([]);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('10. returns normalized results for valid 3+ char query', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => NOMINATIM_GEOCODE_RESPONSE });

      const results = await searchLocationAutocompleteService('Amr');
      expect(Array.isArray(results)).toBe(true);
      expect(results[0]).toHaveProperty('placeName');
      expect(results[0]).toHaveProperty('latitude');
    });

    it('11. caches autocomplete results for repeat queries', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => NOMINATIM_GEOCODE_RESPONSE });

      await searchLocationAutocompleteService('Jalandhar');
      await searchLocationAutocompleteService('Jalandhar');

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  // ── Route Calculation ─────────────────────────────────────────────
  describe('calculateRouteService()', () => {
    it('12. returns distance, duration, geometry, and steps for valid coordinates', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => OSRM_ROUTE_RESPONSE });

      const route = await calculateRouteService(31.634, 75.8573, 31.65, 75.88);
      expect(route.distance.meters).toBe(4300);
      expect(route.duration.minutes).toBeGreaterThan(0);
      expect(Array.isArray(route.steps)).toBe(true);
      expect(route.steps.length).toBe(2);
      expect(route.geometry).toHaveProperty('type');
    });

    it('13. caches route results for repeat requests', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => OSRM_ROUTE_RESPONSE });

      await calculateRouteService(31.634, 75.8573, 31.65, 75.88);
      await calculateRouteService(31.634, 75.8573, 31.65, 75.88);

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('14. throws AppError 400 for out-of-bounds coordinates', async () => {
      await expect(calculateRouteService(120, 75.8573, 31.65, 75.88))
        .rejects.toMatchObject({ statusCode: 400 });
    });

    it('15. returns direct polyline fallback when OSRM returns code != Ok', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ code: 'NoRoute', routes: [] }) });

      const route = await calculateRouteService(31.634, 75.8573, 31.65, 75.88);
      expect(route.isFallback).toBe(true);
      expect(route.distance).toBeDefined();
    });
  });
});
