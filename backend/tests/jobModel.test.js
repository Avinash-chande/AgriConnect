import request from 'supertest';
import mongoose from 'mongoose';
import app from '../app.js';
import { User } from '../models/User.js';
import { Job } from '../models/Job.js';
import { JOB_STATUS } from '../constants/index.js';

describe('Job Management Schema & Model Suite', () => {
  let testUser;

  beforeAll(async () => {
    const mongoUri = process.env.MONGODB_TEST_URI || 'mongodb://127.0.0.1:27017/agriconnect_test_db';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }

    await User.deleteMany({ email: /@jobtest\.com$/ });
    await Job.deleteMany({});

    testUser = await User.create({
      name: 'Jaswant Singh Farmer',
      email: `jaswant.${Date.now()}@jobtest.com`,
      mobile: `+919814${Math.floor(100000 + Math.random() * 900000)}`,
      password: 'Password123!',
      role: 'Farmer',
    });
  });

  afterAll(async () => {
    await User.deleteMany({ email: /@jobtest\.com$/ });
    await Job.deleteMany({});
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });

  it('should successfully create a valid Job posting with auto-generated slug, GeoJSON, and virtuals', async () => {
    const jobData = {
      farmer: testUser._id,
      title: 'Wheat Harvest Combine Operator Required',
      description: 'Urgent requirement for experienced wheat harvesting combine operator in Amritsar.',
      category: 'Harvesting',
      cropType: 'Wheat',
      workType: 'Daily Basis',
      numberOfWorkers: 3,
      genderPreference: 'Any',
      minimumAge: 21,
      maximumAge: 55,
      experienceRequired: 2,
      requiredSkills: ['Combine Operation', 'Tractor Driving'],
      wageType: 'Daily',
      dailyWage: 800,
      startDate: new Date(),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      workingHours: 8,
      accommodationProvided: true,
      foodProvided: true,
      transportProvided: false,
      jobAddress: {
        district: 'Amritsar',
        state: 'Punjab',
        village: 'Rayya',
        addressLine: 'GT Road Farm Sector 4',
        pincode: '143112',
        latitude: 31.634,
        longitude: 74.872,
      },
      isUrgent: true,
    };

    const job = await Job.create(jobData);

    expect(job._id).toBeDefined();
    expect(job.title).toBe('Wheat Harvest Combine Operator Required');
    expect(job.slug).toBeDefined();
    expect(job.slug).toContain('wheat-harvest-combine-operator-required');
    expect(job.status).toBe(JOB_STATUS.ACTIVE);

    // Verify GeoJSON location synchronization
    expect(job.location).toBeDefined();
    expect(job.location.type).toBe('Point');
    expect(job.location.coordinates).toEqual([74.872, 31.634]);

    // Verify Virtuals
    expect(job.fullAddress).toContain('Amritsar');
    expect(job.formattedWage).toBe('₹800 / Daily');
    expect(job.isExpired).toBe(false);
    expect(job.daysRemaining).toBeGreaterThan(0);
  });

  it('should enforce validation error if wageType is Daily but dailyWage is missing or 0', async () => {
    const invalidJobData = {
      farmer: testUser._id,
      title: 'Invalid Wage Job Test',
      description: 'Testing validation error for daily wage',
      category: 'Irrigation',
      workType: 'Daily Basis',
      numberOfWorkers: 1,
      requiredSkills: ['Irrigation Pipe Laying'],
      wageType: 'Daily',
      dailyWage: 0, // Invalid
      startDate: new Date(),
      jobAddress: {
        district: 'Ludhiana',
        state: 'Punjab',
      },
    };

    await expect(Job.create(invalidJobData)).rejects.toThrow();
  });

  it('should support soft deletion using the softDelete method', async () => {
    const job = await Job.create({
      farmer: testUser._id,
      title: 'Soft Delete Test Job',
      description: 'Job created to verify soft deletion capability',
      category: 'General Farm Labor',
      workType: 'Daily Basis',
      numberOfWorkers: 2,
      requiredSkills: ['Weeding'],
      wageType: 'Daily',
      dailyWage: 500,
      startDate: new Date(),
      jobAddress: {
        district: 'Jalandhar',
        state: 'Punjab',
      },
    });

    await job.softDelete();

    expect(job.isDeleted).toBe(true);
    expect(job.deletedAt).toBeDefined();

    // Standard query should automatically exclude soft-deleted record
    const foundJob = await Job.findById(job._id);
    expect(foundJob).toBeNull();
  });
});
