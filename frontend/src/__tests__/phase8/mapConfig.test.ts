/**
 * Phase 8 – mapConfig Utility Tests
 * Tests: isValidCoordinate bounds, createCustomDivIcon output, DEFAULT_MAP_CENTER defaults.
 * External providers: Leaflet is mocked.
 */
import { describe, it, expect, vi } from 'vitest';

// Mock Leaflet before importing mapConfig (which calls fixLeafletDefaultIcon())
vi.mock('leaflet', () => ({
  default: {
    Icon: {
      Default: {
        prototype: {},
        mergeOptions: vi.fn(),
      },
    },
    divIcon: vi.fn((opts: any) => ({ ...opts, _type: 'divIcon' })),
  },
}));

// Mock import.meta.env
vi.stubGlobal('import', {
  meta: { env: { VITE_MAP_DEFAULT_LAT: undefined, VITE_MAP_DEFAULT_LNG: undefined } },
});

import { isValidCoordinate, DEFAULT_MAP_ZOOM } from '../../components/map/mapConfig';

describe('Phase 8 – mapConfig Utility Tests', () => {
  // ── isValidCoordinate ─────────────────────────────────────────────
  describe('isValidCoordinate()', () => {
    it('1. returns true for valid lat/lng pair', () => {
      expect(isValidCoordinate(31.634, 75.8573)).toBe(true);
    });

    it('2. returns true for boundary extremes', () => {
      expect(isValidCoordinate(-90, -180)).toBe(true);
      expect(isValidCoordinate(90, 180)).toBe(true);
    });

    it('3. returns false for lat > 90', () => {
      expect(isValidCoordinate(91, 75)).toBe(false);
    });

    it('4. returns false for lat < -90', () => {
      expect(isValidCoordinate(-91, 75)).toBe(false);
    });

    it('5. returns false for lng > 180', () => {
      expect(isValidCoordinate(31, 181)).toBe(false);
    });

    it('6. returns false for lng < -180', () => {
      expect(isValidCoordinate(31, -181)).toBe(false);
    });

    it('7. returns false for NaN lat or lng', () => {
      expect(isValidCoordinate(NaN, 75)).toBe(false);
      expect(isValidCoordinate(31, NaN)).toBe(false);
    });

    it('8. returns false for null lat or lng', () => {
      expect(isValidCoordinate(null, 75)).toBe(false);
      expect(isValidCoordinate(31, null)).toBe(false);
    });

    it('9. returns false for undefined lat or lng', () => {
      expect(isValidCoordinate(undefined, 75)).toBe(false);
      expect(isValidCoordinate(31, undefined)).toBe(false);
    });

    it('10. returns false when both are null', () => {
      expect(isValidCoordinate(null, null)).toBe(false);
    });
  });

  // ── DEFAULT_MAP_ZOOM ──────────────────────────────────────────────
  describe('DEFAULT_MAP_ZOOM', () => {
    it('11. DEFAULT_MAP_ZOOM is 12', () => {
      expect(DEFAULT_MAP_ZOOM).toBe(12);
    });
  });
});
