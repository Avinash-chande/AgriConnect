import request from 'supertest';
import mongoose from 'mongoose';
import app from '../app.js';
import { getResolvedPlanPriceService } from '../services/planService.js';

describe('Plan API & Premium Membership System Test Suite', () => {
  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(
        process.env.MONGODB_TEST_URI || 'mongodb://127.0.0.1:27017/agriconnect_test_db'
      );
    }
  });

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });

  describe('GET /api/v1/plans', () => {
    it('should retrieve all available active membership plans', async () => {
      const res = await request(app).get('/api/v1/plans');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.plans)).toBe(true);
      expect(res.body.data.plans.length).toBeGreaterThan(0);
    });

    it('should filter membership plans by targetRole=farmer', async () => {
      const res = await request(app).get('/api/v1/plans?role=farmer');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const farmerPlans = res.body.data.plans;
      expect(farmerPlans.every((p) => p.targetRole === 'farmer' || p.targetRole === 'all')).toBe(true);
    });
  });

  describe('GET /api/v1/plans/:planId', () => {
    it('should fetch specific plan details by valid planId', async () => {
      const res = await request(app).get('/api/v1/plans/farmer_pro_monthly');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.plan.planId).toBe('farmer_pro_monthly');
      expect(res.body.data.plan.price).toBe(499);
    });

    it('should return 404 for non-existent planId', async () => {
      const res = await request(app).get('/api/v1/plans/non_existent_plan_999');
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Server-Side Price Calculation & Verification', () => {
    it('should resolve accurate price in rupees and paise server-side without trusting client', async () => {
      const resolved = await getResolvedPlanPriceService('farmer_pro_monthly');
      expect(resolved.planId).toBe('farmer_pro_monthly');
      expect(resolved.price).toBe(499);
      expect(resolved.amountInPaise).toBe(49900);
      expect(resolved.currency).toBe('INR');
      expect(resolved.durationDays).toBe(30);
    });

    it('should resolve yearly plan price and 365 days duration accurately', async () => {
      const resolved = await getResolvedPlanPriceService('farmer_pro_yearly');
      expect(resolved.planId).toBe('farmer_pro_yearly');
      expect(resolved.price).toBe(4790);
      expect(resolved.amountInPaise).toBe(479000);
      expect(resolved.durationDays).toBe(365);
    });
  });
});
