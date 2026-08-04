import request from 'supertest';
import mongoose from 'mongoose';
import app from '../app.js';
import { User } from '../models/User.js';
import { Job } from '../models/Job.js';
import { Application } from '../models/Application.js';

describe('Reject Application API Suite (PATCH /api/v1/applications/:id/reject)', () => {
  let farmer1Token;
  let farmer2Token;
  let workerToken;
  let testJobId;
  let app1Id;

  beforeAll(async () => {
    const mongoUri = process.env.MONGODB_TEST_URI || 'mongodb://127.0.0.1:27017/agriconnect_test_db';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }

    await User.deleteMany({ email: /@rejecttest\.com$/ });
    await Job.deleteMany({});
    await Application.deleteMany({});
    await Application.init();

    // 1. Register Farmer 1
    const farmer1Res = await request(app)
      .post('/api/v1/auth/register/farmer')
      .send({
        name: 'Surjit Farmer',
        email: `surjit.${Date.now()}@rejecttest.com`,
        mobile: `+919881${Math.floor(100000 + Math.random() * 900000)}`,
        password: 'Password123!',
        farmName: 'Surjit Golden Harvest',
        farmSize: 18,
        farmSizeUnit: 'Acres',
        district: 'Bathinda',
        state: 'Punjab',
        location: 'Bathinda, Punjab',
      });
    farmer1Token = farmer1Res.body.data.tokens.accessToken;

    // 2. Register Farmer 2
    const farmer2Res = await request(app)
      .post('/api/v1/auth/register/farmer')
      .send({
        name: 'Avtar Farmer',
        email: `avtar.${Date.now()}@rejecttest.com`,
        mobile: `+919882${Math.floor(100000 + Math.random() * 900000)}`,
        password: 'Password123!',
        farmName: 'Avtar Agro Farm',
        farmSize: 14,
        farmSizeUnit: 'Acres',
        district: 'Bathinda',
        state: 'Punjab',
        location: 'Bathinda, Punjab',
      });
    farmer2Token = farmer2Res.body.data.tokens.accessToken;

    // 3. Register Worker
    const workerRes = await request(app)
      .post('/api/v1/auth/register/worker')
      .send({
        name: 'Satnam Worker',
        email: `satnam.${Date.now()}@rejecttest.com`,
        mobile: `+919883${Math.floor(100000 + Math.random() * 900000)}`,
        password: 'Password123!',
        skills: ['Plowing'],
        dailyRate: 720,
        experienceYears: 4,
        location: 'Bathinda, Punjab',
      });
    workerToken = workerRes.body.data.tokens.accessToken;

    // 4. Farmer 1 creates Job
    const jobRes = await request(app)
      .post('/api/v1/jobs')
      .set('Authorization', `Bearer ${farmer1Token}`)
      .send({
        title: 'Tractor Driver for Soil Tilling Needed',
        description: 'Tractor driving and deep soil tilling.',
        category: 'Equipment Operation',
        cropType: 'Cotton',
        workType: 'Daily Basis',
        numberOfWorkers: 2,
        requiredSkills: ['Equipment Operation'],
        wageType: 'Daily',
        dailyWage: 850,
        startDate: new Date().toISOString(),
        jobAddress: { district: 'Bathinda', state: 'Punjab' },
      });
    testJobId = jobRes.body.data._id;

    // 5. Worker applies
    const app1Res = await request(app)
      .post(`/api/v1/jobs/${testJobId}/apply`)
      .set('Authorization', `Bearer ${workerToken}`)
      .send({ coverLetter: 'Tractor driver application' });
    app1Id = app1Res.body.data._id;
  });

  afterAll(async () => {
    await User.deleteMany({ email: /@rejecttest\.com$/ });
    await Job.deleteMany({});
    await Application.deleteMany({});
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });

  it('PATCH /api/v1/applications/:id/reject - should deny non-owner Farmers (403 Forbidden)', async () => {
    const res = await request(app)
      .patch(`/api/v1/applications/${app1Id}/reject`)
      .set('Authorization', `Bearer ${farmer2Token}`)
      .send({ reason: 'Not qualified' });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('PATCH /api/v1/applications/:id/reject - should deny Workers (403 Forbidden)', async () => {
    const res = await request(app)
      .patch(`/api/v1/applications/${app1Id}/reject`)
      .set('Authorization', `Bearer ${workerToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('PATCH /api/v1/applications/:id/reject - should allow owner Farmer to reject application and store reason', async () => {
    const res = await request(app)
      .patch(`/api/v1/applications/${app1Id}/reject`)
      .set('Authorization', `Bearer ${farmer1Token}`)
      .send({
        reason: 'Required tractor license verification missing',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('Rejected');
    expect(res.body.data.farmerFeedback).toBe('Required tractor license verification missing');

    // Verify Dashboard Statistics in meta
    expect(res.body.meta.statistics).toBeDefined();
    expect(res.body.meta.statistics.rejected).toBe(1);
  });
});
