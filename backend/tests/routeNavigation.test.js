import request from 'supertest';
import app from '../app.js';

describe('OSRM Free Route Navigation Integration Suite', () => {
  const startLat = 31.634;
  const startLng = 75.8573;
  const endLat = 31.65;
  const endLng = 75.88;

  it('1. GET /api/v1/location/route returns distance, duration, geometry, and steps', async () => {
    const res = await request(app).get(
      `/api/v1/location/route?startLat=${startLat}&startLng=${startLng}&endLat=${endLat}&endLng=${endLng}`
    );

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();

    const routeData = res.body.data;
    expect(routeData.distance).toBeDefined();
    expect(routeData.distance.kilometers).toBeGreaterThan(0);
    expect(routeData.distance.formatted).toMatch(/km$/);

    expect(routeData.duration).toBeDefined();
    expect(routeData.duration.minutes).toBeGreaterThan(0);

    expect(routeData.geometry).toBeDefined();
    expect(Array.isArray(routeData.coordinates)).toBe(true);
    expect(routeData.coordinates.length).toBeGreaterThanOrEqual(2);

    expect(Array.isArray(routeData.steps)).toBe(true);
  });

  it('2. Caches repeated route navigation requests', async () => {
    const start = Date.now();
    const res = await request(app).get(
      `/api/v1/location/route?startLat=${startLat}&startLng=${startLng}&endLat=${endLat}&endLng=${endLng}`
    );
    const durationMs = Date.now() - start;

    expect(res.status).toBe(200);
    // Cached response should return very fast (<50ms)
    expect(durationMs).toBeLessThan(100);
  });

  it('3. Rejects out-of-bounds latitude/longitude coordinates with 400 Bad Request', async () => {
    const res = await request(app).get(
      `/api/v1/location/route?startLat=120&startLng=${startLng}&endLat=${endLat}&endLng=${endLng}`
    );

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});
