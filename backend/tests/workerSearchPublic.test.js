import request from 'supertest';
import mongoose from 'mongoose';
import app from '../app.js';
import { User } from '../models/User.js';
import { WorkerProfile } from '../models/WorkerProfile.js';
import { createTestWorker, createTestFarmer } from './helpers/testAuthHelper.js';

describe('Public Worker Search API (GET /api/v1/workers/search)', () => {
  let worker1;
  let worker2;
  let farmer;

  beforeAll(async () => {
    const mongoUri = process.env.MONGODB_TEST_URI || 'mongodb://127.0.0.1:27017/agriconnect_test_db';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }

    // Create test worker 1: Tractor Operator in Nagpur, Maharashtra
    worker1 = await createTestWorker({
      name: 'Ramesh Nagpur',
      title: 'Expert Tractor Operator',
      skills: ['Tractor Driving', 'Heavy Machinery', 'Ploughing'],
      district: 'Nagpur',
      state: 'Maharashtra',
      bio: 'Experienced tractor driver specialized in heavy soil ploughing in Nagpur district.',
    });

    // Create test worker 2: Harvester in Ludhiana, Punjab
    worker2 = await createTestWorker({
      name: 'Gurpreet Harvester',
      title: 'Combine Harvester Specialist',
      skills: ['Crop Harvesting', 'Wheat Harvesting'],
      district: 'Ludhiana',
      state: 'Punjab',
      bio: 'Expert grain combine operator for seasonal wheat harvesting.',
    });

    // Create a test farmer
    farmer = await createTestFarmer();
  });

  afterAll(async () => {
    if (worker1) {
      await WorkerProfile.deleteOne({ _id: worker1.profile._id });
      await User.deleteOne({ _id: worker1.user._id });
    }
    if (worker2) {
      await WorkerProfile.deleteOne({ _id: worker2.profile._id });
      await User.deleteOne({ _id: worker2.user._id });
    }
    if (farmer) {
      await User.deleteOne({ _id: farmer.user._id });
    }
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  });

  test('1. Allows public search with NO Authorization header (200 OK)', async () => {
    const res = await request(app).get('/api/v1/workers/search');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('workers');
    expect(Array.isArray(res.body.data.workers)).toBe(true);
    expect(res.body.data).toHaveProperty('pagination');
    expect(res.body.data.pagination.page).toBe(1);
  });

  test('2. Allows search with valid Bearer token (logged in as Farmer)', async () => {
    const res = await request(app)
      .get('/api/v1/workers/search')
      .set('Authorization', `Bearer ${farmer.token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.workers.length).toBeGreaterThanOrEqual(1);
  });

  test('3. Allows search with valid Bearer token (logged in as Worker)', async () => {
    const res = await request(app)
      .get('/api/v1/workers/search')
      .set('Authorization', `Bearer ${worker1.token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.workers.length).toBeGreaterThanOrEqual(1);
  });

  test('4. Filters by keyword (e.g. tractor)', async () => {
    const res = await request(app).get('/api/v1/workers/search?search=tractor');
    expect(res.status).toBe(200);
    const workers = res.body.data.workers;
    expect(workers.some((w) => w.name.includes('Ramesh'))).toBe(true);
    // Gurpreet only has Harvesting skills, so should not match tractor
    const gurpreet = workers.find((w) => w.name.includes('Gurpreet'));
    expect(gurpreet).toBeUndefined();
  });

  test('5. Filters by location (e.g. Nagpur)', async () => {
    const res = await request(app).get('/api/v1/workers/search?location=Nagpur');
    expect(res.status).toBe(200);
    const workers = res.body.data.workers;
    expect(workers.some((w) => w.name.includes('Ramesh'))).toBe(true);
    const gurpreet = workers.find((w) => w.name.includes('Gurpreet'));
    expect(gurpreet).toBeUndefined();
  });

  test('6. Filters by category (e.g. Heavy Machinery)', async () => {
    const res = await request(app).get('/api/v1/workers/search?category=Heavy%20Machinery');
    expect(res.status).toBe(200);
    const workers = res.body.data.workers;
    expect(workers.some((w) => w.name.includes('Ramesh'))).toBe(true);
  });

  test('7. Combined filter: keyword + location + category together', async () => {
    const res = await request(app).get(
      '/api/v1/workers/search?search=tractor&location=Nagpur&category=Heavy%20Machinery'
    );
    expect(res.status).toBe(200);
    const workers = res.body.data.workers;
    expect(workers.some((w) => w.name.includes('Ramesh'))).toBe(true);
    const gurpreet = workers.find((w) => w.name.includes('Gurpreet'));
    expect(gurpreet).toBeUndefined();
  });

  test('8. Handles "All Locations" and "All Categories" as no filter', async () => {
    const res = await request(app).get(
      '/api/v1/workers/search?location=All%20Locations&category=All%20Categories'
    );
    expect(res.status).toBe(200);
    expect(res.body.data.workers.length).toBeGreaterThanOrEqual(2);
  });

  test('9. Returns empty array for non-matching query (no mock data fallback)', async () => {
    const res = await request(app).get('/api/v1/workers/search?search=nonexistentxyz123456');
    expect(res.status).toBe(200);
    expect(res.body.data.workers).toEqual([]);
    expect(res.body.data.pagination.total).toBe(0);
  });

  test('10. Security: never exposes passwords, tokens, OTPs, or Aadhaar numbers', async () => {
    const res = await request(app).get('/api/v1/workers/search');
    expect(res.status).toBe(200);
    const workers = res.body.data.workers;
    for (const w of workers) {
      expect(w.password).toBeUndefined();
      expect(w.passwordHash).toBeUndefined();
      expect(w.refreshToken).toBeUndefined();
      expect(w.accessToken).toBeUndefined();
      expect(w.otpCode).toBeUndefined();
      expect(w.otpExpiresAt).toBeUndefined();
      expect(w.aadhaarNumber).toBeUndefined();
      expect(w.mobile).toBeUndefined();
      expect(w.email).toBeUndefined();
    }
  });

  test('11. Security: protected routes remain protected without token (401)', async () => {
    // /api/v1/profiles/me requires auth
    const res = await request(app).get('/api/v1/profiles/me');
    expect(res.status).toBe(401);
  });
});
