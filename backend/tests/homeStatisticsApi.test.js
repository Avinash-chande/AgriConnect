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

describe('Home Statistics Public API Integration Suite', () => {
  it('should successfully return aggregate home statistics without authentication (public access)', async () => {
    const res = await request(app)
      .get('/api/v1/analytics/home-stats')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();

    const stats = res.body.data;

    // Verify properties exist and have valid types
    expect(typeof stats.verifiedFarmWorkers).toBe('number');
    expect(typeof stats.activeFarmOwners).toBe('number');
    expect(typeof stats.successfulJobMatches).toBe('number');
    expect(typeof stats.successfulFarmJobsThisMonth).toBe('number');

    if (stats.averageMatchTimeHours !== null) {
      expect(typeof stats.averageMatchTimeHours).toBe('number');
    }

    // Verify badges object
    expect(stats.badges).toBeDefined();

    // Invariant: The values must NOT be the old hardcoded marketing values
    expect(stats.verifiedFarmWorkers).not.toBe(45800);
    expect(stats.activeFarmOwners).not.toBe(18400);
    expect(stats.successfulJobMatches).not.toBe(124500);
    expect(stats.successfulFarmJobsThisMonth).not.toBe(12400);
    expect(stats.averageMatchTimeHours).not.toBe(1.8);

    // Invariant: Badges must NOT contain unsupported fake marketing claims
    const badgeValues = Object.values(stats.badges).join(' ');
    expect(badgeValues).not.toContain('+24% this month');
    expect(badgeValues).not.toContain('+18% this month');
    expect(badgeValues).not.toContain('4x faster');

    // Invariant: No sensitive personal information exposed
    expect(res.body.data.password).toBeUndefined();
    expect(res.body.data.refreshToken).toBeUndefined();
    expect(res.body.data.otpCode).toBeUndefined();
    expect(res.body.data.aadhaarNumber).toBeUndefined();
  });

  it('should set appropriate public cache-control headers', async () => {
    const res = await request(app)
      .get('/api/v1/analytics/home-stats')
      .expect(200);

    expect(res.headers['cache-control']).toBeDefined();
    expect(res.headers['cache-control']).toContain('public');
  });
});
