import mongoose from 'mongoose';
import { Application } from '../models/Application.js';
import { User } from '../models/User.js';
import { Job } from '../models/Job.js';
import { APPLICATION_STATUS } from '../constants/index.js';

describe('Application Model Unit Tests', () => {
  let mockWorkerId;
  let mockFarmerId;
  let mockJobId;

  beforeAll(async () => {
    const mongoUri = process.env.MONGODB_TEST_URI || 'mongodb://127.0.0.1:27017/agriconnect_test_db';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }
    await Application.deleteMany({});
    await Application.init();
    mockWorkerId = new mongoose.Types.ObjectId();
    mockFarmerId = new mongoose.Types.ObjectId();
    mockJobId = new mongoose.Types.ObjectId();
  });

  afterAll(async () => {
    await Application.deleteMany({});
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });

  it('should create an application with valid fields and default status Pending', async () => {
    const appDoc = new Application({
      worker: mockWorkerId,
      farmer: mockFarmerId,
      job: mockJobId,
      coverLetter: 'Interested in harvesting job.',
      expectedDailyWage: 750,
    });

    const savedDoc = await appDoc.save();

    expect(savedDoc._id).toBeDefined();
    expect(savedDoc.status).toBe(APPLICATION_STATUS.PENDING);
    expect(savedDoc.shortlisted).toBe(false);
    expect(savedDoc.worker.toString()).toBe(mockWorkerId.toString());
    expect(savedDoc.farmer.toString()).toBe(mockFarmerId.toString());
    expect(savedDoc.job.toString()).toBe(mockJobId.toString());
    expect(savedDoc.createdAt).toBeDefined();
    expect(savedDoc.updatedAt).toBeDefined();
  });

  it('should prevent duplicate applications for the same worker and job', async () => {
    const worker2Id = new mongoose.Types.ObjectId();
    const job2Id = new mongoose.Types.ObjectId();

    await Application.create({
      worker: worker2Id,
      farmer: mockFarmerId,
      job: job2Id,
    });

    let duplicateError;
    try {
      await Application.create({
        worker: worker2Id,
        farmer: mockFarmerId,
        job: job2Id,
      });
    } catch (err) {
      duplicateError = err;
    }

    expect(duplicateError).toBeDefined();
    expect(duplicateError.code).toBe(11000); // Duplicate key error code in MongoDB
  });

  it('should validate status enums', async () => {
    const appDoc = new Application({
      worker: new mongoose.Types.ObjectId(),
      farmer: mockFarmerId,
      job: new mongoose.Types.ObjectId(),
      status: 'INVALID_STATUS',
    });

    let validationError;
    try {
      await appDoc.validate();
    } catch (err) {
      validationError = err;
    }

    expect(validationError).toBeDefined();
    expect(validationError.errors.status).toBeDefined();
  });

  it('should automatically set status timestamps on status transitions', async () => {
    const appDoc = await Application.create({
      worker: new mongoose.Types.ObjectId(),
      farmer: mockFarmerId,
      job: new mongoose.Types.ObjectId(),
    });

    expect(appDoc.hiredDate).toBeUndefined();

    appDoc.status = APPLICATION_STATUS.HIRED;
    await appDoc.save();

    expect(appDoc.hiredDate).toBeDefined();
    expect(appDoc.hiredDate).toBeInstanceOf(Date);
  });

  it('should support soft delete and restoration', async () => {
    const appDoc = await Application.create({
      worker: new mongoose.Types.ObjectId(),
      farmer: mockFarmerId,
      job: new mongoose.Types.ObjectId(),
    });

    await appDoc.softDelete();
    expect(appDoc.isDeleted).toBe(true);
    expect(appDoc.deletedAt).toBeInstanceOf(Date);

    // Standard query should not return soft deleted record
    const foundDoc = await Application.findById(appDoc._id);
    expect(foundDoc).toBeNull();

    // Restoring
    await appDoc.restore();
    expect(appDoc.isDeleted).toBe(false);
    const restoredDoc = await Application.findById(appDoc._id);
    expect(restoredDoc).toBeDefined();
  });
});
