import request from 'supertest';
import mongoose from 'mongoose';
import app from '../app.js';
import { User } from '../models/User.js';
import { Job } from '../models/Job.js';
import { Application } from '../models/Application.js';
import { JOB_STATUS } from '../constants/index.js';

describe('Apply Job API Suite (POST /api/v1/jobs/:id/apply)', () => {
  let workerToken;
  let worker2Token;
  let farmerToken;
  let farmerUser;
  let workerUser;
  let testJob;
  let closedJob;

  beforeAll(async () => {
    const mongoUri = process.env.MONGODB_TEST_URI || 'mongodb://127.0.0.1:27017/agriconnect_test_db';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }

    await User.deleteMany({ email: /@applyjobtest\.com$/ });
    await Job.deleteMany({});
    await Application.deleteMany({});
    await Application.init();

    // 1. Register Worker 1
    const workerRes = await request(app)
      .post('/api/v1/auth/register/worker')
      .send({
        name: 'Sukhwinder Worker',
        email: `sukhwinder.${Date.now()}@applyjobtest.com`,
        mobile: `+919831${Math.floor(100000 + Math.random() * 900000)}`,
        password: 'Password123!',
        skills: ['Harvesting'],
        dailyRate: 600,
        experienceYears: 4,
        location: 'Ludhiana, Punjab',
      });
    workerToken = workerRes.body.data.tokens.accessToken;
    workerUser = workerRes.body.data.user;

    // 2. Register Worker 2
    const worker2Res = await request(app)
      .post('/api/v1/auth/register/worker')
      .send({
        name: 'Gurpreet Worker',
        email: `gurpreet.${Date.now()}@applyjobtest.com`,
        mobile: `+919832${Math.floor(100000 + Math.random() * 900000)}`,
        password: 'Password123!',
        skills: ['Plowing'],
        dailyRate: 700,
        experienceYears: 5,
        location: 'Ludhiana, Punjab',
      });
    worker2Token = worker2Res.body.data.tokens.accessToken;

    // 3. Register Farmer
    const farmerRes = await request(app)
      .post('/api/v1/auth/register/farmer')
      .send({
        name: 'Harpreet Farmer',
        email: `harpreet.${Date.now()}@applyjobtest.com`,
        mobile: `+919833${Math.floor(100000 + Math.random() * 900000)}`,
        password: 'Password123!',
        farmName: 'Harpreet Golden Fields',
        farmSize: 20,
        farmSizeUnit: 'Acres',
        district: 'Ludhiana',
        state: 'Punjab',
        location: 'Ludhiana, Punjab',
      });
    farmerToken = farmerRes.body.data.tokens.accessToken;
    farmerUser = farmerRes.body.data.user;

    // 4. Create Active Job Posting
    const jobRes = await request(app)
      .post('/api/v1/jobs')
      .set('Authorization', `Bearer ${farmerToken}`)
      .send({
        title: 'Paddy Harvesting Skilled Labor Needed',
        description: 'Experienced paddy harvesting workers required for 5 days.',
        category: 'Harvesting',
        cropType: 'Paddy',
        workType: 'Daily Basis',
        numberOfWorkers: 4,
        requiredSkills: ['Harvesting'],
        wageType: 'Daily',
        dailyWage: 750,
        startDate: new Date().toISOString(),
        jobAddress: { district: 'Ludhiana', state: 'Punjab' },
      });
    testJob = jobRes.body.data;

    // 5. Create Closed Job Posting
    const closedJobRes = await request(app)
      .post('/api/v1/jobs')
      .set('Authorization', `Bearer ${farmerToken}`)
      .send({
        title: 'Closed Soil Tilling Job Posting',
        description: 'Tilling operations already finished.',
        category: 'Plowing / Tillage',
        workType: 'Daily Basis',
        numberOfWorkers: 1,
        requiredSkills: ['Plowing'],
        wageType: 'Daily',
        dailyWage: 650,
        startDate: new Date().toISOString(),
        jobAddress: { district: 'Ludhiana', state: 'Punjab' },
      });
    closedJob = closedJobRes.body.data;
    await Job.findByIdAndUpdate(closedJob._id, { status: JOB_STATUS.CLOSED });
  });

  afterAll(async () => {
    await User.deleteMany({ email: /@applyjobtest\.com$/ });
    await Job.deleteMany({});
    await Application.deleteMany({});
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });

  it('POST /api/v1/jobs/:id/apply - should allow Worker to apply successfully and increment application count', async () => {
    const res = await request(app)
      .post(`/api/v1/jobs/${testJob._id}/apply`)
      .set('Authorization', `Bearer ${workerToken}`)
      .send({
        coverLetter: 'I have 4 years of experience in Paddy harvesting.',
        expectedDailyWage: 750,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data._id).toBeDefined();
    expect(res.body.data.status).toBe('Pending');
    expect(res.body.data.coverLetter).toBe('I have 4 years of experience in Paddy harvesting.');

    // Verify job's totalApplications count incremented in DB
    const updatedJob = await Job.findById(testJob._id);
    expect(updatedJob.totalApplications).toBe(1);
  });

  it('POST /api/v1/jobs/:id/apply - should prevent Worker from applying twice (409 Conflict)', async () => {
    const res = await request(app)
      .post(`/api/v1/jobs/${testJob._id}/apply`)
      .set('Authorization', `Bearer ${workerToken}`)
      .send({
        coverLetter: 'Second attempt to apply.',
      });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/already submitted an application/i);
  });

  it('POST /api/v1/jobs/:id/apply - should deny Farmer from applying to job (403 Forbidden)', async () => {
    const res = await request(app)
      .post(`/api/v1/jobs/${testJob._id}/apply`)
      .set('Authorization', `Bearer ${farmerToken}`)
      .send({
        coverLetter: 'Farmer trying to apply',
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('POST /api/v1/jobs/:id/apply - should reject applications for Closed / Non-active Jobs (400 Bad Request)', async () => {
    const res = await request(app)
      .post(`/api/v1/jobs/${closedJob._id}/apply`)
      .set('Authorization', `Bearer ${worker2Token}`)
      .send({
        coverLetter: 'Applying to closed job',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/closed or no longer accepting applications/i);
  });
});
