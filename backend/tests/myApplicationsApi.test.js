import request from 'supertest';
import mongoose from 'mongoose';
import app from '../app.js';
import { User } from '../models/User.js';
import { Job } from '../models/Job.js';
import { Application } from '../models/Application.js';
import { APPLICATION_STATUS } from '../constants/index.js';

describe('My Applications API Suite (GET /api/v1/applications/my-applications)', () => {
  let workerToken;
  let farmerToken;
  let farmerUser;
  let workerUser;
  let job1;
  let job2;

  beforeAll(async () => {
    const mongoUri = process.env.MONGODB_TEST_URI || 'mongodb://127.0.0.1:27017/agriconnect_test_db';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }

    await User.deleteMany({ email: /@myapps\.com$/ });
    await Job.deleteMany({});
    await Application.deleteMany({});
    await Application.init();

    // 1. Register Worker
    const workerRes = await request(app)
      .post('/api/v1/auth/register/worker')
      .send({
        name: 'Manpreet Worker',
        email: `manpreet.${Date.now()}@myapps.com`,
        mobile: `+919851${Math.floor(100000 + Math.random() * 900000)}`,
        password: 'Password123!',
        skills: ['Harvesting'],
        dailyRate: 700,
        experienceYears: 4,
        location: 'Patiala, Punjab',
      });
    workerToken = workerRes.body.data.tokens.accessToken;
    workerUser = workerRes.body.data.user;

    // 2. Register Farmer
    const farmerRes = await request(app)
      .post('/api/v1/auth/register/farmer')
      .send({
        name: 'Gurmail Farmer',
        email: `gurmail.${Date.now()}@myapps.com`,
        mobile: `+919852${Math.floor(100000 + Math.random() * 900000)}`,
        password: 'Password123!',
        farmName: 'Gurmail Green Acres',
        farmSize: 25,
        farmSizeUnit: 'Acres',
        district: 'Patiala',
        state: 'Punjab',
        location: 'Patiala, Punjab',
      });
    farmerToken = farmerRes.body.data.tokens.accessToken;
    farmerUser = farmerRes.body.data.user;

    // 3. Create Job 1
    const job1Res = await request(app)
      .post('/api/v1/jobs')
      .set('Authorization', `Bearer ${farmerToken}`)
      .send({
        title: 'Paddy Field Sowing Team',
        description: 'Sowing operations for basmati paddy crop.',
        category: 'Sowing / Planting',
        cropType: 'Paddy',
        workType: 'Daily Basis',
        numberOfWorkers: 5,
        requiredSkills: ['Sowing'],
        wageType: 'Daily',
        dailyWage: 700,
        startDate: new Date().toISOString(),
        jobAddress: { district: 'Patiala', state: 'Punjab' },
      });
    job1 = job1Res.body.data;

    // 4. Create Job 2
    const job2Res = await request(app)
      .post('/api/v1/jobs')
      .set('Authorization', `Bearer ${farmerToken}`)
      .send({
        title: 'Wheat Combine Machine Driver',
        description: 'Machine driver for wheat harvesting season.',
        category: 'Equipment Operation',
        cropType: 'Wheat',
        workType: 'Daily Basis',
        numberOfWorkers: 1,
        requiredSkills: ['Equipment Operation'],
        wageType: 'Daily',
        dailyWage: 900,
        startDate: new Date().toISOString(),
        jobAddress: { district: 'Patiala', state: 'Punjab' },
      });
    job2 = job2Res.body.data;

    // 5. Worker applies to Job 1 (Pending)
    await request(app)
      .post(`/api/v1/jobs/${job1._id}/apply`)
      .set('Authorization', `Bearer ${workerToken}`)
      .send({
        coverLetter: 'Interested in Paddy Sowing operations',
      });

    // 6. Worker applies to Job 2 (Withdrawn)
    const app2Res = await request(app)
      .post(`/api/v1/jobs/${job2._id}/apply`)
      .set('Authorization', `Bearer ${workerToken}`)
      .send({
        coverLetter: 'Machine operator experience with Wheat harvesting',
      });

    await request(app)
      .patch(`/api/v1/applications/${app2Res.body.data._id}/withdraw`)
      .set('Authorization', `Bearer ${workerToken}`);
  });

  afterAll(async () => {
    await User.deleteMany({ email: /@myapps\.com$/ });
    await Job.deleteMany({});
    await Application.deleteMany({});
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });

  it('GET /api/v1/applications/my-applications - should retrieve applications list with populated job & farmer', async () => {
    const res = await request(app)
      .get('/api/v1/applications/my-applications')
      .set('Authorization', `Bearer ${workerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeInstanceOf(Array);
    expect(res.body.data.length).toBe(2);

    // Verify Populated Fields
    const appDoc = res.body.data[0];
    expect(appDoc.job).toBeDefined();
    expect(appDoc.job.title).toBeDefined();
    expect(appDoc.farmer).toBeDefined();
    expect(appDoc.farmer.name).toBe('Gurmail Farmer');
    expect(appDoc.farmer.email).toBeDefined();

    // Verify Pagination Meta
    expect(res.body.meta.pagination).toBeDefined();
    expect(res.body.meta.pagination.total).toBe(2);
    expect(res.body.meta.pagination.page).toBe(1);
  });

  it('GET /api/v1/applications/my-applications - should filter applications by status', async () => {
    const res = await request(app)
      .get('/api/v1/applications/my-applications?status=Withdrawn')
      .set('Authorization', `Bearer ${workerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].status).toBe('Withdrawn');
  });

  it('GET /api/v1/applications/my-applications - should filter applications by search query', async () => {
    const res = await request(app)
      .get('/api/v1/applications/my-applications?search=Paddy')
      .set('Authorization', `Bearer ${workerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].job.title).toMatch(/Paddy/i);
  });

  it('GET /api/v1/applications/my-applications - should support pagination limit and sorting', async () => {
    const res = await request(app)
      .get('/api/v1/applications/my-applications?page=1&limit=1&sort=oldest')
      .set('Authorization', `Bearer ${workerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBe(1);
    expect(res.body.meta.pagination.totalPages).toBe(2);
    expect(res.body.meta.pagination.hasNextPage).toBe(true);
    expect(res.body.meta.pagination.hasPrevPage).toBe(false);
  });

  it('GET /api/v1/applications/my-applications - should deny Farmers (403 Forbidden)', async () => {
    const res = await request(app)
      .get('/api/v1/applications/my-applications')
      .set('Authorization', `Bearer ${farmerToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });
});
