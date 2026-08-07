import request from 'supertest';
import mongoose from 'mongoose';
import { jest } from '@jest/globals';
import app from '../app.js';
import { geocodeAddressService, reverseGeocodeService } from '../services/locationService.js';
import { cacheService } from '../services/cacheService.js';

describe('Backend Location Service & Nominatim Integration Suite', () => {
  jest.setTimeout(15000);

  beforeAll(async () => {
    const mongoUri = process.env.MONGODB_TEST_URI || 'mongodb://127.0.0.1:27017/agriconnect_test_db';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }
  });

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });

  beforeEach(() => {
    cacheService.flush();
  });

  it('1. geocodeAddressService should return normalized location array', async () => {
    const results = await geocodeAddressService('Amritsar');
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);

    const first = results[0];
    expect(first).toHaveProperty('address');
    expect(first).toHaveProperty('village');
    expect(first).toHaveProperty('district');
    expect(first).toHaveProperty('state');
    expect(first).toHaveProperty('country');
    expect(first).toHaveProperty('pincode');
    expect(first).toHaveProperty('latitude');
    expect(first).toHaveProperty('longitude');
    expect(typeof first.latitude).toBe('number');
    expect(typeof first.longitude).toBe('number');
  });

  it('2. geocodeAddressService should cache repeated query results', async () => {
    const query = 'Ludhiana Punjab';
    const firstCall = await geocodeAddressService(query);
    expect(firstCall.length).toBeGreaterThan(0);

    // Second call should fetch from cache instantly
    const cacheKey = `location:geocode:${query.toLowerCase()}`;
    const cachedData = cacheService.get(cacheKey);
    expect(cachedData).toBeDefined();
    expect(cachedData).toEqual(firstCall);
  });

  it('3. reverseGeocodeService should return normalized location object for valid coordinates', async () => {
    const result = await reverseGeocodeService(31.634, 75.8573);
    expect(result).toBeDefined();
    expect(result.latitude).toBeCloseTo(31.634, 1);
    expect(result.longitude).toBeCloseTo(75.8573, 1);
    expect(result.country).toBeDefined();
  });

  it('4. reverseGeocodeService should throw AppError (400) for out-of-range coordinates', async () => {
    await expect(reverseGeocodeService(120, 75)).rejects.toThrow();
  });

  it('5. GET /api/v1/location/geocode should return 200 with ApiResponse', async () => {
    const res = await request(app).get('/api/v1/location/geocode?q=Amritsar');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('6. GET /api/v1/location/reverse should return 200 with ApiResponse', async () => {
    const res = await request(app).get('/api/v1/location/reverse?lat=31.634&lng=75.8573');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(typeof res.body.data.latitude).toBe('number');
    expect(typeof res.body.data.longitude).toBe('number');
    expect(res.body.data.latitude).toBeCloseTo(31.634, 1);
  });
});
