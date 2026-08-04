import request from 'supertest';
import mongoose from 'mongoose';
import app from '../app.js';
import { User } from '../models/User.js';
import { Job } from '../models/Job.js';
import { Application } from '../models/Application.js';

describe('Farmer Application Dashboard API Suite (GET /api/v1/applications/dashboard/stats)', () => {
  let farmerToken;
  let workerToken;
  let farmerUser;
  let workerUser;
  let testJob;

  beforeAll(async () => {
    const mongoUri = process.env.MONGODB_TEST_URI || 'mongodb://127.0.0.1:27017/agriconnect_test_db';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }

    await User.deleteMany({ email: /@dashboardtest\.com$/ });
    await Job.deleteMany({});
    await Application.deleteMany({});

    // Register Farmer
    const farmerRes = await request(app)
      .post('/api/v1/auth/register/farmer')
      .send({
        name: 'Dashboard Farmer',
        email: `farmer.${Date.now()}@dashboardtest.com`,
        mobile: `+919988${Math.floor(100000 + Math.random() * 900000)}`,
        password: 'Password123!',
        farmName: 'Analytics Farm',
        farmSize: 15,
        farmSizeUnit: 'Acres',
        district: 'Ludhiana',
        state: 'Punjab',
        location: 'Ludhiana, Punjab',
      });
    farmerToken = farmerRes.body.data.tokens.accessToken;
    farmerUser = farmerRes.body.data.user;

    // Register Worker
    const workerRes = await request(app)
      .post('/api/v1/auth/register/worker')
      .send({
        name: 'Dashboard Worker',
        email: `worker.${Date.now()}@dashboardtest.com`,
        mobile: `+919977${Math.floor(100000 + Math.random() * 900000)}`,
        password: 'Password123!',
        skills: ['Tractor Driving'],
        expectedDailyWage: 600,
        district: 'Ludhiana',
        state: 'Punjab',
      });
    workerToken = workerRes.body.data.tokens.accessToken;
    workerUser = workerRes.body.data.user;

    // Create Job
    const jobRes = await request(app)
      .post('/api/v1/jobs')
      .set('Authorization', `Bearer ${farmerToken}`)
      .send({
        title: 'Harvester Machine Operator',
        description: 'Need experienced harvester operator for paddy field harvesting in Ludhiana.',
        category: 'Harvesting',
        workType: 'Contractual / Seasonal',
        numberOfWorkers: 2,
        wageType: 'Daily',
        dailyWage: 800,
        startDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
        district: 'Ludhiana',
        state: 'Punjab',
      });
    testJob = jobRes.body.data;
  });

  afterAll(async () => {
    await User.deleteMany({ email: /@dashboardtest\.com$/ });
    await Job.deleteMany({});
    await Application.deleteMany({});
    await mongoose.connection.close();
  });

  test('GET /api/v1/applications/dashboard/stats - should deny Workers (403)', async () => {
    const res = await request(app)
      .get('/api/v1/applications/dashboard/stats')
      .set('Authorization', `Bearer ${workerToken}`);

    expect(res.status).toBe(403);
  });

  test('GET /api/v1/applications/dashboard/stats - should return empty stats when no applications exist', async () => {
    const res = await request(app)
      .get('/api/v1/applications/dashboard/stats')
      .set('Authorization', `Bearer ${farmerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('overview');
    expect(res.body.data).toHaveProperty('perJob');
    expect(res.body.data).toHaveProperty('perDay');
    expect(res.body.data).toHaveProperty('recentApplicants');
    expect(res.body.data.overview.total).toBe(0);
  });

  test('GET /api/v1/applications/dashboard/stats - should return aggregated stats after worker applies', async () => {
    // Apply worker
    await request(app)
      .post(`/api/v1/applications/jobs/${testJob._id}`)
      .set('Authorization', `Bearer ${workerToken}`)
      .send({
        coverLetter: 'Experienced harvester operator with 5 years experience.',
        expectedDailyWage: 800,
      });

    const res = await request(app)
      .get('/api/v1/applications/dashboard/stats?daysBack=30')
      .set('Authorization', `Bearer ${farmerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.overview.total).toBe(1);
    expect(res.body.data.overview.pending).toBe(1);
    expect(res.body.data.perJob.length).toBeGreaterThan(0);
    expect(res.body.data.recentApplicants.length).toBe(1);
  });
});
