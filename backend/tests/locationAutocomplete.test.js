import request from 'supertest';
import app from '../app.js';

describe('Location Autocomplete Integration Suite', () => {
  it('1. GET /api/v1/location/search-autocomplete returns autocomplete matches for valid query (min 3 chars)', async () => {
    const res = await request(app).get('/api/v1/location/search-autocomplete?q=Amritsar');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);

    const first = res.body.data[0];
    expect(first.placeName).toBeDefined();
    expect(first.district).toBeDefined();
    expect(first.state).toBeDefined();
    expect(first.latitude).toBeDefined();
    expect(first.longitude).toBeDefined();
    expect(first.formattedAddress).toBeDefined();
  });

  it('2. Queries with less than 3 characters return empty array immediately', async () => {
    const res = await request(app).get('/api/v1/location/search-autocomplete?q=am');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual([]);
  });

  it('3. Repeated queries return cached autocomplete results', async () => {
    const start = Date.now();
    const res1 = await request(app).get('/api/v1/location/search-autocomplete?q=Jalandhar');
    const res2 = await request(app).get('/api/v1/location/search-autocomplete?q=Jalandhar');

    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);
    expect(res2.body.data).toEqual(res1.body.data);
  });
});
