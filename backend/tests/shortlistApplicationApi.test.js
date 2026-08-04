import request from 'supertest';
import mongoose from 'mongoose';
import app from '../app.js';
import { User } from '../models/User.js';
import { Job } from '../models/Job.js';
import { Application } from '../models/Application.js';

describe('Shortlist Application API Suite (POST /api/v1/applications/:id/shortlist)', () => {
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

    await User.deleteMany({ email: /@shortlisttest\.com$/ });
    await Job.deleteMany({});
    await Application.deleteMany({});
    await Application.init();

    // 1. Register Farmer 1
    const farmer1Res = await request(app)
      .post('/api/v1/auth/register/farmer')
      .send({
        name: 'Harmesh Farmer',
        email: `harmesh.${Date.now()}@shortlisttest.com`,
        mobile: `+919891${Math.floor(100000 + Math.random() * 900000)}`,
        password: 'Password123!',
        farmName: 'Harmesh Green Farm',
        farmSize: 20,
        farmSizeUnit: 'Acres',
        district: 'Jalandhar',
        state: 'Punjab',
        location: 'Jalandhar, Punjab',
      });
    farmer1Token = farmer1Res.body.data.tokens.accessToken;

    // 2. Register Farmer 2
    const farmer2Res = await request(app)
      .post('/api/v1/auth/register/farmer')
      .send({
        name: 'Kuldeep Farmer',
        email: `kuldeep.${Date.now()}@shortlisttest.com`,
        mobile: `+919892${Math.floor(100000 + Math.random() * 900000)}`,
        password: 'Password123!',
        farmName: 'Kuldeep Organic Fields',
        farmSize: 25,
        farmSizeUnit: 'Acres',
        district: 'Jalandhar',
        state: 'Punjab',
        location: 'Jalandhar, Punjab',
      });
    farmer2Token = farmer2Res.body.data.tokens.accessToken;

    // 3. Register Worker 1 & Worker 2
    const worker1Res = await request(app)
      .post('/api/v1/auth/register/worker')
      .send({
        name: 'Sukhdev Worker',
        email: `sukhdev.${Date.now()}@shortlisttest.com`,
        mobile: `+919893${Math.floor(100000 + Math.random() * 900000)}`,
        password: 'Password123!',
        skills: ['Plowing'],
        dailyRate: 700,
        experienceYears: 5,
        location: 'Jalandhar, Punjab',
      });
    worker1Token = worker1Res.body.data.tokens.accessToken;

    const worker2Res = await request(app)
      .post('/api/v1/auth/register/worker')
      .send({
        name: 'Charanjit Worker',
        email: `charanjit.${Date.now()}@shortlisttest.com`,
        mobile: `+919894${Math.floor(100000 + Math.random() * 900000)}`,
        password: 'Password123!',
        skills: ['Harvesting'],
        dailyRate: 750,
        experienceYears: 7,
        location: 'Jalandhar, Punjab',
      });
    worker2Token = worker2Res.body.data.tokens.accessToken;

    // 4. Farmer 1 creates Job
    const jobRes = await request(app)
      .post('/api/v1/jobs')
      .set('Authorization', `Bearer ${farmer1Token}`)
      .send({
        title: 'Potato Crop Harvesters Required',
        description: 'Harvesting potatoes in field #4.',
        category: 'Harvesting',
        cropType: 'Potato',
        workType: 'Daily Basis',
        numberOfWorkers: 3,
        requiredSkills: ['Harvesting'],
        wageType: 'Daily',
        dailyWage: 750,
        startDate: new Date().toISOString(),
        jobAddress: { district: 'Jalandhar', state: 'Punjab' },
      });
    testJobId = jobRes.body.data._id;

    // 5. Worker 1 & Worker 2 apply
    const app1Res = await request(app)
      .post(`/api/v1/jobs/${testJobId}/apply`)
      .set('Authorization', `Bearer ${worker1Token}`)
      .send({ coverLetter: 'Worker 1 apply' });
    app1Id = app1Res.body.data._id;

    const app2Res = await request(app)
      .post(`/api/v1/jobs/${testJobId}/apply`)
      .set('Authorization', `Bearer ${worker2Token}`)
      .send({ coverLetter: 'Worker 2 apply' });
    app2Id = app2Res.body.data._id;
  });

  afterAll(async () => {
    await User.deleteMany({ email: /@shortlisttest\.com$/ });
    await Job.deleteMany({});
    await Application.deleteMany({});
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });

  it('POST /api/v1/applications/:id/shortlist - should deny non-owner Farmers (403 Forbidden)', async () => {
    const res = await request(app)
      .post(`/api/v1/applications/${app1Id}/shortlist`)
      .set('Authorization', `Bearer ${farmer2Token}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('POST /api/v1/applications/:id/shortlist - should deny Workers (403 Forbidden)', async () => {
    const res = await request(app)
      .post(`/api/v1/applications/${app1Id}/shortlist`)
      .set('Authorization', `Bearer ${worker1Token}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('POST /api/v1/applications/:id/shortlist - should toggle shortlist ON and update dashboard stats', async () => {
    const res = await request(app)
      .post(`/api/v1/applications/${app1Id}/shortlist`)
      .set('Authorization', `Bearer ${farmer1Token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.shortlisted).toBe(true);
    expect(res.body.data.status).toBe('Shortlisted');

    // Verify statistics in meta
    expect(res.body.meta.statistics).toBeDefined();
    expect(res.body.meta.statistics.shortlisted).toBe(1);
  });

  it('POST /api/v1/applications/:id/shortlist - should support multiple shortlisted candidates independently', async () => {
    const res = await request(app)
      .post(`/api/v1/applications/${app2Id}/shortlist`)
      .set('Authorization', `Bearer ${farmer1Token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.shortlisted).toBe(true);
    expect(res.body.meta.statistics.shortlisted).toBe(2);
  });

  it('POST /api/v1/applications/:id/shortlist - should toggle shortlist OFF when invoked again', async () => {
    const res = await request(app)
      .post(`/api/v1/applications/${app1Id}/shortlist`)
      .set('Authorization', `Bearer ${farmer1Token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.shortlisted).toBe(false);
    expect(res.body.data.status).toBe('Pending');
    expect(res.body.meta.statistics.shortlisted).toBe(1);
  });
});
