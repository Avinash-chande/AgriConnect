import request from 'supertest';
import mongoose from 'mongoose';
import app from '../app.js';
import { User } from '../models/User.js';
import { Job } from '../models/Job.js';
import { SavedJob } from '../models/SavedJob.js';

describe('Saved Job Feature API Suite (POST /api/v1/jobs/:id/save & GET /api/v1/jobs/saved)', () => {
  let workerToken;
  let farmerToken;
  let testJobId;

  beforeAll(async () => {
    const mongoUri = process.env.MONGODB_TEST_URI || 'mongodb://127.0.0.1:27017/agriconnect_test_db';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }

    await User.deleteMany({ email: /@savedjobtest\.com$/ });
    await Job.deleteMany({});
    await SavedJob.deleteMany({});

    // 1. Register Worker
    const workerRes = await request(app)
      .post('/api/v1/auth/register/worker')
      .send({
        name: 'Ramesh Worker',
        email: `ramesh.${Date.now()}@savedjobtest.com`,
        mobile: `+919811${Math.floor(100000 + Math.random() * 900000)}`,
        password: 'Password123!',
        skills: ['Plowing'],
        dailyRate: 700,
        experienceYears: 3,
        location: 'Amritsar, Punjab',
      });

    workerToken = workerRes.body.data.tokens.accessToken;

    // 2. Register Farmer
    const farmerRes = await request(app)
      .post('/api/v1/auth/register/farmer')
      .send({
        name: 'Balwinder Farmer',
        email: `balwinder.${Date.now()}@savedjobtest.com`,
        mobile: `+919812${Math.floor(100000 + Math.random() * 900000)}`,
        password: 'Password123!',
        farmName: 'Balwinder Green Farms',
        farmSize: 10,
        farmSizeUnit: 'Acres',
        district: 'Amritsar',
        state: 'Punjab',
        location: 'Amritsar, Punjab',
      });

    farmerToken = farmerRes.body.data.tokens.accessToken;

    // 3. Create Job Posting
    const jobRes = await request(app)
      .post('/api/v1/jobs')
      .set('Authorization', `Bearer ${farmerToken}`)
      .send({
        title: 'Wheat Harvesting Machine Operator Needed',
        description: 'Combine harvest machine operator for wheat crop harvest.',
        category: 'Harvesting',
        cropType: 'Wheat',
        workType: 'Daily Basis',
        numberOfWorkers: 2,
        requiredSkills: ['Machine Operator'],
        wageType: 'Daily',
        dailyWage: 850,
        startDate: new Date().toISOString(),
        jobAddress: { district: 'Amritsar', state: 'Punjab' },
      });

    testJobId = jobRes.body.data._id;
  });

  afterAll(async () => {
    await User.deleteMany({ email: /@savedjobtest\.com$/ });
    await Job.deleteMany({});
    await SavedJob.deleteMany({});
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });

  it('POST /api/v1/jobs/:id/save - should allow a Worker to save a job vacancy', async () => {
    const res = await request(app)
      .post(`/api/v1/jobs/${testJobId}/save`)
      .set('Authorization', `Bearer ${workerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.isSaved).toBe(true);
    expect(res.body.data.savedCount).toBe(1);
  });

  it('POST /api/v1/jobs/:id/save - should toggle unsave when called again', async () => {
    const res = await request(app)
      .post(`/api/v1/jobs/${testJobId}/save`)
      .set('Authorization', `Bearer ${workerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.isSaved).toBe(false);
    expect(res.body.data.savedCount).toBe(0);
  });

  it('POST /api/v1/jobs/:id/save - should deny Farmers with 403 Forbidden', async () => {
    const res = await request(app)
      .post(`/api/v1/jobs/${testJobId}/save`)
      .set('Authorization', `Bearer ${farmerToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('GET /api/v1/jobs/saved - should retrieve worker saved jobs list', async () => {
    // 1. Save job again
    await request(app)
      .post(`/api/v1/jobs/${testJobId}/save`)
      .set('Authorization', `Bearer ${workerToken}`);

    // 2. Fetch saved jobs
    const res = await request(app)
      .get('/api/v1/jobs/saved?page=1&limit=10')
      .set('Authorization', `Bearer ${workerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeInstanceOf(Array);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].title).toBe('Wheat Harvesting Machine Operator Needed');
    expect(res.body.meta.pagination.totalJobs).toBe(1);
  });
});
