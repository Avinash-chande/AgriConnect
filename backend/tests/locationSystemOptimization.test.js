import request from 'supertest';
import app from '../app.js';
import { cacheService } from '../services/cacheService.js';

describe('Geospatial Location System Optimization Suite', () => {
  beforeEach(() => {
    cacheService.flush();
  });

  it('1. Caches Nominatim geocoding requests for 1 hour TTL', async () => {
    const query = 'Amritsar Optimization';
    const cacheKey = `location:geocode:${query.toLowerCase()}`;

    // Seed cache
    cacheService.set(cacheKey, [{ placeName: 'Amritsar Test', latitude: 31.634, longitude: 75.8573 }], 3600);

    const res = await request(app).get(`/api/v1/location/geocode?q=${encodeURIComponent(query)}`);
    expect(res.status).toBe(200);
    expect(res.body.data[0].placeName).toBe('Amritsar Test');
  });

  it('2. Caches OSRM route calculation requests for 2 hours TTL', async () => {
    const cacheKey = 'location:route:31.634,75.857->31.650,75.880';
    cacheService.set(
      cacheKey,
      {
        distance: { meters: 3500, kilometers: 3.5, formatted: '3.5 km' },
        duration: { seconds: 300, minutes: 5, formatted: '5 min' },
        geometry: { type: 'LineString', coordinates: [[75.8573, 31.634], [75.88, 31.65]] },
        steps: [],
      },
      7200
    );

    const res = await request(app).get(
      '/api/v1/location/route?startLat=31.634&startLng=75.8573&endLat=31.65&endLng=75.88'
    );
    expect(res.status).toBe(200);
    expect(res.body.data.distance.kilometers).toBe(3.5);
  });

  it('3. Caps pagination limit at max 50 items per page', async () => {
    const res = await request(app).get(
      '/api/v1/location/nearby-jobs?lat=31.634&lng=75.8573&limit=100'
    );
    expect(res.status).toBe(400); // Exceeds max 50 limit cap
  });

  it('4. Caps maximum radius at 100km to prevent query performance degradation', async () => {
    const res = await request(app).get(
      '/api/v1/location/nearby-jobs?lat=31.634&lng=75.8573&radius=250'
    );
    expect(res.status).toBe(400);
  });
});
