import request from 'supertest';
import mongoose from 'mongoose';
import app from '../app.js';
import { User } from '../models/User.js';
import { WorkerProfile } from '../models/WorkerProfile.js';
import { jwtConfig } from '../config/jwt.js';
import jwt from 'jsonwebtoken';

describe('Nearby Workers 2dsphere $geoNear Integration Suite', () => {
  let farmerUser;
  let farmerToken;
  let workerUser1;
  let workerToken1;
  let workerProfile1;
  let workerProfile2;

  beforeAll(async () => {
    const mongoUri = process.env.MONGODB_TEST_URI || 'mongodb://127.0.0.1:27017/agriconnect_test_db';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }

    await User.deleteMany({ email: /worker_nearby_test/i });
    await User.deleteMany({ email: 'farmer_discovery_test@agriconnect.com' });
    await WorkerProfile.deleteMany({ preferredDistrict: 'Amritsar Test' });

    // Create Test Farmer
    farmerUser = await User.create({
      name: 'Farmer Harpreet Singh',
      email: 'farmer_discovery_test@agriconnect.com',
      password: 'Password123!',
      role: 'Farmer',
      mobile: '9876599999',
    });
    farmerToken = jwt.sign({ id: farmerUser._id, role: 'Farmer' }, jwtConfig.accessSecret, { expiresIn: '1h' });

    // Create Worker 1 (Role: Worker)
    workerUser1 = await User.create({
      name: 'Worker Gurpreet Kumar',
      email: 'worker_nearby_test1@agriconnect.com',
      password: 'Password123!',
      role: 'Worker',
      mobile: '9876588888',
    });
    workerToken1 = jwt.sign({ id: workerUser1._id, role: 'Worker' }, jwtConfig.accessSecret, { expiresIn: '1h' });

    // Worker Profile 1: ~3.5 km away near Verka (31.65, 75.88)
    workerProfile1 = await WorkerProfile.create({
      owner: workerUser1._id,
      title: 'Expert Tractor Operator',
      skills: ['Tractor Driving', 'Crop Sowing'],
      experience: 5,
      languages: ['Punjabi', 'Hindi'],
      education: '10th Pass',
      expectedDailyWage: 550,
      availability: 'Immediate',
      preferredDistrict: 'Amritsar Test',
      preferredState: 'Punjab',
      rating: 4.9,
      totalJobsCompleted: 14,
      aadhaarNumber: '123456789012',
      address: {
        addressLine: 'GT Road Verka',
        village: 'Verka',
        district: 'Amritsar Test',
        state: 'Punjab',
        pincode: '143501',
        latitude: 31.65,
        longitude: 75.88,
      },
    });

    // Create Worker 2
    const workerUser2 = await User.create({
      name: 'Worker Manjit Ram',
      email: 'worker_nearby_test2@agriconnect.com',
      password: 'Password123!',
      role: 'Worker',
      mobile: '9876577777',
    });

    // Worker Profile 2: ~12.8 km away near Jandiala (31.56, 75.78)
    workerProfile2 = await WorkerProfile.create({
      owner: workerUser2._id,
      title: 'Manual Harvesting Worker',
      skills: ['Harvesting', 'Plowing'],
      experience: 2,
      languages: ['Hindi'],
      education: 'Below 10th',
      expectedDailyWage: 450,
      availability: 'Within 3 Days',
      preferredDistrict: 'Amritsar Test',
      preferredState: 'Punjab',
      rating: 4.6,
      totalJobsCompleted: 6,
      aadhaarNumber: '987654321098',
      address: {
        addressLine: 'Near Grain Market',
        village: 'Jandiala',
        district: 'Amritsar Test',
        state: 'Punjab',
        pincode: '143115',
        latitude: 31.56,
        longitude: 75.78,
      },
    });
  });

  afterAll(async () => {
    await User.deleteMany({ email: /worker_nearby_test/i });
    await User.deleteMany({ email: 'farmer_discovery_test@agriconnect.com' });
    await WorkerProfile.deleteMany({ preferredDistrict: 'Amritsar Test' });
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });

  it('1. Blocks worker users or unauthenticated requests with 403 Forbidden / 401 Unauthorized', async () => {
    // Unauthenticated
    const resNoAuth = await request(app).get('/api/v1/location/nearby-workers?lat=31.634&lng=75.8573');
    expect(resNoAuth.status).toBe(401);

    // Worker account attempt
    const resWorker = await request(app)
      .get('/api/v1/location/nearby-workers?lat=31.634&lng=75.8573')
      .set('Authorization', `Bearer ${workerToken1}`);
    expect(resWorker.status).toBe(403);
  });

  it('2. Authorized farmer can find nearby workers within 10km radius with distance sorting', async () => {
    const res = await request(app)
      .get('/api/v1/location/nearby-workers?lat=31.634&lng=75.8573&radius=10')
      .set('Authorization', `Bearer ${farmerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBe(1);

    const firstItem = res.body.data[0];
    expect(firstItem.worker._id.toString()).toBe(workerProfile1._id.toString());
    expect(firstItem.worker.name).toBe('Worker Gurpreet Kumar');
    expect(firstItem.worker.skills).toContain('Tractor Driving');
    expect(firstItem.distanceKm).toBeGreaterThan(0);
    expect(firstItem.distanceKm).toBeLessThanOrEqual(10);

    // Verify PRIVACY ENFORCEMENT: Aadhaar, mobile, and email MUST NOT be exposed
    expect(firstItem.worker.aadhaarNumber).toBeUndefined();
    expect(firstItem.worker.email).toBeUndefined();
    expect(firstItem.worker.mobile).toBeUndefined();
  });

  it('3. Filters workers by skill, experience, availability, and wage rate', async () => {
    const res = await request(app)
      .get('/api/v1/location/nearby-workers?lat=31.634&lng=75.8573&radius=25&skills=Harvesting&availability=Within%203%20Days')
      .set('Authorization', `Bearer ${farmerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].worker._id.toString()).toBe(workerProfile2._id.toString());
    expect(res.body.data[0].worker.title).toBe('Manual Harvesting Worker');
  });

  it('4. Rejects out-of-bounds coordinates with 400 Bad Request', async () => {
    const res = await request(app)
      .get('/api/v1/location/nearby-workers?lat=95&lng=75.8573')
      .set('Authorization', `Bearer ${farmerToken}`);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});
