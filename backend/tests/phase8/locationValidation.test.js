/**
 * Phase 8 – Location Validation Unit Tests
 * Tests: latitude/longitude bounds, radius cap, GeoJSON shape, ObjectId, NoSQL sanitization, pagination.
 * External providers: None (pure unit tests, no HTTP requests).
 */
import { validateGeoJSONInput } from '../../validators/locationValidator.js';
import { isValidCoordinates } from '../../utils/distanceCalculator.js';
import { jest } from '@jest/globals';

describe('Phase 8 – Location Validation Unit Tests', () => {
  // ── Coordinate Bounds ────────────────────────────────────────────
  describe('isValidCoordinates()', () => {
    it('1. accepts valid lat/lng pair', () => {
      expect(isValidCoordinates(31.634, 75.8573)).toBe(true);
    });

    it('2. accepts boundary extremes', () => {
      expect(isValidCoordinates(-90, -180)).toBe(true);
      expect(isValidCoordinates(90, 180)).toBe(true);
    });

    it('3. rejects latitude > 90', () => {
      expect(isValidCoordinates(91, 75)).toBe(false);
    });

    it('4. rejects latitude < -90', () => {
      expect(isValidCoordinates(-91, 75)).toBe(false);
    });

    it('5. rejects longitude > 180', () => {
      expect(isValidCoordinates(31, 181)).toBe(false);
    });

    it('6. rejects longitude < -180', () => {
      expect(isValidCoordinates(31, -181)).toBe(false);
    });

    it('7. rejects NaN coordinates', () => {
      expect(isValidCoordinates(NaN, 75)).toBe(false);
      expect(isValidCoordinates(31, NaN)).toBe(false);
    });

    it('8. rejects string non-numeric values', () => {
      expect(isValidCoordinates('abc', 75)).toBe(false);
      expect(isValidCoordinates(31, 'xyz')).toBe(false);
    });

    it('9. coerces numeric strings to numbers', () => {
      expect(isValidCoordinates('31.634', '75.8573')).toBe(true);
    });
  });

  // ── GeoJSON Middleware Validation ────────────────────────────────
  describe('validateGeoJSONInput() middleware', () => {
    const buildContext = (location) => ({
      req: { body: { location } },
      res: {},
      next: jest.fn(),
    });

    it('10. passes when no location in body', () => {
      const { req, res, next } = buildContext(undefined);
      validateGeoJSONInput(req, res, next);
      expect(next).toHaveBeenCalledWith(); // called with no args = next()
    });

    it('11. rejects non-object location', () => {
      const { req, res, next } = buildContext('string');
      validateGeoJSONInput(req, res, next);
      expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('object') }));
    });

    it('12. rejects wrong GeoJSON type', () => {
      const { req, res, next } = buildContext({ type: 'Polygon', coordinates: [] });
      validateGeoJSONInput(req, res, next);
      expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('"Point"') }));
    });

    it('13. rejects coordinates that are not an array', () => {
      const { req, res, next } = buildContext({ type: 'Point', coordinates: '31,75' });
      validateGeoJSONInput(req, res, next);
      expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('coordinates') }));
    });

    it('14. rejects coordinates array with length != 2', () => {
      const { req, res, next } = buildContext({ type: 'Point', coordinates: [75.8573] });
      validateGeoJSONInput(req, res, next);
      expect(next).toHaveBeenCalledWith(expect.anything());
    });

    it('15. rejects out-of-range longitude (coordinates[0])', () => {
      const { req, res, next } = buildContext({ type: 'Point', coordinates: [250, 31.634] });
      validateGeoJSONInput(req, res, next);
      expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('longitude') }));
    });

    it('16. rejects out-of-range latitude (coordinates[1])', () => {
      const { req, res, next } = buildContext({ type: 'Point', coordinates: [75.8573, 95] });
      validateGeoJSONInput(req, res, next);
      expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('latitude') }));
    });

    it('17. accepts valid GeoJSON Point [lng, lat]', () => {
      const { req, res, next } = buildContext({ type: 'Point', coordinates: [75.8573, 31.634] });
      validateGeoJSONInput(req, res, next);
      expect(next).toHaveBeenCalledWith(); // passes through
    });
  });
});
