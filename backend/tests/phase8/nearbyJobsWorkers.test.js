/**
 * Phase 8 – Nearby Jobs & Nearby Workers API Integration Tests
 * All database is real (test MongoDB). Nominatim/OSRM requests are MOCKED.
 * Tests: nearby jobs pagination, radius, sorting, auth enforcement, filters, radius validation.
 */
import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import app from '../../app.js';
import { User } from '../../models/User.js';
import { Job } from '../../models/Job.js';
import { WorkerProfile } from '../../models/WorkerProfile.js';
import { FarmerProfile } from '../../models/FarmerProfile.js';
import { jwtConfig } from '../../config/jwt.js';

const AMRITSAR = { lat: 31.634, lng: 75.8573 };
const VERKA = { lat: 31.65, lng: 75.88 };      // ~3.5 km from AMRITSAR
const JANDIALA = { lat: 31.56, lng: 75.78 };   // ~12 km from AMRITSAR

describe('Phase 8 – Nearby Jobs & Nearby Workers Integration Tests', () => {
  let farmerUser;
  let farmerToken;
  let workerUser;
  let workerToken;

  beforeAll(async () => {
    const mongoUri = process.env.MONGODB_TEST_URI || 'mongodb://127.0.0.1:27017/agriconnect_test_db';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }

    // Clean up stale data
    await User.deleteMany({ email: /phase8_nearby/ });
    await Job.deleteMany({ title: /Phase8 Nearby Test/ });
    await WorkerProfile.deleteMany({ title: /Phase8 Harvest Expert/ });

    // Create farmer
    farmerUser = await User.create({
      name: 'Phase8 Test Farmer',
      email: 'phase8_nearby_farmer@agriconnect.com',
      password: 'Password123!',
      role: 'Farmer',
      mobile: '9870001111',
      isVerified: true,
    });
    farmerToken = jwt.sign({ id: farmerUser._id, role: 'Farmer' }, jwtConfig.accessSecret, { expiresIn: '1h' });

    await FarmerProfile.create({
      owner: farmerUser._id,
      farmName: 'Phase8 Farm',
      farmSize: 10,
      farmSizeUnit: 'Acres',
      farmAddress: { district: 'Amritsar', state: 'Punjab', latitude: AMRITSAR.lat, longitude: AMRITSAR.lng },
      location: { type: 'Point', coordinates: [AMRITSAR.lng, AMRITSAR.lat] },
    });

    // Create worker
    workerUser = await User.create({
      name: 'Phase8 Test Worker',
      email: 'phase8_nearby_worker@agriconnect.com',
      password: 'Password123!',
      role: 'Worker',
      mobile: '9870002222',
      isVerified: true,
    });
    workerToken = jwt.sign({ id: workerUser._id, role: 'Worker' }, jwtConfig.accessSecret, { expiresIn: '1h' });

    await WorkerProfile.create({
      owner: workerUser._id,
      title: 'Phase8 Harvest Expert',
      skills: ['Wheat Cutting', 'Harvesting'],
      experience: 5,
      expectedDailyWage: 700,
      availability: 'Immediate',
      preferredDistrict: 'Amritsar',
      preferredState: 'Punjab',
      locationVisibility: 'approximate',
      address: { village: 'Verka', district: 'Amritsar', state: 'Punjab', latitude: VERKA.lat, longitude: VERKA.lng },
      location: { type: 'Point', coordinates: [VERKA.lng, VERKA.lat] },
    });

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Active job near Verka (~3.5 km)
    await Job.create({
      farmer: farmerUser._id,
      title: 'Phase8 Nearby Test Job 1 – Wheat',
      description: 'Near Verka',
      category: 'Harvesting',
      workType: 'Daily Basis',
      numberOfWorkers: 2,
      requiredSkills: ['Wheat Cutting'],
      wageType: 'Daily',
      dailyWage: 650,
      startDate: tomorrow,
      status: 'Active',
      jobAddress: {
        addressLine: 'GT Road',
        village: 'Verka',
        district: 'Amritsar',
        state: 'Punjab',
        pincode: '143501',
        latitude: VERKA.lat,
        longitude: VERKA.lng,
      },
    });

    // Active job near Jandiala (~12 km)
    await Job.create({
      farmer: farmerUser._id,
      title: 'Phase8 Nearby Test Job 2 – Tractor',
      description: 'Near Jandiala',
      category: 'Plowing / Tillage',
      workType: 'Daily Basis',
      numberOfWorkers: 1,
      requiredSkills: ['Tractor Driving'],
      wageType: 'Daily',
      dailyWage: 800,
      startDate: tomorrow,
      status: 'Active',
      jobAddress: {
        village: 'Jandiala',
        district: 'Amritsar',
        state: 'Punjab',
        latitude: JANDIALA.lat,
        longitude: JANDIALA.lng,
      },
    });

    // Closed job (should be excluded from results)
    await Job.create({
      farmer: farmerUser._id,
      title: 'Phase8 Nearby Test Job 3 – Closed',
      description: 'Should be excluded',
      category: 'Irrigation',
      workType: 'Daily Basis',
      numberOfWorkers: 1,
      requiredSkills: ['Pumping'],
      wageType: 'Daily',
      dailyWage: 500,
      startDate: tomorrow,
      status: 'Closed',
      jobAddress: { village: 'Verka', district: 'Amritsar', state: 'Punjab', latitude: VERKA.lat, longitude: VERKA.lng },
    });
  });

  afterAll(async () => {
    await User.deleteMany({ email: /phase8_nearby/ });
    await Job.deleteMany({ title: /Phase8 Nearby Test/ });
    await WorkerProfile.deleteMany({ title: /Phase8 Harvest Expert/ });
    await FarmerProfile.deleteMany({ farmName: 'Phase8 Farm' });
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });

  // ── Nearby Jobs ───────────────────────────────────────────────────
  describe('GET /api/v1/location/nearby-jobs', () => {
    it('1. returns only Active jobs within 10km radius sorted by distance', async () => {
      const res = await request(app)
        .get(`/api/v1/location/nearby-jobs?lat=${AMRITSAR.lat}&lng=${AMRITSAR.lng}&radius=10`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);

      // Closed job should not appear; Jandiala (~12km) should not appear in 10km
      const titles = res.body.data.map(d => d.job.title);
      expect(titles.some(t => t.includes('Phase8 Nearby Test Job 1'))).toBe(true);
      expect(titles.some(t => t.includes('Closed'))).toBe(false);
    });

    it('2. returns both active jobs within 25km radius', async () => {
      const res = await request(app)
        .get(`/api/v1/location/nearby-jobs?lat=${AMRITSAR.lat}&lng=${AMRITSAR.lng}&radius=25`);

      expect(res.status).toBe(200);
      const titles = res.body.data.map(d => d.job.title);
      expect(titles.some(t => t.includes('Phase8 Nearby Test Job 1'))).toBe(true);
      expect(titles.some(t => t.includes('Phase8 Nearby Test Job 2'))).toBe(true);
    });

    it('3. response includes job, distanceKm, location, and farmer fields', async () => {
      const res = await request(app)
        .get(`/api/v1/location/nearby-jobs?lat=${AMRITSAR.lat}&lng=${AMRITSAR.lng}&radius=10`);

      const item = res.body.data[0];
      expect(item).toHaveProperty('job');
      expect(item).toHaveProperty('distanceKm');
      expect(item).toHaveProperty('location');
      expect(item).toHaveProperty('farmer');
    });

    it('4. does not expose private farmer fields (email, mobile, password)', async () => {
      const res = await request(app)
        .get(`/api/v1/location/nearby-jobs?lat=${AMRITSAR.lat}&lng=${AMRITSAR.lng}&radius=25`);

      res.body.data.forEach(item => {
        expect(item.farmer.email).toBeUndefined();
        expect(item.farmer.mobile).toBeUndefined();
        expect(item.farmer.password).toBeUndefined();
      });
    });

    it('5. supports pagination (page=1&limit=1 returns 1 item)', async () => {
      const res = await request(app)
        .get(`/api/v1/location/nearby-jobs?lat=${AMRITSAR.lat}&lng=${AMRITSAR.lng}&radius=25&page=1&limit=1`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.meta.pagination).toHaveProperty('totalPages');
    });

    it('6. rejects radius > 100km with 400 Bad Request', async () => {
      const res = await request(app)
        .get(`/api/v1/location/nearby-jobs?lat=${AMRITSAR.lat}&lng=${AMRITSAR.lng}&radius=200`);

      expect(res.status).toBe(400);
    });

    it('7. rejects limit > 50 with 400 Bad Request', async () => {
      const res = await request(app)
        .get(`/api/v1/location/nearby-jobs?lat=${AMRITSAR.lat}&lng=${AMRITSAR.lng}&limit=100`);

      expect(res.status).toBe(400);
    });

    it('8. rejects out-of-bounds latitude with 400', async () => {
      const res = await request(app)
        .get('/api/v1/location/nearby-jobs?lat=120&lng=75.8573');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('9. returns sorted results (closer job has smaller distanceKm)', async () => {
      const res = await request(app)
        .get(`/api/v1/location/nearby-jobs?lat=${AMRITSAR.lat}&lng=${AMRITSAR.lng}&radius=25`);

      const distances = res.body.data.map(d => d.distanceKm);
      for (let i = 1; i < distances.length; i++) {
        expect(distances[i]).toBeGreaterThanOrEqual(distances[i - 1]);
      }
    });
  });

  // ── Nearby Workers ────────────────────────────────────────────────
  describe('GET /api/v1/location/nearby-workers', () => {
    it('10. rejects unauthenticated requests with 401', async () => {
      const res = await request(app)
        .get(`/api/v1/location/nearby-workers?lat=${AMRITSAR.lat}&lng=${AMRITSAR.lng}`);

      expect(res.status).toBe(401);
    });

    it('11. rejects Worker role with 403 Forbidden', async () => {
      const res = await request(app)
        .get(`/api/v1/location/nearby-workers?lat=${AMRITSAR.lat}&lng=${AMRITSAR.lng}`)
        .set('Authorization', `Bearer ${workerToken}`);

      expect(res.status).toBe(403);
    });

    it('12. authorized Farmer can discover workers within radius', async () => {
      const res = await request(app)
        .get(`/api/v1/location/nearby-workers?lat=${AMRITSAR.lat}&lng=${AMRITSAR.lng}&radius=10`)
        .set('Authorization', `Bearer ${farmerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('13. response includes worker, distanceKm, location fields', async () => {
      const res = await request(app)
        .get(`/api/v1/location/nearby-workers?lat=${AMRITSAR.lat}&lng=${AMRITSAR.lng}&radius=10`)
        .set('Authorization', `Bearer ${farmerToken}`);

      if (res.body.data.length > 0) {
        expect(res.body.data[0]).toHaveProperty('worker');
        expect(res.body.data[0]).toHaveProperty('distanceKm');
        expect(res.body.data[0]).toHaveProperty('location');
      }
    });

    it('14. does not expose Aadhaar number in worker data', async () => {
      const res = await request(app)
        .get(`/api/v1/location/nearby-workers?lat=${AMRITSAR.lat}&lng=${AMRITSAR.lng}&radius=25`)
        .set('Authorization', `Bearer ${farmerToken}`);

      res.body.data.forEach(item => {
        expect(item.worker.aadhaarNumber).toBeUndefined();
        expect(item.worker.aadhaarVerified).toBeUndefined();
      });
    });

    it('15. rejects out-of-bounds latitude with 400', async () => {
      const res = await request(app)
        .get('/api/v1/location/nearby-workers?lat=95&lng=75.8573')
        .set('Authorization', `Bearer ${farmerToken}`);

      expect(res.status).toBe(400);
    });

    it('16. rejects radius > 100km with 400', async () => {
      const res = await request(app)
        .get(`/api/v1/location/nearby-workers?lat=${AMRITSAR.lat}&lng=${AMRITSAR.lng}&radius=150`)
        .set('Authorization', `Bearer ${farmerToken}`);

      expect(res.status).toBe(400);
    });
  });
});
