import request from 'supertest';
import mongoose from 'mongoose';
import app from '../app.js';
import { User } from '../models/User.js';
import { Job } from '../models/Job.js';
import { jwtConfig } from '../config/jwt.js';
import jwt from 'jsonwebtoken';

describe('Job Location & Geospatial Integration Suite', () => {
  let farmerUser;
  let farmerToken;
  let createdJob;

  beforeAll(async () => {
    const mongoUri = process.env.MONGODB_TEST_URI || 'mongodb://127.0.0.1:27017/agriconnect_test_db';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }

    await User.deleteMany({ email: 'farmer_job_loc@agriconnect.com' });
    await Job.deleteMany({ title: /Harvesting Job Geolocation/i });

    // Create Test Farmer
    farmerUser = await User.create({
      name: 'Farmer Baldev',
      email: 'farmer_job_loc@agriconnect.com',
      password: 'Password123!',
      role: 'Farmer',
      mobile: '9876543222',
    });
    farmerToken = jwt.sign({ id: farmerUser._id, role: 'Farmer' }, jwtConfig.accessSecret, { expiresIn: '1h' });
  });

  afterAll(async () => {
    await User.deleteMany({ email: 'farmer_job_loc@agriconnect.com' });
    await Job.deleteMany({ title: /Harvesting Job Geolocation/i });
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });

  it('1. Creating a job with jobAddress automatically syncs GeoJSON Point [longitude, latitude]', async () => {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + 1);

    const payload = {
      title: 'Harvesting Job Geolocation Test',
      description: 'Need skilled harvesters for 50 acres of wheat field in Verka district.',
      category: 'Harvesting',
      workType: 'Daily Basis',
      numberOfWorkers: 5,
      requiredSkills: ['Tractor Driving', 'Crop Harvesting'],
      wageType: 'Daily',
      dailyWage: 650,
      startDate: startDate.toISOString().split('T')[0],
      workingHours: 8,
      jobAddress: {
        addressLine: 'Near Milk Plant GT Road',
        village: 'Verka',
        district: 'Amritsar',
        state: 'Punjab',
        pincode: '143501',
        latitude: 31.65,
        longitude: 75.88,
      },
    };

    const res = await request(app)
      .post('/api/v1/jobs')
      .set('Authorization', `Bearer ${farmerToken}`)
      .send(payload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    createdJob = res.body.data;

    expect(createdJob.jobAddress.village).toBe('Verka');
    expect(createdJob.jobAddress.latitude).toBe(31.65);
    expect(createdJob.jobAddress.longitude).toBe(75.88);

    // Verify GeoJSON [longitude, latitude] array format
    expect(createdJob.location.type).toBe('Point');
    expect(createdJob.location.coordinates).toEqual([75.88, 31.65]);
  });

  it('2. Updating job location updates jobAddress and re-syncs GeoJSON location', async () => {
    const updatePayload = {
      jobAddress: {
        addressLine: 'Near Jandiala Grain Market',
        village: 'Jandiala Guru',
        district: 'Amritsar',
        state: 'Punjab',
        pincode: '143115',
        latitude: 31.56,
        longitude: 75.02,
      },
    };

    const res = await request(app)
      .put(`/api/v1/jobs/${createdJob._id}`)
      .set('Authorization', `Bearer ${farmerToken}`)
      .send(updatePayload);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.jobAddress.village).toBe('Jandiala Guru');
    expect(res.body.data.jobAddress.latitude).toBe(31.56);
    expect(res.body.data.jobAddress.longitude).toBe(75.02);
    expect(res.body.data.location.coordinates).toEqual([75.02, 31.56]);
  });

  it('3. GET /api/v1/location/nearby-jobs should find job within radius', async () => {
    const res = await request(app).get('/api/v1/location/nearby-jobs?lat=31.56&lng=75.02&radiusKm=20');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });
});
