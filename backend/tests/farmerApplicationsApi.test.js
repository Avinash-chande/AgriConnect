import request from 'supertest';
import mongoose from 'mongoose';
import app from '../app.js';
import { User } from '../models/User.js';
import { Job } from '../models/Job.js';
import { Application } from '../models/Application.js';

describe('Farmer Applications API Suite (GET /api/v1/applications/farmer)', () => {
  let farmer1Token;
  let farmer2Token;
  let workerToken;
  let job1;

  beforeAll(async () => {
    const mongoUri = process.env.MONGODB_TEST_URI || 'mongodb://127.0.0.1:27017/agriconnect_test_db';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }

    await User.deleteMany({ email: /@farmerappstest\.com$/ });
    await Job.deleteMany({});
    await Application.deleteMany({});
    await Application.init();

    // 1. Register Farmer 1
    const farmer1Res = await request(app)
      .post('/api/v1/auth/register/farmer')
      .send({
        name: 'Gurdial Farmer',
        email: `gurdial.${Date.now()}@farmerappstest.com`,
        mobile: `+919861${Math.floor(100000 + Math.random() * 900000)}`,
        password: 'Password123!',
        farmName: 'Gurdial Green Fields',
        farmSize: 30,
        farmSizeUnit: 'Acres',
        district: 'Sangrur',
        state: 'Punjab',
        location: 'Sangrur, Punjab',
      });
    farmer1Token = farmer1Res.body.data.tokens.accessToken;

    // 2. Register Farmer 2
    const farmer2Res = await request(app)
      .post('/api/v1/auth/register/farmer')
      .send({
        name: 'Balkar Farmer',
        email: `balkar.${Date.now()}@farmerappstest.com`,
        mobile: `+919862${Math.floor(100000 + Math.random() * 900000)}`,
        password: 'Password123!',
        farmName: 'Balkar Organic Farm',
        farmSize: 12,
        farmSizeUnit: 'Acres',
        district: 'Sangrur',
        state: 'Punjab',
        location: 'Sangrur, Punjab',
      });
    farmer2Token = farmer2Res.body.data.tokens.accessToken;

    // 3. Register Worker
    const workerRes = await request(app)
      .post('/api/v1/auth/register/worker')
      .send({
        name: 'Jagdish Worker',
        email: `jagdish.${Date.now()}@farmerappstest.com`,
        mobile: `+919863${Math.floor(100000 + Math.random() * 900000)}`,
        password: 'Password123!',
        skills: ['Plowing', 'Harvesting'],
        dailyRate: 750,
        experienceYears: 6,
        location: 'Sangrur, Punjab',
      });
    workerToken = workerRes.body.data.tokens.accessToken;

    // 4. Farmer 1 creates Job
    const jobRes = await request(app)
      .post('/api/v1/jobs')
      .set('Authorization', `Bearer ${farmer1Token}`)
      .send({
        title: 'Cotton Picking Skilled Labor Required',
        description: 'Cotton picking season labor needed immediately.',
        category: 'Harvesting',
        cropType: 'Cotton',
        workType: 'Daily Basis',
        numberOfWorkers: 4,
        requiredSkills: ['Harvesting'],
        wageType: 'Daily',
        dailyWage: 800,
        startDate: new Date().toISOString(),
        jobAddress: { district: 'Sangrur', state: 'Punjab' },
      });
    job1 = jobRes.body.data;

    // 5. Worker applies to Farmer 1's Job
    await request(app)
      .post(`/api/v1/jobs/${job1._id}/apply`)
      .set('Authorization', `Bearer ${workerToken}`)
      .send({
        coverLetter: 'Experienced cotton picker available immediately.',
      });
  });

  afterAll(async () => {
    await User.deleteMany({ email: /@farmerappstest\.com$/ });
    await Job.deleteMany({});
    await Application.deleteMany({});
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });

  it('GET /api/v1/applications/farmer - should allow Farmer to retrieve applications for own jobs with populated worker & stats', async () => {
    const res = await request(app)
      .get('/api/v1/applications/farmer')
      .set('Authorization', `Bearer ${farmer1Token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeInstanceOf(Array);
    expect(res.body.data.length).toBe(1);

    // Verify Worker Population
    const appDoc = res.body.data[0];
    expect(appDoc.worker).toBeDefined();
    expect(appDoc.worker.name).toBe('Jagdish Worker');
    expect(appDoc.worker.workerProfile).toBeDefined();

    // Verify Statistics in Meta
    expect(res.body.meta.statistics).toBeDefined();
    expect(res.body.meta.statistics.total).toBe(1);
    expect(res.body.meta.statistics.pending).toBe(1);
    expect(res.body.meta.statistics.hired).toBe(0);

    // Verify Pagination Meta
    expect(res.body.meta.pagination.total).toBe(1);
  });

  it('GET /api/v1/applications/farmer - should return empty list for Farmer 2 who has no received applications', async () => {
    const res = await request(app)
      .get('/api/v1/applications/farmer')
      .set('Authorization', `Bearer ${farmer2Token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBe(0);
    expect(res.body.meta.statistics.total).toBe(0);
  });

  it('GET /api/v1/applications/farmer - should filter by specific jobId', async () => {
    const res = await request(app)
      .get(`/api/v1/applications/farmer?jobId=${job1._id}`)
      .set('Authorization', `Bearer ${farmer1Token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBe(1);
  });

  it('GET /api/v1/applications/farmer - should deny Workers (403 Forbidden)', async () => {
    const res = await request(app)
      .get('/api/v1/applications/farmer')
      .set('Authorization', `Bearer ${workerToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });
});
