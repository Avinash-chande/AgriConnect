import request from 'supertest';
import mongoose from 'mongoose';
import app from '../app.js';
import { User } from '../models/User.js';
import { Job } from '../models/Job.js';
import { Application } from '../models/Application.js';

describe('Accept Application API Suite (PATCH /api/v1/applications/:id/accept)', () => {
  let farmer1Token;
  let farmer2Token;
  let worker1Token;
  let worker2Token;
  let testJobId;
  let app1Id;
  let app2Id;

  beforeAll(async () => {
    const mongoUri = process.env.MONGODB_TEST_URI || 'mongodb://127.0.0.1:27017/agriconnect_test_db';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }

    await User.deleteMany({ email: /@accepttest\.com$/ });
    await Job.deleteMany({});
    await Application.deleteMany({});
    await Application.init();

    // 1. Register Farmer 1
    const farmer1Res = await request(app)
      .post('/api/v1/auth/register/farmer')
      .send({
        name: 'Tarsem Farmer',
        email: `tarsem.${Date.now()}@accepttest.com`,
        mobile: `+919871${Math.floor(100000 + Math.random() * 900000)}`,
        password: 'Password123!',
        farmName: 'Tarsem Organic Acres',
        farmSize: 15,
        farmSizeUnit: 'Acres',
        district: 'Firozpur',
        state: 'Punjab',
        location: 'Firozpur, Punjab',
      });
    farmer1Token = farmer1Res.body.data.tokens.accessToken;

    // 2. Register Farmer 2
    const farmer2Res = await request(app)
      .post('/api/v1/auth/register/farmer')
      .send({
        name: 'Raghbir Farmer',
        email: `raghbir.${Date.now()}@accepttest.com`,
        mobile: `+919872${Math.floor(100000 + Math.random() * 900000)}`,
        password: 'Password123!',
        farmName: 'Raghbir Green Farm',
        farmSize: 10,
        farmSizeUnit: 'Acres',
        district: 'Firozpur',
        state: 'Punjab',
        location: 'Firozpur, Punjab',
      });
    farmer2Token = farmer2Res.body.data.tokens.accessToken;

    // 3. Register Worker 1
    const worker1Res = await request(app)
      .post('/api/v1/auth/register/worker')
      .send({
        name: 'Harminder Worker',
        email: `harminder.${Date.now()}@accepttest.com`,
        mobile: `+919873${Math.floor(100000 + Math.random() * 900000)}`,
        password: 'Password123!',
        skills: ['Harvesting'],
        dailyRate: 700,
        experienceYears: 4,
        location: 'Firozpur, Punjab',
      });
    worker1Token = worker1Res.body.data.tokens.accessToken;

    // 4. Register Worker 2
    const worker2Res = await request(app)
      .post('/api/v1/auth/register/worker')
      .send({
        name: 'Baldev Worker',
        email: `baldev.${Date.now()}@accepttest.com`,
        mobile: `+919874${Math.floor(100000 + Math.random() * 900000)}`,
        password: 'Password123!',
        skills: ['Plowing'],
        dailyRate: 750,
        experienceYears: 5,
        location: 'Firozpur, Punjab',
      });
    worker2Token = worker2Res.body.data.tokens.accessToken;

    // 5. Farmer 1 creates Job (1 position required)
    const jobRes = await request(app)
      .post('/api/v1/jobs')
      .set('Authorization', `Bearer ${farmer1Token}`)
      .send({
        title: 'Mustard Crop Harvesting Laborer Needed',
        description: 'Mustard crop harvesting operations.',
        category: 'Harvesting',
        cropType: 'Mustard',
        workType: 'Daily Basis',
        numberOfWorkers: 1,
        requiredSkills: ['Harvesting'],
        wageType: 'Daily',
        dailyWage: 800,
        startDate: new Date().toISOString(),
        jobAddress: { district: 'Firozpur', state: 'Punjab' },
      });
    testJobId = jobRes.body.data._id;

    // 6. Worker 1 & Worker 2 apply
    const app1Res = await request(app)
      .post(`/api/v1/jobs/${testJobId}/apply`)
      .set('Authorization', `Bearer ${worker1Token}`)
      .send({ coverLetter: 'Worker 1 application' });
    app1Id = app1Res.body.data._id;

    const app2Res = await request(app)
      .post(`/api/v1/jobs/${testJobId}/apply`)
      .set('Authorization', `Bearer ${worker2Token}`)
      .send({ coverLetter: 'Worker 2 application' });
    app2Id = app2Res.body.data._id;
  });

  afterAll(async () => {
    await User.deleteMany({ email: /@accepttest\.com$/ });
    await Job.deleteMany({});
    await Application.deleteMany({});
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });

  it('PATCH /api/v1/applications/:id/accept - should deny non-owner Farmers (403 Forbidden)', async () => {
    const res = await request(app)
      .patch(`/api/v1/applications/${app1Id}/accept`)
      .set('Authorization', `Bearer ${farmer2Token}`)
      .send({ farmerFeedback: 'Accepted' });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('PATCH /api/v1/applications/:id/accept - should deny Workers (403 Forbidden)', async () => {
    const res = await request(app)
      .patch(`/api/v1/applications/${app1Id}/accept`)
      .set('Authorization', `Bearer ${worker1Token}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('PATCH /api/v1/applications/:id/accept - should accept application, increment hired count, and optionally reject remaining applicants', async () => {
    const res = await request(app)
      .patch(`/api/v1/applications/${app1Id}/accept`)
      .set('Authorization', `Bearer ${farmer1Token}`)
      .send({
        farmerFeedback: 'Selected based on experience',
        rejectOthers: true,
        rejectionFeedback: 'Position filled',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('Accepted');
    expect(res.body.data.farmerFeedback).toBe('Selected based on experience');

    // Verify Job updated details in response meta
    expect(res.body.meta.job).toBeDefined();
    expect(res.body.meta.job.hiredWorkersCount).toBe(1);
    expect(res.body.meta.job.status).toBe('Filled');

    // Verify Dashboard Statistics in response meta
    expect(res.body.meta.statistics).toBeDefined();
    expect(res.body.meta.statistics.accepted).toBe(1);
    expect(res.body.meta.statistics.rejected).toBe(1);

    // Verify Worker 2's application was bulk rejected
    const worker2App = await Application.findById(app2Id);
    expect(worker2App.status).toBe('Rejected');
    expect(worker2App.farmerFeedback).toBe('Position filled');
  });
});
