import request from 'supertest';
import mongoose from 'mongoose';
import app from '../app.js';
import { User } from '../models/User.js';
import { Job } from '../models/Job.js';
import { FarmerProfile } from '../models/FarmerProfile.js';

describe('Nearby Jobs 2dsphere $geoNear Integration Suite', () => {
  let farmerUser;
  let activeJob1;
  let activeJob2;
  let closedJob;

  beforeAll(async () => {
    const mongoUri = process.env.MONGODB_TEST_URI || 'mongodb://127.0.0.1:27017/agriconnect_test_db';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }

    await User.deleteMany({ email: 'farmer_nearby_test@agriconnect.com' });
    await Job.deleteMany({ title: /Nearby Test Job/i });

    // Create Test Farmer
    farmerUser = await User.create({
      name: 'Sardar Jagjit Singh',
      email: 'farmer_nearby_test@agriconnect.com',
      password: 'Password123!',
      role: 'Farmer',
      mobile: '9876500000',
      isVerified: true,
    });

    await FarmerProfile.create({
      owner: farmerUser._id,
      farmName: 'Golden Fields Farm',
      farmSize: 15,
      farmSizeUnit: 'Acres',
      farmAddress: {
        district: 'Amritsar',
        state: 'Punjab',
      },
      rating: 4.9,
      totalJobsPosted: 5,
    });

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Job 1: 3.5 km away from search point (31.634, 75.8573) -> Verka (31.65, 75.88)
    activeJob1 = await Job.create({
      farmer: farmerUser._id,
      title: 'Nearby Test Job 1 - Wheat Harvesting',
      description: 'Need harvesters near Verka milk plant.',
      category: 'Harvesting',
      workType: 'Daily Basis',
      numberOfWorkers: 4,
      requiredSkills: ['Wheat Cutting'],
      wageType: 'Daily',
      dailyWage: 600,
      startDate: tomorrow,
      status: 'Active',
      jobAddress: {
        addressLine: 'GT Road',
        village: 'Verka',
        district: 'Amritsar',
        state: 'Punjab',
        pincode: '143501',
        latitude: 31.65,
        longitude: 75.88,
      },
    });

    // Job 2: ~12.8 km away -> Jandiala (31.56, 75.78)
    activeJob2 = await Job.create({
      farmer: farmerUser._id,
      title: 'Nearby Test Job 2 - Tractor Plowing',
      description: 'Plowing required near Jandiala market.',
      category: 'Plowing / Tillage',
      workType: 'Daily Basis',
      numberOfWorkers: 2,
      requiredSkills: ['Tractor Driving'],
      wageType: 'Daily',
      dailyWage: 750,
      startDate: tomorrow,
      status: 'Active',
      jobAddress: {
        addressLine: 'Market Road',
        village: 'Jandiala',
        district: 'Amritsar',
        state: 'Punjab',
        pincode: '143115',
        latitude: 31.56,
        longitude: 75.78,
      },
    });

    // Job 3: Closed job near Verka (Should NOT be returned)
    closedJob = await Job.create({
      farmer: farmerUser._id,
      title: 'Nearby Test Job 3 - Closed Job',
      description: 'Closed job test.',
      category: 'Irrigation',
      workType: 'Daily Basis',
      numberOfWorkers: 1,
      requiredSkills: ['Pumping'],
      wageType: 'Daily',
      dailyWage: 500,
      startDate: tomorrow,
      status: 'Closed',
      jobAddress: {
        addressLine: 'GT Road',
        village: 'Verka',
        district: 'Amritsar',
        state: 'Punjab',
        latitude: 31.65,
        longitude: 75.88,
      },
    });
  });

  afterAll(async () => {
    await User.deleteMany({ email: 'farmer_nearby_test@agriconnect.com' });
    await Job.deleteMany({ title: /Nearby Test Job/i });
    await FarmerProfile.deleteMany({ farmName: 'Golden Fields Farm' });
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });

  it('1. GET /api/v1/location/nearby-jobs with default 10km radius returns only open jobs within 10km', async () => {
    const res = await request(app).get('/api/v1/location/nearby-jobs?lat=31.634&lng=75.8573&radius=10');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);

    // Job 1 is within 10km (~3.5km), Job 2 is >10km, Closed Job is excluded
    expect(res.body.data.length).toBe(1);

    const firstItem = res.body.data[0];
    expect(firstItem.job._id.toString()).toBe(activeJob1._id.toString());
    expect(firstItem.distanceKm).toBeGreaterThan(0);
    expect(firstItem.distanceKm).toBeLessThanOrEqual(10);

    // Verify response structure: { job, distanceKm, location, farmer }
    expect(firstItem.job.title).toBe('Nearby Test Job 1 - Wheat Harvesting');
    expect(firstItem.job.formattedWage).toBe('₹600 / Daily');
    expect(firstItem.location.type).toBe('Point');
    expect(firstItem.farmer.name).toBe('Sardar Jagjit Singh');

    // Verify NO private farmer data (email, mobile, password) is exposed
    expect(firstItem.farmer.email).toBeUndefined();
    expect(firstItem.farmer.mobile).toBeUndefined();
    expect(firstItem.farmer.password).toBeUndefined();
  });

  it('2. GET /api/v1/location/nearby-jobs with 25km radius finds both Job 1 and Job 2 sorted by distance', async () => {
    const res = await request(app).get('/api/v1/location/nearby-jobs?lat=31.634&lng=75.8573&radius=25');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBe(2);

    // Sorted by distance ascending
    expect(res.body.data[0].distanceKm).toBeLessThan(res.body.data[1].distanceKm);
    expect(res.body.meta.pagination.total).toBe(2);
  });

  it('3. GET /api/v1/location/nearby-jobs supports pagination (page & limit)', async () => {
    const res = await request(app).get('/api/v1/location/nearby-jobs?lat=31.634&lng=75.8573&radius=25&page=1&limit=1');

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.meta.pagination.totalPages).toBe(2);
  });

  it('4. Rejects out-of-bounds latitude or longitude with 400 Bad Request', async () => {
    const res = await request(app).get('/api/v1/location/nearby-jobs?lat=120&lng=75.8573');
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});
