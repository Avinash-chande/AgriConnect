import request from 'supertest';
import mongoose from 'mongoose';
import app from '../app.js';
import { User } from '../models/User.js';
import { WorkerProfile } from '../models/WorkerProfile.js';
import { jwtConfig } from '../config/jwt.js';
import jwt from 'jsonwebtoken';

describe('Farmer Worker Discovery Map Integration Suite', () => {
  let farmerUser;
  let farmerToken;
  let workerUser;
  let workerToken;
  let workerProfile;

  beforeAll(async () => {
    const mongoUri = process.env.MONGODB_TEST_URI || 'mongodb://127.0.0.1:27017/agriconnect_test_db';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }

    await User.deleteMany({ email: /farmer_wmap_test/i });
    await WorkerProfile.deleteMany({ preferredDistrict: 'Map Discovery Test District' });

    // Create Test Farmer
    farmerUser = await User.create({
      name: 'Farmer Sukhdev Singh',
      email: 'farmer_wmap_test_farmer@agriconnect.com',
      password: 'Password123!',
      role: 'Farmer',
      mobile: '9876522222',
    });
    farmerToken = jwt.sign({ id: farmerUser._id, role: 'Farmer' }, jwtConfig.accessSecret, { expiresIn: '1h' });

    // Create Test Worker
    workerUser = await User.create({
      name: 'Worker Amarjit Kumar',
      email: 'farmer_wmap_test_worker@agriconnect.com',
      password: 'Password123!',
      role: 'Worker',
      mobile: '9876511111',
    });
    workerToken = jwt.sign({ id: workerUser._id, role: 'Worker' }, jwtConfig.accessSecret, { expiresIn: '1h' });

    // Worker Profile at Verka (31.65, 75.88)
    workerProfile = await WorkerProfile.create({
      owner: workerUser._id,
      title: 'Tractor Specialist & Harvester',
      skills: ['Tractor Driving', 'Harvesting'],
      experience: 4,
      languages: ['Punjabi', 'Hindi'],
      education: '10th Pass',
      expectedDailyWage: 600,
      availability: 'Immediate',
      preferredDistrict: 'Map Discovery Test District',
      preferredState: 'Punjab',
      rating: 4.8,
      totalJobsCompleted: 10,
      aadhaarNumber: '112233445566',
      address: {
        addressLine: 'GT Road',
        village: 'Verka',
        district: 'Map Discovery Test District',
        state: 'Punjab',
        pincode: '143501',
        latitude: 31.65,
        longitude: 75.88,
      },
    });
  });

  afterAll(async () => {
    await User.deleteMany({ email: /farmer_wmap_test/i });
    await WorkerProfile.deleteMany({ preferredDistrict: 'Map Discovery Test District' });
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });

  it('1. Restricts access to authorized Farmers only (Worker role gets 403 Forbidden)', async () => {
    const res = await request(app)
      .get('/api/v1/location/nearby-workers?lat=31.634&lng=75.8573&radius=25')
      .set('Authorization', `Bearer ${workerToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('2. Authorized Farmer can search worker map markers with distance calculation', async () => {
    const res = await request(app)
      .get('/api/v1/location/nearby-workers?lat=31.634&lng=75.8573&radius=25')
      .set('Authorization', `Bearer ${farmerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);

    const found = res.body.data.find(
      (item) => item.worker._id.toString() === workerProfile._id.toString()
    );
    expect(found).toBeDefined();
    expect(found.distanceKm).toBeGreaterThan(0);
    expect(found.location.type).toBe('Point');

    // Verify PRIVACY PROTECTION: Aadhaar, email, mobile MUST NOT be exposed
    expect(found.worker.aadhaarNumber).toBeUndefined();
    expect(found.worker.email).toBeUndefined();
    expect(found.worker.mobile).toBeUndefined();
  });

  it('3. Multi-skill & minimum experience filtering', async () => {
    const res = await request(app)
      .get('/api/v1/location/nearby-workers?lat=31.634&lng=75.8573&radius=25&skills=Tractor%20Driving&minExperience=3')
      .set('Authorization', `Bearer ${farmerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data[0].worker.skills).toContain('Tractor Driving');
  });
});
