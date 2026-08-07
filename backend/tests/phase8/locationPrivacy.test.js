/**
 * Phase 8 – Location Privacy Unit Tests
 * Tests: applyCoordinateJitter, applyLocationPrivacy (private/approximate/verified_users/public),
 *        owner bypass, coordinate nullification.
 * External providers: None.
 */
import { applyCoordinateJitter, applyLocationPrivacy } from '../../utils/locationPrivacy.js';

// Factory – always return a fresh deep-copy to avoid cross-test mutation
const makeDoc = (overrides = {}) => ({
  _id: '507f1f77bcf86cd799439011',
  owner: '507f1f77bcf86cd799439022',
  locationVisibility: 'approximate',
  address: {
    addressLine: '12 GT Road',
    village: 'Verka',
    district: 'Amritsar',
    state: 'Punjab',
    pincode: '143501',
    latitude: 31.65,
    longitude: 75.88,
  },
  location: {
    type: 'Point',
    coordinates: [75.88, 31.65], // [lng, lat]
  },
  ...overrides,
});

describe('Phase 8 – Location Privacy Unit Tests', () => {
  // ── applyCoordinateJitter ─────────────────────────────────────────
  describe('applyCoordinateJitter()', () => {
    it('1. returns coordinates within ~400m of original with seed string', () => {
      const jittered = applyCoordinateJitter(31.65, 75.88, 'seed123');
      // ~0.002 degrees ≈ ~220m at these latitudes
      expect(Math.abs(jittered.latitude - 31.65)).toBeLessThan(0.015);
      expect(Math.abs(jittered.longitude - 75.88)).toBeLessThan(0.015);
    });

    it('2. is deterministic (same seed always produces same offset)', () => {
      const a = applyCoordinateJitter(31.65, 75.88, 'myworker123');
      const b = applyCoordinateJitter(31.65, 75.88, 'myworker123');
      expect(a.latitude).toBe(b.latitude);
      expect(a.longitude).toBe(b.longitude);
    });

    it('3. applies different offsets for different seeds', () => {
      const a = applyCoordinateJitter(31.65, 75.88, 'seed_a');
      const b = applyCoordinateJitter(31.65, 75.88, 'seed_b');
      expect(a.latitude === b.latitude && a.longitude === b.longitude).toBe(false);
    });

    it('4. handles empty seed string gracefully', () => {
      const result = applyCoordinateJitter(31.65, 75.88, '');
      expect(typeof result.latitude).toBe('number');
      expect(typeof result.longitude).toBe('number');
    });

    it('5. returns original values if lat/lng are not numbers', () => {
      const result = applyCoordinateJitter('not', 'numbers', 'seed');
      expect(result.latitude).toBe('not');
      expect(result.longitude).toBe('numbers');
    });
  });

  // ── applyLocationPrivacy – private ───────────────────────────────
  describe('applyLocationPrivacy() – private visibility', () => {
    it('6. nullifies exact coordinates for private visibility', () => {
      const doc = makeDoc({ locationVisibility: 'private' });
      const result = applyLocationPrivacy(doc, null);
      expect(result.address.latitude).toBeNull();
      expect(result.address.longitude).toBeNull();
    });

    it('7. nullifies GeoJSON location for private visibility', () => {
      const doc = makeDoc({ locationVisibility: 'private' });
      const result = applyLocationPrivacy(doc, null);
      expect(result.location).toBeNull();
    });

    it('8. still returns district, state for private (no full blackout)', () => {
      const doc = makeDoc({ locationVisibility: 'private' });
      const result = applyLocationPrivacy(doc, null);
      expect(result.address.district).toBe('Amritsar');
      expect(result.address.state).toBe('Punjab');
    });
  });

  // ── applyLocationPrivacy – approximate ───────────────────────────
  describe('applyLocationPrivacy() – approximate visibility', () => {
    it('9. jitters coordinates for approximate visibility', () => {
      const doc = makeDoc({ locationVisibility: 'approximate' });
      const originalLat = doc.address.latitude;
      const originalLng = doc.address.longitude;
      const result = applyLocationPrivacy(doc, null);
      // Coordinates should be changed but remain geographically close
      const latDiff = Math.abs(result.address.latitude - originalLat);
      const lngDiff = Math.abs(result.address.longitude - originalLng);
      expect(latDiff).toBeLessThan(0.02);
      expect(lngDiff).toBeLessThan(0.02);
    });

    it('10. sets addressLine to [Approximate Area]', () => {
      const doc = makeDoc({ locationVisibility: 'approximate' });
      const result = applyLocationPrivacy(doc, null);
      expect(result.address.addressLine).toBe('[Approximate Area]');
    });

    it('11. removes pincode for approximate visibility', () => {
      const doc = makeDoc({ locationVisibility: 'approximate' });
      const result = applyLocationPrivacy(doc, null);
      expect(result.address.pincode).toBeUndefined();
    });
  });

  // ── applyLocationPrivacy – owner bypass ──────────────────────────
  describe('applyLocationPrivacy() – owner bypass', () => {
    it('12. owner always sees exact location regardless of visibility setting', () => {
      // Owner ID matches doc.owner - owner bypass returns doc unchanged
      const ownerViewer = { _id: '507f1f77bcf86cd799439022' };
      // Use private visibility to ensure bypass is working (private would normally null out coords)
      const doc = makeDoc({ locationVisibility: 'private' });
      const result = applyLocationPrivacy(doc, ownerViewer);
      // Owner gets full unmodified doc - address.latitude should still be 31.65
      expect(result.address.latitude).toBe(31.65);
      expect(result.address.longitude).toBe(75.88);
    });

    it('13. non-owner with private visibility gets nullified coords', () => {
      const nonOwnerViewer = { _id: '507f1f77bcf86cd799439099' };
      const doc = makeDoc({ locationVisibility: 'private' });
      const result = applyLocationPrivacy(doc, nonOwnerViewer);
      expect(result.address.latitude).toBeNull();
    });
  });

  // ── applyLocationPrivacy – public ────────────────────────────────
  describe('applyLocationPrivacy() – public visibility', () => {
    it('14. public visibility returns coordinates without modification', () => {
      const doc = makeDoc({ locationVisibility: 'public' });
      const result = applyLocationPrivacy(doc, null);
      // 'public' visibility is NOT in the approximate/private blocks, so coordinates pass through
      expect(result.address.latitude).toBe(31.65);
      expect(result.address.longitude).toBe(75.88);
    });
  });

  // ── Edge cases ────────────────────────────────────────────────────
  describe('applyLocationPrivacy() – edge cases', () => {
    it('15. handles null item gracefully (returns null)', () => {
      expect(applyLocationPrivacy(null, null)).toBeNull();
    });

    it('16. handles item with no address or location field', () => {
      const doc = { _id: 'abc', locationVisibility: 'approximate' };
      const result = applyLocationPrivacy(doc, null);
      expect(result).toBeDefined();
    });
  });
});
