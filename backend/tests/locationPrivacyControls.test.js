import request from 'supertest';
import mongoose from 'mongoose';
import app from '../app.js';
import { User } from '../models/User.js';
import { WorkerProfile } from '../models/WorkerProfile.js';
import { FarmerProfile } from '../models/FarmerProfile.js';
import { applyLocationPrivacy, applyCoordinateJitter } from '../utils/locationPrivacy.js';
import { jwtConfig } from '../config/jwt.js';
import jwt from 'jsonwebtoken';

describe('Location Privacy Controls Integration Suite', () => {
  let workerUser;
  let workerToken;
  let farmerUser;
  let farmerToken;
  let workerProfile;

  beforeAll(async () => {
    const mongoUri = process.env.MONGODB_TEST_URI || 'mongodb://127.0.0.1:27017/agriconnect_test_db';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }

    await User.deleteMany({ email: /privacy_control_test/i });
    await WorkerProfile.deleteMany({ preferredDistrict: 'Privacy Test District' });

    workerUser = await User.create({
      name: 'Worker Privacy Tester',
      email: 'privacy_control_test_worker@agriconnect.com',
      password: 'Password123!',
      role: 'Worker',
      mobile: '9876599999',
    });
    workerToken = jwt.sign({ id: workerUser._id, role: 'Worker' }, jwtConfig.accessSecret, { expiresIn: '1h' });

    farmerUser = await User.create({
      name: 'Farmer Privacy Tester',
      email: 'privacy_control_test_farmer@agriconnect.com',
      password: 'Password123!',
      role: 'Farmer',
      mobile: '9876588888',
    });
    farmerToken = jwt.sign({ id: farmerUser._id, role: 'Farmer' }, jwtConfig.accessSecret, { expiresIn: '1h' });

    workerProfile = await WorkerProfile.create({
      owner: workerUser._id,
      title: 'Agricultural Harvester',
      skills: ['Harvesting'],
      experience: 5,
      languages: ['Punjabi'],
      expectedDailyWage: 700,
      availability: 'Immediate',
      preferredDistrict: 'Privacy Test District',
      preferredState: 'Punjab',
      locationVisibility: 'approximate',
      address: {
        addressLine: '123 Private Farm Lane',
        village: 'Verka',
        district: 'Privacy Test District',
        state: 'Punjab',
        pincode: '143501',
        latitude: 31.65,
        longitude: 75.88,
      },
    });
  });

  afterAll(async () => {
    await User.deleteMany({ email: /privacy_control_test/i });
    await WorkerProfile.deleteMany({ preferredDistrict: 'Privacy Test District' });
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });

  it('1. PUT /api/v1/profiles/location-privacy updates locationVisibility preference', async () => {
    const res = await request(app)
      .put('/api/v1/profiles/location-privacy')
      .set('Authorization', `Bearer ${workerToken}`)
      .send({ locationVisibility: 'private' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.locationVisibility).toBe('private');
  });

  it('2. applyLocationPrivacy sanitizes coordinates for private mode', async () => {
    const freshProfile = await WorkerProfile.findById(workerProfile._id);
    const sanitized = applyLocationPrivacy(freshProfile.toObject(), farmerUser);
    expect(sanitized.address.latitude).toBeNull();
    expect(sanitized.address.longitude).toBeNull();
  });

  it('3. applyLocationPrivacy allows exact coordinates for profile owner', async () => {
    const freshProfile = await WorkerProfile.findById(workerProfile._id);
    const sanitized = applyLocationPrivacy(freshProfile.toObject(), workerUser);
    expect(sanitized.address.latitude).toBe(31.65);
    expect(sanitized.address.longitude).toBe(75.88);
  });

  it('4. DELETE /api/v1/profiles/saved-location clears saved location from profile', async () => {
    const res = await request(app)
      .delete('/api/v1/profiles/saved-location')
      .set('Authorization', `Bearer ${workerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const updated = await WorkerProfile.findById(workerProfile._id);
    expect(updated.address).toBeNull();
  });
});
