import request from 'supertest';
import mongoose from 'mongoose';
import app from '../app.js';
import { User } from '../models/User.js';
import { Job } from '../models/Job.js';
import { FarmerProfile } from '../models/FarmerProfile.js';
import { jwtConfig } from '../config/jwt.js';
import jwt from 'jsonwebtoken';

describe('Premium Feature Integration Test Suite', () => {
  let freeFarmerToken;
  let premiumFarmerToken;
  let freeFarmerId;
  let premiumFarmerId;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(
        process.env.MONGODB_TEST_URI || 'mongodb://127.0.0.1:27017/agriconnect_test_db'
      );
    }

    // 1. Free Farmer
    const freeF = await User.create({
      name: 'Free Farmer',
      email: `free_farmer_${Date.now()}@agriconnect.com`,
      mobile: `+9198${Math.floor(10000000 + Math.random() * 90000000)}`,
      password: 'password123',
      role: 'Farmer',
      isPremium: false,
    });
    freeFarmerId = freeF._id;
    freeFarmerToken = jwt.sign({ id: freeF._id, role: freeF.role }, jwtConfig.accessSecret, {
      expiresIn: '1h',
    });

    await FarmerProfile.create({
      user: freeFarmerId,
      owner: freeFarmerId,
      farmSize: 10,
      farmName: 'Free Green Acres',
      location: { type: 'Point', coordinates: [75.8573, 31.634] },
      farmAddress: { village: 'Rampur', district: 'Ludhiana', state: 'Punjab', pincode: '141001' },
    });

    // 2. Premium Farmer
    const premF = await User.create({
      name: 'Premium Farmer',
      email: `prem_farmer_${Date.now()}@agriconnect.com`,
      mobile: `+9198${Math.floor(10000000 + Math.random() * 90000000)}`,
      password: 'password123',
      role: 'Farmer',
      isPremium: true,
      subscriptionPlan: 'farmer_pro_monthly',
      subscriptionStatus: 'active',
      subscriptionExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });
    premiumFarmerId = premF._id;
    premiumFarmerToken = jwt.sign({ id: premF._id, role: premF.role }, jwtConfig.accessSecret, {
      expiresIn: '1h',
    });

    await FarmerProfile.create({
      user: premiumFarmerId,
      owner: premiumFarmerId,
      farmSize: 15,
      farmName: 'Premium Golden Fields',
      location: { type: 'Point', coordinates: [75.8573, 31.634] },
      farmAddress: { village: 'Rampur', district: 'Ludhiana', state: 'Punjab', pincode: '141001' },
    });
  });

  afterAll(async () => {
    if (freeFarmerId) {
      await User.findByIdAndDelete(freeFarmerId);
      await FarmerProfile.deleteMany({ user: freeFarmerId });
    }
    if (premiumFarmerId) {
      await User.findByIdAndDelete(premiumFarmerId);
      await FarmerProfile.deleteMany({ user: premiumFarmerId });
    }
    await Job.deleteMany({ farmer: { $in: [freeFarmerId, premiumFarmerId] } });
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });

  describe('Featured Job Posting Enforcement', () => {
    it('should reject free farmer attempting to post a featured job', async () => {
      const res = await request(app)
        .post('/api/v1/jobs')
        .set('Authorization', `Bearer ${freeFarmerToken}`)
        .send({
          title: 'Wheat Harvesting Job',
          description: 'Harvesting required for 10 acres farm with high yield equipment.',
          category: 'Harvesting',
          workType: 'Full-Time',
          numberOfWorkers: 5,
          requiredSkills: ['Harvesting', 'Tractor Driving'],
          wageType: 'Daily',
          dailyWage: 600,
          startDate: new Date(Date.now() + 86400000).toISOString(),
          isFeatured: true,
          jobAddress: {
            village: 'Rampur',
            district: 'Ludhiana',
            state: 'Punjab',
            pincode: '141001',
          },
        });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Featured Job Posting is a Premium Pro feature');
    });

    it('should allow free farmer to post standard non-featured job', async () => {
      const res = await request(app)
        .post('/api/v1/jobs')
        .set('Authorization', `Bearer ${freeFarmerToken}`)
        .send({
          title: 'Standard Wheat Harvesting Job',
          description: 'Harvesting required for 10 acres farm with high yield equipment.',
          category: 'Harvesting',
          workType: 'Full-Time',
          numberOfWorkers: 5,
          requiredSkills: ['Harvesting', 'Tractor Driving'],
          wageType: 'Daily',
          dailyWage: 600,
          startDate: new Date(Date.now() + 86400000).toISOString(),
          isFeatured: false,
          jobAddress: {
            village: 'Rampur',
            district: 'Ludhiana',
            state: 'Punjab',
            pincode: '141001',
          },
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isFeatured).toBe(false);
    });

    it('should allow premium farmer to post featured job successfully', async () => {
      const res = await request(app)
        .post('/api/v1/jobs')
        .set('Authorization', `Bearer ${premiumFarmerToken}`)
        .send({
          title: 'Featured Wheat Harvesting Job',
          description: 'Harvesting required for 10 acres farm with high yield equipment.',
          category: 'Harvesting',
          workType: 'Full-Time',
          numberOfWorkers: 5,
          requiredSkills: ['Harvesting', 'Tractor Driving'],
          wageType: 'Daily',
          dailyWage: 800,
          startDate: new Date(Date.now() + 86400000).toISOString(),
          isFeatured: true,
          jobAddress: {
            village: 'Rampur',
            district: 'Ludhiana',
            state: 'Punjab',
            pincode: '141001',
          },
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isFeatured).toBe(true);
    });
  });

  describe('Priority Visibility Sorting', () => {
    it('should prioritize featured jobs first in list results', async () => {
      const res = await request(app).get('/api/v1/jobs');
      expect(res.status).toBe(200);

      const jobs = res.body.data;
      if (jobs.length >= 2) {
        expect(jobs[0].isFeatured).toBe(true);
      }
    });
  });
});
