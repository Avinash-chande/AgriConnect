import request from 'supertest';
import mongoose from 'mongoose';
import { jest, describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import app from '../app.js';
import { User } from '../models/User.js';
import { Job } from '../models/Job.js';
import { Application } from '../models/Application.js';
import { Conversation } from '../models/Conversation.js';

describe('Approval-Based Chat Authorization Suite (POST /api/v1/chat/conversations)', () => {
  jest.setTimeout(30000);
  let farmerToken;
  let farmerUser;
  let worker1Token;
  let worker1User;
  let worker2Token;
  let worker2User;
  let jobId;
  let pendingAppId;
  let acceptedAppId;

  beforeAll(async () => {
    const mongoUri = process.env.MONGODB_TEST_URI || 'mongodb://127.0.0.1:27017/agriconnect_test_db';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }

    await User.deleteMany({ email: /@chattest\.com$/ });
    await Job.deleteMany({});
    await Application.deleteMany({});
    await Conversation.deleteMany({});

    // 1. Register Farmer
    const farmerRes = await request(app)
      .post('/api/v1/auth/register/farmer')
      .send({
        name: 'Chat Test Farmer',
        email: `farmer.${Date.now()}@chattest.com`,
        mobile: `+919881${Math.floor(100000 + Math.random() * 900000)}`,
        password: 'Password123!',
        farmName: 'Chat Testing Farm',
        farmSize: 20,
        farmSizeUnit: 'Acres',
        district: 'Ludhiana',
        state: 'Punjab',
        location: 'Ludhiana, Punjab',
      });
    farmerToken = farmerRes.body.data.tokens.accessToken;
    farmerUser = farmerRes.body.data.user;

    // 2. Register Worker 1 (Pending & Later Accepted)
    const worker1Res = await request(app)
      .post('/api/v1/auth/register/worker')
      .send({
        name: 'Worker One',
        email: `worker1.${Date.now()}@chattest.com`,
        mobile: `+919882${Math.floor(100000 + Math.random() * 900000)}`,
        password: 'Password123!',
        experienceYears: 4,
        primarySkill: 'Harvesting',
        district: 'Ludhiana',
        state: 'Punjab',
        location: 'Ludhiana, Punjab',
      });
    worker1Token = worker1Res.body.data.tokens.accessToken;
    worker1User = worker1Res.body.data.user;

    // 3. Register Worker 2 (Pending / Rejected)
    const worker2Res = await request(app)
      .post('/api/v1/auth/register/worker')
      .send({
        name: 'Worker Two',
        email: `worker2.${Date.now()}@chattest.com`,
        mobile: `+919883${Math.floor(100000 + Math.random() * 900000)}`,
        password: 'Password123!',
        experienceYears: 2,
        primarySkill: 'Plowing',
        district: 'Ludhiana',
        state: 'Punjab',
        location: 'Ludhiana, Punjab',
      });
    worker2Token = worker2Res.body.data.tokens.accessToken;
    worker2User = worker2Res.body.data.user;

    // 4. Create Job
    const jobRes = await request(app)
      .post('/api/v1/jobs')
      .set('Authorization', `Bearer ${farmerToken}`)
      .send({
        title: 'Wheat Harvest Assistant',
        category: 'Harvesting',
        workType: 'Full-Time',
        numberOfWorkers: 3,
        wageType: 'Daily',
        dailyWage: 600,
        requiredSkills: ['Harvesting'],
        startDate: new Date(Date.now() + 86400000).toISOString(),
        endDate: new Date(Date.now() + 86400000 * 7).toISOString(),
        description: 'Harvesting wheat crop in Ludhiana acres with modern machinery.',
        jobAddress: {
          state: 'Punjab',
          district: 'Ludhiana',
          villageOrTehsil: 'Samrala',
          pincode: '141411',
        },
      });
    if (!jobRes.body.data || !jobRes.body.data._id) {
      console.error('Job creation failed:', jobRes.body);
    }
    jobId = jobRes.body.data._id;

    // 5. Worker 1 applies (Pending)
    const app1Res = await request(app)
      .post(`/api/v1/jobs/${jobId}/apply`)
      .set('Authorization', `Bearer ${worker1Token}`)
      .send({
        coverLetter: 'Ready to harvest wheat',
        expectedDailyWage: 600,
      });
    pendingAppId = app1Res.body.data._id;

    // 6. Worker 2 applies (Pending)
    const app2Res = await request(app)
      .post(`/api/v1/jobs/${jobId}/apply`)
      .set('Authorization', `Bearer ${worker2Token}`)
      .send({
        coverLetter: 'Plowing and harvesting experience',
        expectedDailyWage: 600,
      });
  });

  afterAll(async () => {
    await User.deleteMany({ email: /@chattest\.com$/ });
    await Job.deleteMany({});
    await Application.deleteMany({});
    await Conversation.deleteMany({});
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });

  test('1. Pending Worker attempting to initiate chat is DENIED (403 Forbidden)', async () => {
    const res = await request(app)
      .post('/api/v1/chat/conversations')
      .set('Authorization', `Bearer ${worker1Token}`)
      .send({
        farmerId: farmerUser._id,
        jobId,
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/approves\/accepts/i);
  });

  test('2. Farmer attempting to initiate chat with Pending Worker is DENIED (403 Forbidden)', async () => {
    const res = await request(app)
      .post('/api/v1/chat/conversations')
      .set('Authorization', `Bearer ${farmerToken}`)
      .send({
        workerId: worker1User._id,
        jobId,
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  test('3. Farmer accepts Worker 1 application -> Chat access is GRANTED', async () => {
    const acceptRes = await request(app)
      .patch(`/api/v1/applications/${pendingAppId}/accept`)
      .set('Authorization', `Bearer ${farmerToken}`)
      .send({ farmerFeedback: 'Welcome aboard!' });

    expect(acceptRes.status).toBe(200);
    expect(acceptRes.body.data.status).toBe('Accepted');

    // Worker 1 can now initiate conversation
    const convRes = await request(app)
      .post('/api/v1/chat/conversations')
      .set('Authorization', `Bearer ${worker1Token}`)
      .send({
        farmerId: farmerUser._id,
        jobId,
      });

    expect(convRes.status).toBe(200);
    expect(convRes.body.success).toBe(true);
    expect(convRes.body.data._id).toBeDefined();
    acceptedAppId = convRes.body.data._id;
  });

  test('4. Approved Worker 1 can send message to Farmer', async () => {
    const msgRes = await request(app)
      .post(`/api/v1/chat/conversations/${acceptedAppId}/messages`)
      .set('Authorization', `Bearer ${worker1Token}`)
      .send({ text: 'Hello Farmer, what time should I arrive tomorrow?' });

    expect(msgRes.status).toBe(201);
    expect(msgRes.body.success).toBe(true);
    expect(msgRes.body.data.text).toBe('Hello Farmer, what time should I arrive tomorrow?');
  });

  test('5. Worker 2 (whose application was rejected) is DENIED chat (403 Forbidden)', async () => {
    // Farmer rejects Worker 2
    const worker2Apps = await request(app)
      .get('/api/v1/applications/farmer')
      .set('Authorization', `Bearer ${farmerToken}`);
    
    const worker2App = worker2Apps.body.data.find(
      (a) => (a.worker._id || a.worker).toString() === worker2User._id.toString()
    );

    if (worker2App) {
      await request(app)
        .patch(`/api/v1/applications/${worker2App._id}/reject`)
        .set('Authorization', `Bearer ${farmerToken}`)
        .send({ reason: 'Position full' });
    }

    const res = await request(app)
      .post('/api/v1/chat/conversations')
      .set('Authorization', `Bearer ${worker2Token}`)
      .send({
        farmerId: farmerUser._id,
        jobId,
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  test('6. Chat eligibility endpoint returns true for Worker 1 and false for Worker 2', async () => {
    const res1 = await request(app)
      .get('/api/v1/chat/eligibility')
      .set('Authorization', `Bearer ${worker1Token}`);

    expect(res1.status).toBe(200);
    expect(res1.body.data.canChat).toBe(true);

    const res2 = await request(app)
      .get('/api/v1/chat/eligibility')
      .set('Authorization', `Bearer ${worker2Token}`);

    expect(res2.status).toBe(200);
    expect(res2.body.data.canChat).toBe(false);
  });
});
