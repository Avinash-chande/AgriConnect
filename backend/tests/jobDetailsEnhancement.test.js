import request from 'supertest';
import mongoose from 'mongoose';
import app from '../app.js';
import { User } from '../models/User.js';
import { Job } from '../models/Job.js';
import { jwtConfig } from '../config/jwt.js';
import jwt from 'jsonwebtoken';

describe('Job Details Location Enhancement Suite', () => {
  let farmerUser;
  let farmerToken;
  let activeJob;

  beforeAll(async () => {
    const mongoUri = process.env.MONGODB_TEST_URI || 'mongodb://127.0.0.1:27017/agriconnect_test_db';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }

    await User.deleteMany({ email: 'farmer_details_map_test@agriconnect.com' });
    await Job.deleteMany({ title: /Details Map Test Job/i });

    // Create Test Farmer
    farmerUser = await User.create({
      name: 'Farmer Gurmail Singh',
      email: 'farmer_details_map_test@agriconnect.com',
      password: 'Password123!',
      role: 'Farmer',
      mobile: '9876541111',
    });
    farmerToken = jwt.sign({ id: farmerUser._id, role: 'Farmer' }, jwtConfig.accessSecret, { expiresIn: '1h' });

    // Create Test Job with complete address & GeoJSON Point (Verka: 31.65, 75.88)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    activeJob = await Job.create({
      farmer: farmerUser._id,
      title: 'Details Map Test Job - Wheat Sowing',
      description: 'Require experienced workers for wheat sowing near Verka site.',
      category: 'Sowing / Planting',
      workType: 'Daily Basis',
      numberOfWorkers: 3,
      requiredSkills: ['Crop Sowing', 'Tractor Driving'],
      wageType: 'Daily',
      dailyWage: 600,
      startDate: tomorrow,
      status: 'Active',
      jobAddress: {
        addressLine: 'GT Road Near Verka Station',
        village: 'Verka',
        district: 'Amritsar',
        state: 'Punjab',
        pincode: '143501',
        latitude: 31.65,
        longitude: 75.88,
      },
    });
  });

  afterAll(async () => {
    await User.deleteMany({ email: 'farmer_details_map_test@agriconnect.com' });
    await Job.deleteMany({ title: /Details Map Test Job/i });
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });

  it('1. GET /api/v1/jobs/:id returns complete job location address and GeoJSON coordinates', async () => {
    const res = await request(app).get(`/api/v1/jobs/${activeJob._id}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();

    const jobData = res.body.data;
    expect(jobData.jobAddress).toBeDefined();
    expect(jobData.jobAddress.village).toBe('Verka');
    expect(jobData.jobAddress.district).toBe('Amritsar');
    expect(jobData.jobAddress.latitude).toBe(31.65);
    expect(jobData.jobAddress.longitude).toBe(75.88);

    // GeoJSON Point verification
    expect(jobData.location).toBeDefined();
    expect(jobData.location.type).toBe('Point');
    expect(jobData.location.coordinates).toEqual([75.88, 31.65]);
  });

  it('2. GET /api/v1/location/nearby-jobs finds nearby jobs near job location site', async () => {
    const res = await request(app).get(
      `/api/v1/location/nearby-jobs?lat=31.65&lng=75.88&radius=25`
    );

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);

    const foundItem = res.body.data.find(
      (item) => item.job._id.toString() === activeJob._id.toString()
    );
    expect(foundItem).toBeDefined();
    expect(foundItem.distanceKm).toBe(0);
  });

  it('3. GET /api/v1/location/route provides driving navigation payload from user GPS to job site', async () => {
    const userLat = 31.634; // Amritsar center
    const userLng = 75.8573;

    const res = await request(app).get(
      `/api/v1/location/route?startLat=${userLat}&startLng=${userLng}&endLat=${activeJob.jobAddress.latitude}&endLng=${activeJob.jobAddress.longitude}`
    );

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.distance.kilometers).toBeGreaterThan(0);
    expect(res.body.data.duration.minutes).toBeGreaterThan(0);
  });
});
