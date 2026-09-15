import request from 'supertest';
import mongoose from 'mongoose';
import app from '../app.js';
import { jest } from '@jest/globals';

jest.setTimeout(30000);

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/agriconnect_db');
  }
});

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
});

describe('AgriMatch AI Public API Integration Suite', () => {
  it('1. GET /api/v1/workers/agrimatch returns real matching workers from MongoDB without hardcoded 5', async () => {
    const res = await request(app)
      .get('/api/v1/workers/agrimatch')
      .query({
        crop: 'Wheat Harvesting',
        location: 'Maharashtra, India',
        targetCrewSize: 5,
      })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();

    const data = res.body.data;

    // The database currently has 2 real Worker users in Maharashtra with combine harvester skills
    expect(data.matchedCount).toBe(2);
    expect(data.matchedCount).toBe(data.workers.length);

    // CRITICAL: Must NEVER be the hardcoded 5
    expect(data.matchedCount).not.toBe(5);

    // Score must be calculated dynamically, NEVER hardcoded 98.4
    expect(typeof data.score).toBe('number');
    expect(data.score).not.toBe(98.4);

    // ETA must not be hardcoded 1.5 Hours
    expect(data.estimatedArrival).not.toBe('1.5 Hours');

    // Target crew size is separate from matchedCount
    expect(data.targetCrewSize).toBe(5);

    // Real worker identities check
    const names = data.workers.map((w) => w.name.toLowerCase());
    expect(names.some((n) => n.includes('mayur'))).toBe(true);

    // All returned workers must be verified
    data.workers.forEach((w) => {
      expect(Boolean(w.isVerified || w.aadhaarVerified)).toBe(true);
    });
  });

  it('2. GET /api/v1/workers/agrimatch returns 0 workers for non-matching location (no fake fallback)', async () => {
    const res = await request(app)
      .get('/api/v1/workers/agrimatch')
      .query({
        crop: 'Wheat Harvesting',
        location: 'Punjab, India',
        targetCrewSize: 5,
      })
      .expect(200);

    expect(res.body.success).toBe(true);
    const data = res.body.data;

    // Neither worker is in Punjab
    expect(data.matchedCount).toBe(0);
    expect(data.workers).toEqual([]);
    expect(data.score).toBe(0);
  });

  it('3. GET /api/v1/workers/agrimatch returns 0 workers for non-matching crop (no fake fallback)', async () => {
    const res = await request(app)
      .get('/api/v1/workers/agrimatch')
      .query({
        crop: 'Greenhouse Tomato Pickers',
        location: 'Maharashtra, India',
        targetCrewSize: 5,
      })
      .expect(200);

    expect(res.body.success).toBe(true);
    const data = res.body.data;

    // Neither worker has greenhouse tomato picking skills
    expect(data.matchedCount).toBe(0);
    expect(data.workers).toEqual([]);
  });

  it('4. GET /api/v1/workers/match alias route works identically', async () => {
    const res = await request(app)
      .get('/api/v1/workers/match')
      .query({
        crop: 'Wheat Harvesting',
        location: 'Maharashtra, India',
      })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.matchedCount).toBe(2);
  });
});
