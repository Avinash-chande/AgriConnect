import request from 'supertest';
import mongoose from 'mongoose';
import app from '../app.js';
import { User } from '../models/User.js';
import { Job } from '../models/Job.js';
import { Application } from '../models/Application.js';

describe('Cancel Hiring API Suite (PATCH /api/v1/applications/:id/cancel-hiring)', () => {
  let farmer1Token;
  let farmer2Token;
  let worker1Token;
  let worker2Token;
  let jobForAcceptedTest;
  let jobForHiredTest;
  let acceptedAppId;
  let hiredAppId;

  beforeAll(async () => {
    const mongoUri = process.env.MONGODB_TEST_URI || 'mongodb://127.0.0.1:27017/agriconnect_test_db';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }

    await User.deleteMany({ email: /@canceltest\.com$/ });
    await Job.deleteMany({});
    await Application.deleteMany({});
    await Application.init();

    // Register Farmer 1
    const f1 = await request(app)
      .post('/api/v1/auth/register/farmer')
      .send({
        name: 'Ranjit Farmer',
        email: `ranjit.${Date.now()}@canceltest.com`,
        mobile: `+919901${Math.floor(100000 + Math.random() * 900000)}`,
        password: 'Password123!',
        farmName: 'Ranjit Gold Farm',
        farmSize: 20,
        farmSizeUnit: 'Acres',
        district: 'Kapurthala',
        state: 'Punjab',
        location: 'Kapurthala, Punjab',
      });
    farmer1Token = f1.body.data.tokens.accessToken;

    // Register Farmer 2
    const f2 = await request(app)
      .post('/api/v1/auth/register/farmer')
      .send({
        name: 'Mohan Farmer',
        email: `mohan.${Date.now()}@canceltest.com`,
        mobile: `+919902${Math.floor(100000 + Math.random() * 900000)}`,
        password: 'Password123!',
        farmName: 'Mohan Agri Fields',
        farmSize: 15,
        farmSizeUnit: 'Acres',
        district: 'Kapurthala',
        state: 'Punjab',
        location: 'Kapurthala, Punjab',
      });
    farmer2Token = f2.body.data.tokens.accessToken;

    // Register Worker 1
    const w1 = await request(app)
      .post('/api/v1/auth/register/worker')
      .send({
        name: 'Paramjit Worker',
        email: `paramjit.${Date.now()}@canceltest.com`,
        mobile: `+919903${Math.floor(100000 + Math.random() * 900000)}`,
        password: 'Password123!',
        skills: ['Harvesting'],
        dailyRate: 700,
        experienceYears: 5,
        location: 'Kapurthala, Punjab',
      });
    worker1Token = w1.body.data.tokens.accessToken;

    // Register Worker 2
    const w2 = await request(app)
      .post('/api/v1/auth/register/worker')
      .send({
        name: 'Bikramjit Worker',
        email: `bikramjit.${Date.now()}@canceltest.com`,
        mobile: `+919904${Math.floor(100000 + Math.random() * 900000)}`,
        password: 'Password123!',
        skills: ['Plowing'],
        dailyRate: 750,
        experienceYears: 3,
        location: 'Kapurthala, Punjab',
      });
    worker2Token = w2.body.data.tokens.accessToken;

    // --- Job A: for testing Accepted cancellation ---
    const jobA = await request(app)
      .post('/api/v1/jobs')
      .set('Authorization', `Bearer ${farmer1Token}`)
      .send({
        title: 'Rice Paddy Harvesting Team Lead',
        description: 'Leading a harvesting crew for rice paddy fields.',
        category: 'Harvesting',
        cropType: 'Rice/Paddy',
        workType: 'Daily Basis',
        numberOfWorkers: 2,
        requiredSkills: ['Harvesting'],
        wageType: 'Daily',
        dailyWage: 900,
        startDate: new Date().toISOString(),
        jobAddress: { district: 'Kapurthala', state: 'Punjab' },
      });
    jobForAcceptedTest = jobA.body.data._id;

    // Worker 1 applies → Farmer accepts → status Accepted
    const a1 = await request(app)
      .post(`/api/v1/jobs/${jobForAcceptedTest}/apply`)
      .set('Authorization', `Bearer ${worker1Token}`)
      .send({ coverLetter: 'Worker 1 application for accepted cancel test' });
    acceptedAppId = a1.body.data._id;

    await request(app)
      .patch(`/api/v1/applications/${acceptedAppId}/accept`)
      .set('Authorization', `Bearer ${farmer1Token}`)
      .send({ farmerFeedback: 'Good candidate', rejectOthers: false });

    // --- Job B: for testing Hired cancellation & job status restoration ---
    const jobB = await request(app)
      .post('/api/v1/jobs')
      .set('Authorization', `Bearer ${farmer1Token}`)
      .send({
        title: 'Wheat Sowing Operations',
        description: 'Wheat sowing season field operations.',
        category: 'Sowing / Planting',
        cropType: 'Wheat',
        workType: 'Daily Basis',
        numberOfWorkers: 1,
        requiredSkills: ['Plowing'],
        wageType: 'Daily',
        dailyWage: 800,
        startDate: new Date().toISOString(),
        jobAddress: { district: 'Kapurthala', state: 'Punjab' },
      });
    jobForHiredTest = jobB.body.data._id;

    // Worker 2 applies to Job B
    const a2 = await request(app)
      .post(`/api/v1/jobs/${jobForHiredTest}/apply`)
      .set('Authorization', `Bearer ${worker2Token}`)
      .send({ coverLetter: 'Worker 2 application for hired cancel test' });
    hiredAppId = a2.body.data._id;

    // Manually set to Hired to simulate post-hiring state & mark job as Filled
    await Application.findByIdAndUpdate(hiredAppId, {
      status: 'Hired',
      hiredDate: new Date(),
    });
    await Job.findByIdAndUpdate(jobForHiredTest, {
      $inc: { hiredWorkersCount: 1 },
      status: 'Filled',
    });
  });

  afterAll(async () => {
    await User.deleteMany({ email: /@canceltest\.com$/ });
    await Job.deleteMany({});
    await Application.deleteMany({});
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });

  it('PATCH /:id/cancel-hiring - should deny non-owner Farmers (403)', async () => {
    const res = await request(app)
      .patch(`/api/v1/applications/${acceptedAppId}/cancel-hiring`)
      .set('Authorization', `Bearer ${farmer2Token}`)
      .send({ reason: 'Plans changed' });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('PATCH /:id/cancel-hiring - should deny Workers (403)', async () => {
    const res = await request(app)
      .patch(`/api/v1/applications/${acceptedAppId}/cancel-hiring`)
      .set('Authorization', `Bearer ${worker1Token}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('PATCH /:id/cancel-hiring - should cancel an Accepted application with audit log', async () => {
    const res = await request(app)
      .patch(`/api/v1/applications/${acceptedAppId}/cancel-hiring`)
      .set('Authorization', `Bearer ${farmer1Token}`)
      .send({ reason: 'Job requirements changed after initial acceptance' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('Cancelled');
    expect(res.body.data.farmerFeedback).toBe('Job requirements changed after initial acceptance');

    // Verify embedded audit trail
    expect(res.body.data.notes).toContain('[CANCELLED');
    expect(res.body.data.notes).toContain('Previous status: Accepted');

    // previousStatus in meta
    expect(res.body.meta.previousStatus).toBe('Accepted');

    // Dashboard statistics updated
    expect(res.body.meta.statistics).toBeDefined();
    expect(res.body.meta.statistics.cancelled).toBe(1);
  });

  it('PATCH /:id/cancel-hiring - should cancel a Hired application and restore Job to Active', async () => {
    const res = await request(app)
      .patch(`/api/v1/applications/${hiredAppId}/cancel-hiring`)
      .set('Authorization', `Bearer ${farmer1Token}`)
      .send({ reason: 'Worker unable to join due to personal reasons' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('Cancelled');
    expect(res.body.meta.previousStatus).toBe('Hired');

    // Verify job was restored to Active & hiredWorkersCount decremented
    const job = await Job.findById(jobForHiredTest);
    expect(job.status).toBe('Active');
    expect(job.hiredWorkersCount).toBe(0);
  });

  it('PATCH /:id/cancel-hiring - should reject cancelling a Pending application (400)', async () => {
    const freshWorker = await request(app)
      .post('/api/v1/auth/register/worker')
      .send({
        name: 'Fresh Worker Cancel',
        email: `fresh.${Date.now()}@canceltest.com`,
        mobile: `+919905${Math.floor(100000 + Math.random() * 900000)}`,
        password: 'Password123!',
        skills: ['Plowing'],
        dailyRate: 650,
        experienceYears: 1,
        location: 'Kapurthala, Punjab',
      });
    const freshToken = freshWorker.body.data.tokens.accessToken;

    const freshApp = await request(app)
      .post(`/api/v1/jobs/${jobForAcceptedTest}/apply`)
      .set('Authorization', `Bearer ${freshToken}`)
      .send({ coverLetter: 'Pending application should not be cancellable' });
    const freshAppId = freshApp.body.data._id;

    const res = await request(app)
      .patch(`/api/v1/applications/${freshAppId}/cancel-hiring`)
      .set('Authorization', `Bearer ${farmer1Token}`)
      .send({ reason: 'Should fail' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Pending');
  });
});
