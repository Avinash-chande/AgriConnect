import request from 'supertest';
import mongoose from 'mongoose';
import app from '../app.js';
import { User } from '../models/User.js';
import { Job } from '../models/Job.js';
import { Application } from '../models/Application.js';
import { APPLICATION_STATUS } from '../constants/index.js';

describe('Withdraw Application API Suite (PATCH /api/v1/applications/:id/withdraw)', () => {
  let worker1Token;
  let worker2Token;
  let farmerToken;
  let testJobId;
  let pendingAppId;
  let hiredAppId;

  beforeAll(async () => {
    const mongoUri = process.env.MONGODB_TEST_URI || 'mongodb://127.0.0.1:27017/agriconnect_test_db';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }

    await User.deleteMany({ email: /@withdrawtest\.com$/ });
    await Job.deleteMany({});
    await Application.deleteMany({});
    await Application.init();

    // 1. Register Worker 1
    const worker1Res = await request(app)
      .post('/api/v1/auth/register/worker')
      .send({
        name: 'Amarjeet Worker',
        email: `amarjeet.${Date.now()}@withdrawtest.com`,
        mobile: `+919841${Math.floor(100000 + Math.random() * 900000)}`,
        password: 'Password123!',
        skills: ['Harvesting'],
        dailyRate: 650,
        experienceYears: 3,
        location: 'Jalandhar, Punjab',
      });
    worker1Token = worker1Res.body.data.tokens.accessToken;
    const worker1User = worker1Res.body.data.user;

    // 2. Register Worker 2
    const worker2Res = await request(app)
      .post('/api/v1/auth/register/worker')
      .send({
        name: 'Jaspreet Worker',
        email: `jaspreet.${Date.now()}@withdrawtest.com`,
        mobile: `+919842${Math.floor(100000 + Math.random() * 900000)}`,
        password: 'Password123!',
        skills: ['Plowing'],
        dailyRate: 700,
        experienceYears: 4,
        location: 'Jalandhar, Punjab',
      });
    worker2Token = worker2Res.body.data.tokens.accessToken;

    // 3. Register Farmer
    const farmerRes = await request(app)
      .post('/api/v1/auth/register/farmer')
      .send({
        name: 'Kuldip Farmer',
        email: `kuldip.${Date.now()}@withdrawtest.com`,
        mobile: `+919843${Math.floor(100000 + Math.random() * 900000)}`,
        password: 'Password123!',
        farmName: 'Kuldip Organic Farms',
        farmSize: 15,
        farmSizeUnit: 'Acres',
        district: 'Jalandhar',
        state: 'Punjab',
        location: 'Jalandhar, Punjab',
      });
    farmerToken = farmerRes.body.data.tokens.accessToken;

    // 4. Create Job Posting
    const jobRes = await request(app)
      .post('/api/v1/jobs')
      .set('Authorization', `Bearer ${farmerToken}`)
      .send({
        title: 'Sugarcane Cutting & Loading Workers Needed',
        description: 'Sugarcane harvesting and transport loading labor.',
        category: 'Harvesting',
        cropType: 'Sugarcane',
        workType: 'Daily Basis',
        numberOfWorkers: 3,
        requiredSkills: ['Harvesting'],
        wageType: 'Daily',
        dailyWage: 800,
        startDate: new Date().toISOString(),
        jobAddress: { district: 'Jalandhar', state: 'Punjab' },
      });
    testJobId = jobRes.body.data._id;

    // 5. Worker 1 submits job application
    const applyRes = await request(app)
      .post(`/api/v1/jobs/${testJobId}/apply`)
      .set('Authorization', `Bearer ${worker1Token}`)
      .send({
        coverLetter: 'Experienced in sugarcane cutting.',
      });
    pendingAppId = applyRes.body.data._id;

    // 6. Create a separate Hired Application for testing hiring constraint
    const hiredApp = await Application.create({
      worker: worker1User._id,
      farmer: farmerRes.body.data.user._id,
      job: new mongoose.Types.ObjectId(),
      status: APPLICATION_STATUS.HIRED,
      hiredDate: new Date(),
    });
    hiredAppId = hiredApp._id.toString();
  });

  afterAll(async () => {
    await User.deleteMany({ email: /@withdrawtest\.com$/ });
    await Job.deleteMany({});
    await Application.deleteMany({});
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });

  it('PATCH /api/v1/applications/:id/withdraw - should prevent non-applicants from withdrawing (403 Forbidden)', async () => {
    const res = await request(app)
      .patch(`/api/v1/applications/${pendingAppId}/withdraw`)
      .set('Authorization', `Bearer ${worker2Token}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/only the original applicant can withdraw/i);
  });

  it('PATCH /api/v1/applications/:id/withdraw - should prevent withdrawal after being Hired (400 Bad Request)', async () => {
    const res = await request(app)
      .patch(`/api/v1/applications/${hiredAppId}/withdraw`)
      .set('Authorization', `Bearer ${worker1Token}`);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/cannot withdraw application after being hired/i);
  });

  it('PATCH /api/v1/applications/:id/withdraw - should allow applicant worker to withdraw application successfully', async () => {
    const initialJob = await Job.findById(testJobId);
    expect(initialJob.totalApplications).toBe(1);

    const res = await request(app)
      .patch(`/api/v1/applications/${pendingAppId}/withdraw`)
      .set('Authorization', `Bearer ${worker1Token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('Withdrawn');
    expect(res.body.data.withdrawnDate).toBeDefined();

    // Verify job application count was decremented
    const updatedJob = await Job.findById(testJobId);
    expect(updatedJob.totalApplications).toBe(0);
  });
});
