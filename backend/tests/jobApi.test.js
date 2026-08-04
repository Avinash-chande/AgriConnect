import request from 'supertest';
import mongoose from 'mongoose';
import app from '../app.js';
import { User } from '../models/User.js';
import { Job } from '../models/Job.js';
import { JOB_STATUS, USER_ROLES } from '../constants/index.js';

describe('Job Management API Suite (GET, POST, PUT & DELETE /api/v1/jobs)', () => {
  let farmerToken;
  let otherFarmerToken;
  let adminToken;
  let workerToken;
  let farmerUser;
  let testJobId;

  beforeAll(async () => {
    const mongoUri = process.env.MONGODB_TEST_URI || 'mongodb://127.0.0.1:27017/agriconnect_test_db';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }

    await User.deleteMany({ email: /@jobapitest\.com$/ });
    await Job.deleteMany({});

    // 1. Register Farmer 1
    const farmerRes = await request(app)
      .post('/api/v1/auth/register/farmer')
      .send({
        name: 'Harpreet Singh Farmer',
        email: `harpreet.${Date.now()}@jobapitest.com`,
        mobile: `+919876${Math.floor(100000 + Math.random() * 900000)}`,
        password: 'Password123!',
        farmName: 'Harpreet Green Organic Farms',
        farmSize: 15,
        farmSizeUnit: 'Acres',
        district: 'Gurdaspur',
        state: 'Punjab',
        location: 'Gurdaspur, Punjab',
      });

    farmerToken = farmerRes.body.data.tokens.accessToken;
    farmerUser = farmerRes.body.data.user;

    // 2. Register Farmer 2
    const otherFarmerRes = await request(app)
      .post('/api/v1/auth/register/farmer')
      .send({
        name: 'Gurpreet Singh Farmer',
        email: `gurpreet.${Date.now()}@jobapitest.com`,
        mobile: `+919877${Math.floor(100000 + Math.random() * 900000)}`,
        password: 'Password123!',
        farmName: 'Gurpreet Organic Acres',
        farmSize: 20,
        farmSizeUnit: 'Acres',
        district: 'Amritsar',
        state: 'Punjab',
        location: 'Amritsar, Punjab',
      });

    otherFarmerToken = otherFarmerRes.body.data.tokens.accessToken;

    // 3. Register Worker
    const workerRes = await request(app)
      .post('/api/v1/auth/register/worker')
      .send({
        name: 'Sukhdev Worker',
        email: `sukhdev.${Date.now()}@jobapitest.com`,
        mobile: `+919812${Math.floor(100000 + Math.random() * 900000)}`,
        password: 'Password123!',
        skills: ['Plowing', 'Crop Harvesting'],
        dailyRate: 700,
        experienceYears: 4,
        location: 'Patiala, Punjab',
      });

    workerToken = workerRes.body.data.tokens.accessToken;

    // 4. Create Admin User
    const adminUser = await User.create({
      name: 'System Admin',
      email: `admin.${Date.now()}@jobapitest.com`,
      mobile: `+919999${Math.floor(100000 + Math.random() * 900000)}`,
      password: 'Password123!',
      role: USER_ROLES.ADMIN,
    });

    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: adminUser.email,
        password: 'Password123!',
      });

    adminToken = loginRes.body.data.tokens.accessToken;

    // 5. Seed Test Jobs for Query & Filtering Tests
    await Job.create([
      {
        farmer: farmerUser._id,
        title: 'Paddy Harvesting Laborers Needed',
        description: 'Looking for experienced laborers for paddy harvesting in Gurdaspur farms.',
        category: 'Harvesting',
        cropType: 'Paddy',
        workType: 'Daily Basis',
        numberOfWorkers: 5,
        requiredSkills: ['Paddy Cutting'],
        wageType: 'Daily',
        dailyWage: 750,
        startDate: new Date(),
        jobAddress: { district: 'Gurdaspur', village: 'Dhariwal', state: 'Punjab' },
        accommodationProvided: true,
        foodProvided: true,
        transportProvided: false,
        isUrgent: true,
        isFeatured: false,
        totalViews: 120,
      },
      {
        farmer: farmerUser._id,
        title: 'Tractor Driver for Wheat Plowing',
        description: 'Need skilled tractor driver for deep plowing',
        category: 'Plowing / Tillage',
        cropType: 'Wheat',
        workType: 'Daily Basis',
        numberOfWorkers: 2,
        requiredSkills: ['Tractor Driving'],
        wageType: 'Daily',
        dailyWage: 900,
        startDate: new Date(),
        jobAddress: { district: 'Amritsar', village: 'Rayya', state: 'Punjab' },
        accommodationProvided: false,
        foodProvided: true,
        transportProvided: true,
        isUrgent: false,
        isFeatured: true,
        totalViews: 350,
      },
      {
        farmer: farmerUser._id,
        title: 'Cotton Picker Seasonal Work',
        description: 'Cotton picking season labor requirement',
        category: 'Harvesting',
        cropType: 'Cotton',
        workType: 'Contractual / Seasonal',
        numberOfWorkers: 10,
        requiredSkills: ['Cotton Picking'],
        wageType: 'Daily',
        dailyWage: 600,
        startDate: new Date(),
        jobAddress: { district: 'Bathinda', village: 'Rampura', state: 'Punjab' },
        accommodationProvided: false,
        foodProvided: false,
        transportProvided: false,
        isUrgent: false,
        isFeatured: false,
        totalViews: 50,
      },
    ]);
  });

  afterAll(async () => {
    await User.deleteMany({ email: /@jobapitest\.com$/ });
    await Job.deleteMany({});
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });

  it('GET /api/v1/jobs - should retrieve paginated list of active jobs with metadata', async () => {
    const res = await request(app).get('/api/v1/jobs?page=1&limit=2');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeInstanceOf(Array);
    expect(res.body.data.length).toBe(2);

    expect(res.body.meta).toBeDefined();
    expect(res.body.meta.pagination).toBeDefined();
    expect(res.body.meta.pagination.totalJobs).toBe(3);
    expect(res.body.meta.pagination.page).toBe(1);
    expect(res.body.meta.pagination.limit).toBe(2);
    expect(res.body.meta.pagination.totalPages).toBe(2);
    expect(res.body.meta.pagination.hasNextPage).toBe(true);
    expect(res.body.meta.pagination.hasPrevPage).toBe(false);

    // Verify populating farmer details & sensitive data removal
    const job = res.body.data[0];
    expect(job.farmer).toBeDefined();
    expect(job.farmer.name).toBe('Harpreet Singh Farmer');
    expect(job.__v).toBeUndefined();
    expect(job.isDeleted).toBeUndefined();
  });

  it('GET /api/v1/jobs/autocomplete - should return categorized suggestions for input query', async () => {
    const res = await request(app).get('/api/v1/jobs/autocomplete?q=Paddy');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.titles).toContain('Paddy Harvesting Laborers Needed');
    expect(res.body.data.crops).toContain('Paddy');
    expect(res.body.data.skills).toContain('Paddy Cutting');
  });

  it('GET /api/v1/jobs/farmer/my-jobs - should retrieve farmer dashboard metrics & jobs', async () => {
    const res = await request(app)
      .get('/api/v1/jobs/farmer/my-jobs')
      .set('Authorization', `Bearer ${farmerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeInstanceOf(Array);
    expect(res.body.data.length).toBe(3);

    expect(res.body.meta.stats).toBeDefined();
    expect(res.body.meta.stats.totalJobs).toBe(3);
    expect(res.body.meta.stats.openJobs).toBe(3);
    expect(res.body.meta.stats.applicationsChart).toBeInstanceOf(Array);
    expect(res.body.meta.stats.viewsTrendChart).toBeInstanceOf(Array);
  });

  it('GET /api/v1/jobs - should filter jobs by advanced parameters (accommodation, village, transport)', async () => {
    const res = await request(app).get('/api/v1/jobs?accommodation=true&village=Dhariwal');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].title).toBe('Paddy Harvesting Laborers Needed');
    expect(res.body.data[0].accommodationProvided).toBe(true);
  });

  it('GET /api/v1/jobs - should sort jobs by popular and wageHighToLow', async () => {
    const popularRes = await request(app).get('/api/v1/jobs?sort=popular');
    expect(popularRes.status).toBe(200);
    expect(popularRes.body.data[0].title).toBe('Tractor Driver for Wheat Plowing');

    const wageRes = await request(app).get('/api/v1/jobs?sort=wageHighToLow');
    expect(wageRes.status).toBe(200);
    expect(wageRes.body.data[0].dailyWage).toBe(900);
  });

  it('POST /api/v1/jobs - should reject invalid inputs with 400 Bad Request', async () => {
    const invalidPayload = {
      title: 'Tiny', // < 5 chars
      description: 'Short', // < 20 chars
      category: 'InvalidCategory',
      numberOfWorkers: 0, // < 1
      wageType: 'Daily',
      dailyWage: 10, // < 50
    };

    const res = await request(app)
      .post('/api/v1/jobs')
      .set('Authorization', `Bearer ${farmerToken}`)
      .send(invalidPayload);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('POST /api/v1/jobs - should deny Workers from posting jobs with 403 Forbidden', async () => {
    const res = await request(app)
      .post('/api/v1/jobs')
      .set('Authorization', `Bearer ${workerToken}`)
      .send({ title: 'Test Title' });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('POST /api/v1/jobs - should allow a Farmer to create a new job vacancy', async () => {
    const jobPayload = {
      title: 'Sugarcane Harvester Machine Operator',
      description: 'Sugarcane cutting and loading operator needed in Jalandhar field.',
      category: 'Harvesting',
      cropType: 'Sugarcane',
      workType: 'Daily Basis',
      numberOfWorkers: 3,
      requiredSkills: ['Machine Operation'],
      wageType: 'Daily',
      dailyWage: 950,
      startDate: new Date().toISOString(),
      jobAddress: {
        district: 'Jalandhar',
        state: 'Punjab',
      },
    };

    const res = await request(app)
      .post('/api/v1/jobs')
      .set('Authorization', `Bearer ${farmerToken}`)
      .send(jobPayload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    testJobId = res.body.data._id;
  });

  it('PUT /api/v1/jobs/:id - should allow the job owner to edit the job posting', async () => {
    const updatePayload = {
      title: 'Senior Sugarcane Harvester Machine Operator',
      numberOfWorkers: 5,
      dailyWage: 1100,
    };

    const res = await request(app)
      .put(`/api/v1/jobs/${testJobId}`)
      .set('Authorization', `Bearer ${farmerToken}`)
      .send(updatePayload);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.title).toBe('Senior Sugarcane Harvester Machine Operator');
    expect(res.body.data.numberOfWorkers).toBe(5);
    expect(res.body.data.dailyWage).toBe(1100);
  });

  it('PUT /api/v1/jobs/:id - should deny non-owner farmers from editing with 403 Forbidden', async () => {
    const res = await request(app)
      .put(`/api/v1/jobs/${testJobId}`)
      .set('Authorization', `Bearer ${otherFarmerToken}`)
      .send({ title: 'Hacked Title' });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('POST /api/v1/jobs/:id/share - should increment share count metric', async () => {
    const res = await request(app).post(`/api/v1/jobs/${testJobId}/share`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.shareCount).toBe(1);
  });

  it('DELETE /api/v1/jobs/:id - should soft delete job vacancy', async () => {
    const res = await request(app)
      .delete(`/api/v1/jobs/${testJobId}`)
      .set('Authorization', `Bearer ${farmerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
