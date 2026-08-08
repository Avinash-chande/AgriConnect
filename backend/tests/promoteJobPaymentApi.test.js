import request from 'supertest';
import mongoose from 'mongoose';
import app from '../app.js';
import { User } from '../models/User.js';
import { Job } from '../models/Job.js';
import { FarmerProfile } from '../models/FarmerProfile.js';
import { Payment } from '../models/Payment.js';
import { Transaction } from '../models/Transaction.js';
import { Invoice } from '../models/Invoice.js';
import { jwtConfig } from '../config/jwt.js';
import jwt from 'jsonwebtoken';

describe('Featured Job Promotion Payment API Integration Suite', () => {
  let farmerToken;
  let otherFarmerToken;
  let farmerId;
  let otherFarmerId;
  let testJobId;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(
        process.env.MONGODB_TEST_URI || 'mongodb://127.0.0.1:27017/agriconnect_test_db'
      );
    }

    // Farmer 1 (Job Owner)
    const f1 = await User.create({
      name: 'Owner Farmer',
      email: `promo_owner_${Date.now()}@agriconnect.com`,
      mobile: `+9198${Math.floor(10000000 + Math.random() * 90000000)}`,
      password: 'password123',
      role: 'Farmer',
    });
    farmerId = f1._id;
    farmerToken = jwt.sign({ id: f1._id, role: f1.role }, jwtConfig.accessSecret, { expiresIn: '1h' });

    await FarmerProfile.create({
      user: farmerId,
      owner: farmerId,
      farmSize: 10,
      farmName: 'Owner Acres',
      location: { type: 'Point', coordinates: [75.8573, 31.634] },
      farmAddress: { village: 'Rampur', district: 'Ludhiana', state: 'Punjab', pincode: '141001' },
    });

    // Farmer 2 (Other Farmer)
    const f2 = await User.create({
      name: 'Other Farmer',
      email: `promo_other_${Date.now()}@agriconnect.com`,
      mobile: `+9198${Math.floor(10000000 + Math.random() * 90000000)}`,
      password: 'password123',
      role: 'Farmer',
    });
    otherFarmerId = f2._id;
    otherFarmerToken = jwt.sign({ id: f2._id, role: f2.role }, jwtConfig.accessSecret, { expiresIn: '1h' });

    // Job Posting
    const job = await Job.create({
      farmer: farmerId,
      title: 'Paddy Harvesting Job',
      description: 'Paddy harvesting required for 8 acres farm with high machinery.',
      category: 'Harvesting',
      workType: 'Full-Time',
      numberOfWorkers: 4,
      requiredSkills: ['Harvesting', 'Crop Management'],
      wageType: 'Daily',
      dailyWage: 550,
      startDate: new Date(Date.now() + 86400000),
      isFeatured: false,
      jobAddress: {
        village: 'Rampur',
        district: 'Ludhiana',
        state: 'Punjab',
        pincode: '141001',
      },
    });
    testJobId = job._id;
  });

  afterAll(async () => {
    if (farmerId) {
      await User.findByIdAndDelete(farmerId);
      await FarmerProfile.deleteMany({ user: farmerId });
    }
    if (otherFarmerId) {
      await User.findByIdAndDelete(otherFarmerId);
      await FarmerProfile.deleteMany({ user: otherFarmerId });
    }
    await Job.findByIdAndDelete(testJobId);
    await Payment.deleteMany({ user: farmerId });
    await Transaction.deleteMany({ user: farmerId });
    await Invoice.deleteMany({ user: farmerId });
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });

  describe('POST /api/v1/payments/promote-job/order', () => {
    it('should reject non-owner attempting to create promotion order', async () => {
      const res = await request(app)
        .post('/api/v1/payments/promote-job/order')
        .set('Authorization', `Bearer ${otherFarmerToken}`)
        .send({ jobId: testJobId, planId: 'job_promote_7d' });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Only the job owner can promote');
    });

    it('should create promotion order for valid job owner', async () => {
      const res = await request(app)
        .post('/api/v1/payments/promote-job/order')
        .set('Authorization', `Bearer ${farmerToken}`)
        .send({ jobId: testJobId, planId: 'job_promote_7d' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);

      const data = res.body.data;
      expect(data.orderId).toBeDefined();
      expect(data.amount).toBe(199);

      // Verify job is NOT featured before payment verification
      const job = await Job.findById(testJobId);
      expect(job.isFeatured).toBe(false);
    });
  });

  describe('POST /api/v1/payments/promote-job/verify', () => {
    it('should verify payment and activate job promotion status', async () => {
      // 1. Create order
      const orderRes = await request(app)
        .post('/api/v1/payments/promote-job/order')
        .set('Authorization', `Bearer ${farmerToken}`)
        .send({ jobId: testJobId, planId: 'job_promote_14d' });

      const orderId = orderRes.body.data.orderId;
      const paymentId = `pay_promo_${Date.now()}`;

      // 2. Verify signature using test mode valid_mock_signature
      const verifyRes = await request(app)
        .post('/api/v1/payments/promote-job/verify')
        .set('Authorization', `Bearer ${farmerToken}`)
        .send({
          razorpay_order_id: orderId,
          razorpay_payment_id: paymentId,
          razorpay_signature: 'valid_mock_signature',
        });

      expect(verifyRes.status).toBe(200);
      expect(verifyRes.body.data.verified).toBe(true);

      // 3. Verify Job status updated in database
      const updatedJob = await Job.findById(testJobId);
      expect(updatedJob.isFeatured).toBe(true);
      expect(updatedJob.featuredStartDate).toBeDefined();
      expect(updatedJob.featuredEndDate).toBeDefined();
    });
  });
});
