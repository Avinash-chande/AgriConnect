import { jest } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../app.js';
import { User } from '../models/User.js';
import { Job } from '../models/Job.js';
import { Application } from '../models/Application.js';

describe('Farmer Job Dashboard Real Application Counts (GET /api/v1/jobs/farmer/my-jobs)', () => {
  jest.setTimeout(30000);

  let farmerAToken;
  let farmerBToken;
  let farmerAUser;
  let farmerBUser;
  let workerAUser;
  let workerBUser;
  let workerCUser;
  let jobA;
  let jobB;
  let jobC; // Belongs to Farmer B

  beforeAll(async () => {
    const mongoUri = process.env.MONGODB_TEST_URI || 'mongodb://127.0.0.1:27017/agriconnect_test_db';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }

    await User.deleteMany({ email: /@appcounttest\.com$/ });
    await Job.deleteMany({});
    await Application.deleteMany({});

    // 1. Register Farmer A
    const farmerARes = await request(app)
      .post('/api/v1/auth/register/farmer')
      .send({
        name: 'Farmer Alpha',
        email: `farmerA.${Date.now()}@appcounttest.com`,
        mobile: `+919888${Math.floor(100000 + Math.random() * 900000)}`,
        password: 'Password123!',
        farmName: 'Alpha Farm',
        farmSize: 20,
        farmSizeUnit: 'Acres',
        district: 'Ludhiana',
        state: 'Punjab',
        location: 'Ludhiana, Punjab',
      });
    farmerAToken = farmerARes.body.data.tokens.accessToken;
    farmerAUser = farmerARes.body.data.user;

    // 2. Register Farmer B
    const farmerBRes = await request(app)
      .post('/api/v1/auth/register/farmer')
      .send({
        name: 'Farmer Beta',
        email: `farmerB.${Date.now()}@appcounttest.com`,
        mobile: `+919877${Math.floor(100000 + Math.random() * 900000)}`,
        password: 'Password123!',
        farmName: 'Beta Farm',
        farmSize: 30,
        farmSizeUnit: 'Acres',
        district: 'Patiala',
        state: 'Punjab',
        location: 'Patiala, Punjab',
      });
    farmerBToken = farmerBRes.body.data.tokens.accessToken;
    farmerBUser = farmerBRes.body.data.user;

    // 3. Register Worker A, Worker B, Worker C
    const registerWorker = async (name) => {
      const res = await request(app)
        .post('/api/v1/auth/register/worker')
        .send({
          name,
          email: `${name.toLowerCase().replace(/\s+/g, '')}.${Date.now()}@appcounttest.com`,
          mobile: `+919766${Math.floor(100000 + Math.random() * 900000)}`,
          password: 'Password123!',
          skills: ['Field Harvesting'],
          dailyRate: 650,
          experienceYears: 3,
          district: 'Ludhiana',
          state: 'Punjab',
          location: 'Ludhiana, Punjab',
        });
      return res.body.data.user;
    };

    workerAUser = await registerWorker('Worker One');
    workerBUser = await registerWorker('Worker Two');
    workerCUser = await registerWorker('Worker Three');

    // 4. Create Job A and Job B for Farmer A
    jobA = await Job.create({
      farmer: farmerAUser._id,
      title: 'Vegetable Farm Worker',
      description: 'Vegetable harvesting and sorting in Ludhiana.',
      category: 'Harvesting',
      workType: 'Daily Basis',
      numberOfWorkers: 3,
      wageType: 'Daily',
      dailyWage: 600,
      startDate: new Date(Date.now() + 86400000),
      jobAddress: { district: 'Ludhiana', state: 'Punjab' },
      requiredSkills: ['Harvesting'],
      status: 'Active',
    });

    jobB = await Job.create({
      farmer: farmerAUser._id,
      title: 'Wheat Harvesting Specialist',
      description: 'Wheat cutting and threshing.',
      category: 'Harvesting',
      workType: 'Contractual / Seasonal',
      numberOfWorkers: 5,
      wageType: 'Daily',
      dailyWage: 750,
      startDate: new Date(Date.now() + 86400000),
      jobAddress: { district: 'Ludhiana', state: 'Punjab' },
      requiredSkills: ['Wheat Harvesting'],
      status: 'Active',
    });

    // 5. Create Job C for Farmer B
    jobC = await Job.create({
      farmer: farmerBUser._id,
      title: 'Sugarcane Planter',
      description: 'Sugarcane planting operations in Patiala.',
      category: 'Sowing / Planting',
      workType: 'Daily Basis',
      numberOfWorkers: 4,
      wageType: 'Daily',
      dailyWage: 700,
      startDate: new Date(Date.now() + 86400000),
      jobAddress: { district: 'Patiala', state: 'Punjab' },
      requiredSkills: ['Planting'],
      status: 'Active',
    });
  });

  afterAll(async () => {
    await User.deleteMany({ email: /@appcounttest\.com$/ });
    await Job.deleteMany({});
    await Application.deleteMany({});
    await mongoose.connection.close();
  });

  it('Test 1: should return 0 application count when no workers have applied', async () => {
    const res = await request(app)
      .get('/api/v1/jobs/farmer/my-jobs')
      .set('Authorization', `Bearer ${farmerAToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(2);

    const foundJobA = res.body.data.find((j) => j._id.toString() === jobA._id.toString());
    const foundJobB = res.body.data.find((j) => j._id.toString() === jobB._id.toString());

    expect(foundJobA.applicationCount).toBe(0);
    expect(foundJobA.totalApplications).toBe(0);
    expect(foundJobB.applicationCount).toBe(0);
    expect(foundJobB.totalApplications).toBe(0);

    expect(res.body.meta.stats.totalApplications).toBe(0);
    res.body.meta.stats.applicationsChart.forEach((chartItem) => {
      expect(chartItem.applications).toBe(0);
    });
  });

  it('Test 2: should update application count to 1 when Worker A applies to Job A', async () => {
    await Application.create({
      job: jobA._id,
      farmer: farmerAUser._id,
      worker: workerAUser._id,
      coverLetter: 'I am ready for Vegetable harvest',
      expectedDailyWage: 600,
      status: 'Pending',
    });

    const res = await request(app)
      .get('/api/v1/jobs/farmer/my-jobs')
      .set('Authorization', `Bearer ${farmerAToken}`);

    expect(res.status).toBe(200);
    const foundJobA = res.body.data.find((j) => j._id.toString() === jobA._id.toString());
    const foundJobB = res.body.data.find((j) => j._id.toString() === jobB._id.toString());

    expect(foundJobA.applicationCount).toBe(1);
    expect(foundJobA.totalApplications).toBe(1);
    expect(foundJobB.applicationCount).toBe(0);
    expect(res.body.meta.stats.totalApplications).toBe(1);
  });

  it('Test 3: should update application count to 2 when Worker B also applies to Job A', async () => {
    await Application.create({
      job: jobA._id,
      farmer: farmerAUser._id,
      worker: workerBUser._id,
      coverLetter: 'Experienced vegetable farm worker',
      expectedDailyWage: 600,
      status: 'Pending',
    });

    const res = await request(app)
      .get('/api/v1/jobs/farmer/my-jobs')
      .set('Authorization', `Bearer ${farmerAToken}`);

    expect(res.status).toBe(200);
    const foundJobA = res.body.data.find((j) => j._id.toString() === jobA._id.toString());
    const foundJobB = res.body.data.find((j) => j._id.toString() === jobB._id.toString());

    expect(foundJobA.applicationCount).toBe(2);
    expect(foundJobA.totalApplications).toBe(2);
    expect(foundJobB.applicationCount).toBe(0);
    expect(res.body.meta.stats.totalApplications).toBe(2);
  });

  it('Test 4: should count applications per-job when Worker C applies to Job B', async () => {
    await Application.create({
      job: jobB._id,
      farmer: farmerAUser._id,
      worker: workerCUser._id,
      coverLetter: 'Experienced wheat thresher',
      expectedDailyWage: 750,
      status: 'Pending',
    });

    const res = await request(app)
      .get('/api/v1/jobs/farmer/my-jobs')
      .set('Authorization', `Bearer ${farmerAToken}`);

    expect(res.status).toBe(200);
    const foundJobA = res.body.data.find((j) => j._id.toString() === jobA._id.toString());
    const foundJobB = res.body.data.find((j) => j._id.toString() === jobB._id.toString());

    expect(foundJobA.applicationCount).toBe(2);
    expect(foundJobB.applicationCount).toBe(1);
    expect(res.body.meta.stats.totalApplications).toBe(3);

    const chartJobA = res.body.meta.stats.applicationsChart.find((c) => c.jobId?.toString() === jobA._id.toString());
    const chartJobB = res.body.meta.stats.applicationsChart.find((c) => c.jobId?.toString() === jobB._id.toString());
    expect(chartJobA.applications).toBe(2);
    expect(chartJobB.applications).toBe(1);
  });

  it('Test 5: Farmer B should only see Farmer B jobs and counts, not Farmer A jobs', async () => {
    const res = await request(app)
      .get('/api/v1/jobs/farmer/my-jobs')
      .set('Authorization', `Bearer ${farmerBToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0]._id.toString()).toBe(jobC._id.toString());
    expect(res.body.data[0].applicationCount).toBe(0);
    expect(res.body.meta.stats.totalApplications).toBe(0);
  });
});
