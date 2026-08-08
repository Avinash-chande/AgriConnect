import request from 'supertest';
import mongoose from 'mongoose';
import app from '../app.js';
import { User } from '../models/User.js';
import { FarmerProfile } from '../models/FarmerProfile.js';
import { jwtConfig } from '../config/jwt.js';
import jwt from 'jsonwebtoken';

describe('Farm Location Management Suite', () => {
  let farmerUser;
  let farmerToken;
  let workerUser;
  let workerToken;

  beforeAll(async () => {
    const mongoUri = process.env.MONGODB_TEST_URI || 'mongodb://127.0.0.1:27017/agriconnect_test_db';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }

    await User.deleteMany({ email: { $in: ['testfarmer_loc@agriconnect.com', 'testworker_loc@agriconnect.com'] } });
    await FarmerProfile.deleteMany({});

    // Create Test Farmer
    farmerUser = await User.create({
      name: 'Farmer Harpreet',
      email: 'testfarmer_loc@agriconnect.com',
      password: 'Password123!',
      role: 'Farmer',
      mobile: '9876543210',
    });
    farmerToken = jwt.sign({ id: farmerUser._id, role: 'Farmer' }, jwtConfig.accessSecret, { expiresIn: '1h' });

    await FarmerProfile.create({
      owner: farmerUser._id,
      farmName: 'Harpreet Green Acres',
      farmSize: 25,
      farmSizeUnit: 'Acres',
      cropTypes: ['Wheat'],
      farmAddress: {
        addressLine: 'GT Road',
        district: 'Amritsar',
        state: 'Punjab',
        latitude: 31.634,
        longitude: 75.8573,
      },
    });

    // Create Test Worker
    workerUser = await User.create({
      name: 'Worker Gurdeep',
      email: 'testworker_loc@agriconnect.com',
      password: 'Password123!',
      role: 'Worker',
      mobile: '9876543211',
    });
    workerToken = jwt.sign({ id: workerUser._id, role: 'Worker' }, jwtConfig.accessSecret, { expiresIn: '1h' });
  });

  afterAll(async () => {
    await User.deleteMany({ email: { $in: ['testfarmer_loc@agriconnect.com', 'testworker_loc@agriconnect.com'] } });
    await FarmerProfile.deleteMany({});
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });

  it('1. Farmer can update farm location and sync GeoJSON [longitude, latitude]', async () => {
    const payload = {
      addressLine: 'Near Verka Milk Plant',
      village: 'Verka',
      district: 'Amritsar',
      state: 'Punjab',
      pincode: '143501',
      latitude: 31.65,
      longitude: 75.88,
    };

    const res = await request(app)
      .put('/api/v1/profiles/farm-location')
      .set('Authorization', `Bearer ${farmerToken}`)
      .send(payload);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.farmAddress.village).toBe('Verka');
    expect(res.body.data.farmAddress.latitude).toBe(31.65);
    expect(res.body.data.farmAddress.longitude).toBe(75.88);
    expect(res.body.data.location.type).toBe('Point');
    expect(res.body.data.location.coordinates).toEqual([75.88, 31.65]);
  });

  it('2. Worker CANNOT update farmer farm location (403 Forbidden)', async () => {
    const payload = {
      addressLine: 'Hacked Address',
      district: 'Ludhiana',
      state: 'Punjab',
      latitude: 30.9,
      longitude: 75.85,
    };

    const res = await request(app)
      .put('/api/v1/profiles/farm-location')
      .set('Authorization', `Bearer ${workerToken}`)
      .send(payload);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('3. Reject invalid latitude or longitude out of bounds', async () => {
    const payload = {
      district: 'Amritsar',
      state: 'Punjab',
      latitude: 120, // Invalid
      longitude: 75.88,
    };

    const res = await request(app)
      .put('/api/v1/profiles/farm-location')
      .set('Authorization', `Bearer ${farmerToken}`)
      .send(payload);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('4. Farmer can delete/reset farm location', async () => {
    const res = await request(app)
      .delete('/api/v1/profiles/farm-location')
      .set('Authorization', `Bearer ${farmerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.location).toBeNull();
  });
});
