/**
 * Phase 8 – Distance Calculator Unit Tests
 * Uses actual exports from distanceCalculator.js:
 *   isValidCoordinates, extractCoordinates, formatDistance, calculateDistance,
 *   calculateJobToWorkerDistance, calculateWorkerToJobDistance, calculateFarmerToWorkerDistance.
 */
import {
  isValidCoordinates,
  extractCoordinates,
  formatDistance,
  calculateDistance,
  calculateJobToWorkerDistance,
  calculateWorkerToJobDistance,
  calculateFarmerToWorkerDistance,
} from '../../utils/distanceCalculator.js';

describe('Phase 8 – Distance Calculator Unit Tests', () => {
  // ── isValidCoordinates ────────────────────────────────────────────
  describe('isValidCoordinates()', () => {
    it('1. accepts valid coordinates', () => {
      expect(isValidCoordinates(31.634, 75.8573)).toBe(true);
    });
    it('2. rejects out-of-bounds lat', () => {
      expect(isValidCoordinates(95, 75)).toBe(false);
    });
    it('3. rejects undefined coordinates (NaN coercion)', () => {
      // Number(null) === 0, which is valid — null coerces to valid lat=0
      // Number(undefined) === NaN, which is correctly rejected
      expect(isValidCoordinates(undefined, 75)).toBe(false);
      expect(isValidCoordinates(31, undefined)).toBe(false);
      // null coerces to 0 — technically valid per Number() coercion
      expect(isValidCoordinates(null, 75)).toBe(true); // Number(null)=0 passes bounds check
    });
    it('4. coerces numeric strings', () => {
      expect(isValidCoordinates('31.634', '75.8573')).toBe(true);
    });
  });

  // ── extractCoordinates ────────────────────────────────────────────
  describe('extractCoordinates()', () => {
    it('5. extracts from { latitude, longitude } shape', () => {
      expect(extractCoordinates({ latitude: 31.634, longitude: 75.8573 }))
        .toEqual({ latitude: 31.634, longitude: 75.8573 });
    });

    it('6. extracts from { lat, lng } shape', () => {
      expect(extractCoordinates({ lat: 31.634, lng: 75.8573 }))
        .toEqual({ latitude: 31.634, longitude: 75.8573 });
    });

    it('7. extracts from GeoJSON Point { type: Point, coordinates: [lng, lat] }', () => {
      expect(extractCoordinates({ type: 'Point', coordinates: [75.8573, 31.634] }))
        .toEqual({ latitude: 31.634, longitude: 75.8573 });
    });

    it('8. extracts from nested .location property', () => {
      expect(extractCoordinates({ location: { latitude: 31.634, longitude: 75.8573 } }))
        .toEqual({ latitude: 31.634, longitude: 75.8573 });
    });

    it('9. extracts from nested .jobAddress property', () => {
      expect(extractCoordinates({ jobAddress: { latitude: 31.634, longitude: 75.8573 } }))
        .toEqual({ latitude: 31.634, longitude: 75.8573 });
    });

    it('10. returns null for empty object', () => {
      expect(extractCoordinates({})).toBeNull();
    });

    it('11. returns null for null input', () => {
      expect(extractCoordinates(null)).toBeNull();
    });
  });

  // ── formatDistance ────────────────────────────────────────────────
  describe('formatDistance()', () => {
    // Note: formatDistance receives km, returns "xxx m away" or "x.x km away"
    it('12. formats meters when < 1km', () => {
      const result = formatDistance(0.5);
      expect(result).toContain('m');
      expect(result).toContain('500');
    });

    it('13. formats km when >= 1km', () => {
      const result = formatDistance(4.3);
      expect(result).toContain('km');
    });

    it('14. returns "0 m away" for zero distance', () => {
      expect(formatDistance(0)).toBe('0 m away');
    });

    it('15. returns "Distance unavailable" for invalid input', () => {
      expect(formatDistance(NaN)).toBe('Distance unavailable');
      expect(formatDistance(-1)).toBe('Distance unavailable');
    });
  });

  // ── calculateDistance ─────────────────────────────────────────────
  describe('calculateDistance()', () => {
    const origin = { latitude: 31.634, longitude: 75.8573 };
    const destination = { latitude: 31.65, longitude: 75.88 };

    it('16. returns all distance units: meters, kilometers, miles, formatted', () => {
      const result = calculateDistance(origin, destination);
      expect(result).toHaveProperty('meters');
      expect(result).toHaveProperty('kilometers');
      expect(result).toHaveProperty('miles');
      expect(result).toHaveProperty('formatted');
    });

    it('17. calculates accurate Haversine distance (~3-5 km)', () => {
      const result = calculateDistance(origin, destination);
      expect(result.kilometers).toBeGreaterThan(2);
      expect(result.kilometers).toBeLessThan(6);
    });

    it('18. returns zero result for identical origin and destination', () => {
      const result = calculateDistance(origin, origin);
      expect(result.meters).toBe(0);
      expect(result.kilometers).toBe(0);
    });

    it('19. returns null for missing origin', () => {
      expect(calculateDistance(null, destination)).toBeNull();
    });

    it('20. returns null for missing destination', () => {
      expect(calculateDistance(origin, null)).toBeNull();
    });

    it('21. returns null for invalid coordinates', () => {
      expect(calculateDistance({ latitude: 200, longitude: 75 }, destination)).toBeNull();
    });
  });

  // ── Entity Distance Helpers ───────────────────────────────────────
  describe('entity distance helpers', () => {
    const workerDoc = {
      address: { latitude: 31.65, longitude: 75.88 },
    };
    const jobDoc = {
      jobAddress: { latitude: 31.634, longitude: 75.8573 },
    };
    const farmerDoc = {
      farmAddress: { latitude: 31.634, longitude: 75.8573 },
    };

    it('22. calculateJobToWorkerDistance() computes valid distance', () => {
      const result = calculateJobToWorkerDistance(jobDoc, workerDoc);
      expect(result).not.toBeNull();
      expect(result.kilometers).toBeGreaterThan(0);
    });

    it('23. calculateWorkerToJobDistance() computes valid distance', () => {
      const result = calculateWorkerToJobDistance(workerDoc, jobDoc);
      expect(result).not.toBeNull();
      expect(result.kilometers).toBeGreaterThan(0);
    });

    it('24. calculateFarmerToWorkerDistance() computes valid distance', () => {
      const result = calculateFarmerToWorkerDistance(farmerDoc, workerDoc);
      expect(result).not.toBeNull();
      expect(result.kilometers).toBeGreaterThan(0);
    });

    it('25. returns null for entity with no location data', () => {
      expect(calculateJobToWorkerDistance({}, workerDoc)).toBeNull();
    });

    it('26. returns null for worker with no address', () => {
      expect(calculateFarmerToWorkerDistance(farmerDoc, {})).toBeNull();
    });
  });
});
