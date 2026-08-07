import request from 'supertest';
import app from '../app.js';
import {
  calculateDistance,
  calculateJobToWorkerDistance,
  calculateWorkerToJobDistance,
  calculateFarmerToWorkerDistance,
  calculateUserToJobDistance,
  isValidCoordinates,
  extractCoordinates,
  formatDistance,
} from '../utils/distanceCalculator.js';

describe('Reusable Distance Calculation Utility & Service Suite', () => {
  const amritsarCoords = { latitude: 31.634, longitude: 75.8573 };
  const jalandharCoords = { latitude: 31.326, longitude: 75.576 };

  const mockJob = {
    title: 'Wheat Harvesting',
    jobAddress: {
      village: 'Verka',
      district: 'Amritsar',
      latitude: 31.65,
      longitude: 75.88,
    },
  };

  const mockWorkerProfile = {
    title: 'Tractor Operator',
    address: {
      village: 'Jandiala',
      district: 'Amritsar',
      latitude: 31.56,
      longitude: 75.78,
    },
  };

  const mockFarmerProfile = {
    farmName: 'Golden Wheat Fields',
    farmAddress: {
      district: 'Amritsar',
      latitude: 31.62,
      longitude: 75.84,
    },
  };

  it('1. isValidCoordinates correctly validates coordinate range bounds', () => {
    expect(isValidCoordinates(31.634, 75.8573)).toBe(true);
    expect(isValidCoordinates(0, 0)).toBe(true);
    expect(isValidCoordinates(-90, -180)).toBe(true);
    expect(isValidCoordinates(90, 180)).toBe(true);

    expect(isValidCoordinates(95, 75.8573)).toBe(false);
    expect(isValidCoordinates(31.634, 185)).toBe(false);
    expect(isValidCoordinates('invalid', 'coord')).toBe(false);
    expect(isValidCoordinates(null, undefined)).toBe(false);
  });

  it('2. extractCoordinates flexibly extracts lat/lng from various entity formats', () => {
    // Direct { latitude, longitude }
    expect(extractCoordinates(amritsarCoords)).toEqual({ latitude: 31.634, longitude: 75.8573 });

    // GeoJSON Point { type: 'Point', coordinates: [75.88, 31.65] }
    const geoJsonPoint = { type: 'Point', coordinates: [75.88, 31.65] };
    expect(extractCoordinates(geoJsonPoint)).toEqual({ latitude: 31.65, longitude: 75.88 });

    // Nested jobAddress
    expect(extractCoordinates(mockJob)).toEqual({ latitude: 31.65, longitude: 75.88 });

    // Nested farmAddress
    expect(extractCoordinates(mockFarmerProfile)).toEqual({ latitude: 31.62, longitude: 75.84 });

    // Array [lng, lat]
    expect(extractCoordinates([75.88, 31.65])).toEqual({ latitude: 31.65, longitude: 75.88 });

    // Invalid entity -> returns null
    expect(extractCoordinates(null)).toBeNull();
    expect(extractCoordinates({})).toBeNull();
  });

  it('3. formatDistance correctly formats meters (<1km) and kilometers (>=1km)', () => {
    expect(formatDistance(0.45)).toBe('450 m away');
    expect(formatDistance(0.08)).toBe('80 m away');
    expect(formatDistance(2.43)).toBe('2.4 km away');
    expect(formatDistance(12.8)).toBe('12.8 km away');
    expect(formatDistance(-5)).toBe('Distance unavailable');
  });

  it('4. calculateDistance calculates accurate geodesic meters, kilometers, miles, and formatted distance', () => {
    const result = calculateDistance(amritsarCoords, jalandharCoords);

    expect(result).not.toBeNull();
    expect(result.kilometers).toBeGreaterThan(40);
    expect(result.kilometers).toBeLessThan(46);
    expect(result.meters).toBeGreaterThan(40000);
    expect(result.miles).toBeGreaterThan(25);
    expect(result.formatted).toMatch(/km away$/);
  });

  it('5. Zero distance optimization when origin and destination coordinates are identical', () => {
    const result = calculateDistance(amritsarCoords, amritsarCoords);

    expect(result).toEqual({
      meters: 0,
      kilometers: 0,
      miles: 0,
      formatted: '0 m away',
    });
  });

  it('6. Entity helper distance functions (job->worker, farmer->worker, user->job)', () => {
    // job -> worker
    const jobToWorker = calculateJobToWorkerDistance(mockJob, mockWorkerProfile);
    expect(jobToWorker).not.toBeNull();
    expect(jobToWorker.kilometers).toBeGreaterThan(5);
    expect(jobToWorker.kilometers).toBeLessThan(15);

    // worker -> job
    const workerToJob = calculateWorkerToJobDistance(mockWorkerProfile, mockJob);
    expect(workerToJob.kilometers).toEqual(jobToWorker.kilometers);

    // farmer -> worker
    const farmerToWorker = calculateFarmerToWorkerDistance(mockFarmerProfile, mockWorkerProfile);
    expect(farmerToWorker).not.toBeNull();
    expect(farmerToWorker.formatted).toMatch(/km away$/);

    // user -> job
    const userToJob = calculateUserToJobDistance(amritsarCoords, mockJob);
    expect(userToJob).not.toBeNull();
    expect(userToJob.formatted).toMatch(/km away$/);
  });

  it('7. Handles missing or invalid locations gracefully without throwing errors', () => {
    expect(calculateDistance(null, mockJob)).toBeNull();
    expect(calculateDistance(mockJob, {})).toBeNull();
    expect(calculateDistance({ latitude: 120, longitude: 75 }, mockJob)).toBeNull();
  });

  it('8. GET /api/v1/location/distance returns distance object via HTTP endpoint', async () => {
    const res = await request(app).get(
      '/api/v1/location/distance?startLat=31.634&startLng=75.8573&endLat=31.326&endLng=75.576'
    );

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.kilometers).toBeGreaterThan(40);
    expect(res.body.data.formatted).toMatch(/km away$/);
  });
});
