import request from 'supertest';
import mongoose from 'mongoose';
import { jest } from '@jest/globals';
import app from '../app.js';
import { User } from '../models/User.js';
import { validateGeoJSONInput } from '../validators/locationValidator.js';
import { jwtConfig } from '../config/jwt.js';
import jwt from 'jsonwebtoken';

describe('Location APIs Security & Anti-Abuse Integration Suite', () => {
  let workerToken;
  let farmerToken;

  beforeAll(async () => {
    const mongoUri = process.env.MONGODB_TEST_URI || 'mongodb://127.0.0.1:27017/agriconnect_test_db';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }

    const workerUser = await User.create({
      name: 'Security Test Worker',
      email: 'sec_test_worker@agriconnect.com',
      password: 'Password123!',
      role: 'Worker',
      mobile: '9876543210',
    });
    workerToken = jwt.sign({ id: workerUser._id, role: 'Worker' }, jwtConfig.accessSecret, { expiresIn: '1h' });

    const farmerUser = await User.create({
      name: 'Security Test Farmer',
      email: 'sec_test_farmer@agriconnect.com',
      password: 'Password123!',
      role: 'Farmer',
      mobile: '9876543211',
    });
    farmerToken = jwt.sign({ id: farmerUser._id, role: 'Farmer' }, jwtConfig.accessSecret, { expiresIn: '1h' });
  });

  afterAll(async () => {
    await User.deleteMany({ email: /sec_test/i });
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });

  it('1. Rejects out-of-bounds latitude or longitude queries with 400 Bad Request', async () => {
    const res = await request(app).get('/api/v1/location/reverse?lat=120&lng=75.8573');
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('2. Rejects search radius queries exceeding maximum cap (100km limit)', async () => {
    const res = await request(app).get('/api/v1/location/nearby-jobs?lat=31.634&lng=75.8573&radius=500');
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('3. Sanitizes NoSQL injection characters from geocoding search queries', async () => {
    const res = await request(app).get('/api/v1/location/geocode?q=Amritsar$gt');
    expect(res.status).toBe(200);
  });

  it('4. Rejects invalid GeoJSON inputs via validateGeoJSONInput middleware', () => {
    const req = { body: { location: { type: 'Point', coordinates: [250, 45] } } };
    const res = {};
    const next = jest.fn();

    validateGeoJSONInput(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.anything());
  });

  it('5. Rejects unauthorized worker discovery attempts (Workers get 403 Forbidden)', async () => {
    const res = await request(app)
      .get('/api/v1/location/nearby-workers?lat=31.634&lng=75.8573')
      .set('Authorization', `Bearer ${workerToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('6. Rejects unauthorized farm location updates (Workers get 403 Forbidden)', async () => {
    const res = await request(app)
      .put('/api/v1/profiles/farm-location')
      .set('Authorization', `Bearer ${workerToken}`)
      .send({
        addressLine: 'Hack Street',
        village: 'Unauthorized',
        district: 'Amritsar',
        state: 'Punjab',
        latitude: 31.634,
        longitude: 75.8573,
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });
});
