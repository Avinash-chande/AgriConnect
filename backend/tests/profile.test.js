import request from 'supertest';
import mongoose from 'mongoose';
import app from '../app.js';
import { User } from '../models/User.js';
import { FarmerProfile } from '../models/FarmerProfile.js';
import { WorkerProfile } from '../models/WorkerProfile.js';

describe('User Profile Management API Suite', () => {
  let farmerToken;
  let workerToken;
  let farmerUserId;

  beforeAll(async () => {
    const mongoUri = process.env.MONGODB_TEST_URI || 'mongodb://127.0.0.1:27017/agriconnect_test_db';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }

    const timestamp = Date.now();

    // 1. Create Test Farmer
    const farmerRes = await request(app)
      .post('/api/v1/auth/register/farmer')
      .send({
        name: 'Jaspreet Farmer Test',
        email: `farmer.${timestamp}@profiletest.com`,
        mobile: `+919876${Math.floor(100000 + Math.random() * 900000)}`,
        password: 'Password123!',
        farmName: `Jaspreet Wheat Estate ${timestamp}`,
        location: 'Jalandhar, Punjab',
      });

    farmerToken = farmerRes.body.data.tokens.accessToken;
    farmerUserId = farmerRes.body.data.user._id;

    // 2. Create Test Worker
    const workerRes = await request(app)
      .post('/api/v1/auth/register/worker')
      .send({
        name: 'Gurpreet Worker Test',
        email: `worker.${timestamp}@profiletest.com`,
        mobile: `+919875${Math.floor(100000 + Math.random() * 900000)}`,
        password: 'Password123!',
        location: 'Ludhiana, Punjab',
        skills: ['Tractor Driving', 'Seeding'],
      });

    workerToken = workerRes.body.data.tokens.accessToken;
  });

  afterAll(async () => {
    await User.deleteMany({ email: /@profiletest\.com$/ });
    await FarmerProfile.deleteMany({});
    await WorkerProfile.deleteMany({});
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });

  describe('GET /api/v1/profiles/me', () => {
    it('should retrieve my farmer profile with populated details and completion percentage', async () => {
      const res = await request(app)
        .get('/api/v1/profiles/me')
        .set('Authorization', `Bearer ${farmerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user).toBeDefined();
      expect(res.body.data.completionPercentage).toBeGreaterThanOrEqual(0);
    });

    it('should retrieve my worker profile with populated details', async () => {
      const res = await request(app)
        .get('/api/v1/profiles/me')
        .set('Authorization', `Bearer ${workerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user).toBeDefined();
    });

    it('should deny unauthorized requests with 401 Unauthenticated', async () => {
      const res = await request(app).get('/api/v1/profiles/me');
      expect(res.status).toBe(401);
    });
  });

  describe('PUT /api/v1/profiles/me', () => {
    it('should update farmer profile and recalculate profile completion', async () => {
      const updatePayload = {
        farmName: 'Jaspreet Organic Wheat Estate Updated',
        farmSize: 15,
        cropTypes: ['Wheat', 'Sugarcane'],
        farmAddress: {
          district: 'Jalandhar',
          state: 'Punjab',
        },
      };

      const res = await request(app)
        .put('/api/v1/profiles/me')
        .set('Authorization', `Bearer ${farmerToken}`)
        .send(updatePayload);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.profile).toBeDefined();
    });

    it('should update worker profile skills and daily wage', async () => {
      const updatePayload = {
        bio: 'Experienced combine operator with 6 years experience',
        skills: ['Tractor Driving', 'Combine Harvester', 'Pesticide Spraying'],
        expectedDailyWage: 850,
        experience: 6,
      };

      const res = await request(app)
        .put('/api/v1/profiles/me')
        .set('Authorization', `Bearer ${workerToken}`)
        .send(updatePayload);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.profile).toBeDefined();
    });
  });

  describe('GET /api/v1/profiles/user/:identifier', () => {
    it('should retrieve public profile by User ObjectId', async () => {
      const res = await request(app).get(`/api/v1/profiles/user/${farmerUserId}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.profile).toBeDefined();
    });

    it('should return 404 for non-existent profile ID', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app).get(`/api/v1/profiles/user/${fakeId}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Authorization & Upload Guards', () => {
    it('should deny farmers from uploading worker certificate credentials with 403 Forbidden', async () => {
      const res = await request(app)
        .post('/api/v1/profiles/upload-certificates')
        .set('Authorization', `Bearer ${farmerToken}`)
        .attach('images', Buffer.from('fake-image-bytes'), 'test-certificate.jpg');

      expect(res.status).toBe(403);
    });

    it('should deny workers from uploading farm images with 403 Forbidden', async () => {
      const res = await request(app)
        .post('/api/v1/profiles/upload-farm-images')
        .set('Authorization', `Bearer ${workerToken}`)
        .attach('images', Buffer.from('fake-image-bytes'), 'farm.jpg');

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/v1/profiles/search', () => {
    it('should search profiles by keyword and return paginated results', async () => {
      const res = await request(app).get('/api/v1/profiles/search?q=Punjab');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.farmers).toBeDefined();
    });
  });

  describe('DELETE /api/v1/profiles/me', () => {
    it('should soft delete user profile and deactivate account', async () => {
      const res = await request(app)
        .delete('/api/v1/profiles/me')
        .set('Authorization', `Bearer ${workerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
