import request from 'supertest';
import mongoose from 'mongoose';
import app from '../app.js';
import { User } from '../models/User.js';
import { Job } from '../models/Job.js';
import { jwtConfig } from '../config/jwt.js';
import jwt from 'jsonwebtoken';

describe('Map-Based Job Discovery Integration Suite', () => {
  let farmerUser;
  let farmerToken;
  let activeJob1;
  let activeJob2;

  beforeAll(async () => {
    const mongoUri = process.env.MONGODB_TEST_URI || 'mongodb://127.0.0.1:27017/agriconnect_test_db';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }

    await User.deleteMany({ email: 'farmer_map_discovery_test@agriconnect.com' });
    await Job.deleteMany({ title: /Map Discovery Test/i });

    // Create Test Farmer
    farmerUser = await User.create({
      name: 'Farmer Balwinder Singh',
      email: 'farmer_map_discovery_test@agriconnect.com',
      password: 'Password123!',
      role: 'Farmer',
      mobile: '9876533333',
    });
    farmerToken = jwt.sign({ id: farmerUser._id, role: 'Farmer' }, jwtConfig.accessSecret, { expiresIn: '1h' });

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Job 1: Verka (31.65, 75.88)
    activeJob1 = await Job.create({
      farmer: farmerUser._id,
      title: 'Map Discovery Test Job 1 - Wheat Harvesting',
      description: 'Need urgent workers for harvesting.',
      category: 'Harvesting',
      workType: 'Daily Basis',
      numberOfWorkers: 4,
      requiredSkills: ['Harvesting'],
      wageType: 'Daily',
      dailyWage: 700,
      isUrgent: true,
      startDate: tomorrow,
      status: 'Active',
      jobAddress: {
        addressLine: 'GT Road',
        village: 'Verka',
        district: 'Amritsar Map',
        state: 'Punjab',
        pincode: '143501',
        latitude: 31.65,
        longitude: 75.88,
      },
    });

    // Job 2: Jandiala (31.56, 75.78)
    activeJob2 = await Job.create({
      farmer: farmerUser._id,
      title: 'Map Discovery Test Job 2 - Tractor Plowing',
      description: 'Plowing required near Jandiala.',
      category: 'Plowing / Tillage',
      workType: 'Daily Basis',
      numberOfWorkers: 2,
      requiredSkills: ['Tractor Driving'],
      wageType: 'Daily',
      dailyWage: 800,
      isFeatured: true,
      startDate: tomorrow,
      status: 'Active',
      jobAddress: {
        addressLine: 'Market Road',
        village: 'Jandiala',
        district: 'Amritsar Map',
        state: 'Punjab',
        pincode: '143115',
        latitude: 31.56,
        longitude: 75.78,
      },
    });
  });

  afterAll(async () => {
    await User.deleteMany({ email: 'farmer_map_discovery_test@agriconnect.com' });
    await Job.deleteMany({ title: /Map Discovery Test/i });
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });

  it('1. GET /api/v1/location/nearby-jobs returns clustered job marker payload within radius', async () => {
    const res = await request(app).get(
      `/api/v1/location/nearby-jobs?lat=31.634&lng=75.8573&radius=25`
    );

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(2);

    const first = res.body.data[0];
    expect(first.job).toBeDefined();
    expect(first.location).toBeDefined();
    expect(first.location.type).toBe('Point');
    expect(first.distanceKm).toBeDefined();
  });

  it('2. Multi-filter matching: Category, Min Wage, Urgent, and Work Type', async () => {
    const res = await request(app).get(
      `/api/v1/location/nearby-jobs?lat=31.634&lng=75.8573&radius=25&category=Harvesting&minWage=650&isUrgent=true`
    );

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].job._id.toString()).toBe(activeJob1._id.toString());
  });

  it('3. Rejects out-of-bounds coordinates with 400 Bad Request', async () => {
    const res = await request(app).get(`/api/v1/location/nearby-jobs?lat=120&lng=75.8573`);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});
