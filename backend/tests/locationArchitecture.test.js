import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { FarmerProfile } from '../models/FarmerProfile.js';
import { WorkerProfile } from '../models/WorkerProfile.js';
import { Job } from '../models/Job.js';
import { createGeoPoint } from '../models/schemas/commonSchemas.js';

describe('AgriConnect Extended Geospatial Architecture Suite', () => {
  let testUser;

  beforeAll(async () => {
    const mongoUri = process.env.MONGODB_TEST_URI || 'mongodb://127.0.0.1:27017/agriconnect_test_db';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }

    await User.deleteMany({ email: /@geotest\.com$/ });
    await FarmerProfile.deleteMany({});
    await WorkerProfile.deleteMany({});
    await Job.deleteMany({});

    testUser = await User.create({
      name: 'Gurpreet Singh',
      email: `gurpreet.${Date.now()}@geotest.com`,
      mobile: `+919814${Math.floor(100000 + Math.random() * 900000)}`,
      password: 'Password123!',
      role: 'Farmer',
      address: {
        addressLine: 'Farm Road 12',
        village: 'Khatkar Kalan',
        district: 'Shaheed Bhagat Singh Nagar',
        state: 'Punjab',
        country: 'India',
        pincode: '144505',
        latitude: 31.125,
        longitude: 75.952,
      },
    });
  });

  afterAll(async () => {
    await User.deleteMany({ email: /@geotest\.com$/ });
    await FarmerProfile.deleteMany({});
    await WorkerProfile.deleteMany({});
    await Job.deleteMany({});
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });

  it('1. User model should automatically synchronize GeoJSON Point [longitude, latitude]', async () => {
    expect(testUser.location).toBeDefined();
    expect(testUser.location.type).toBe('Point');
    expect(testUser.location.coordinates).toEqual([75.952, 31.125]);
    expect(testUser.address.country).toBe('India');
  });

  it('2. FarmerProfile model should support location address & GeoJSON Point [longitude, latitude]', async () => {
    const farmer = await FarmerProfile.create({
      owner: testUser._id,
      farmName: 'Shaheed Organic Farm',
      farmSize: 25,
      farmSizeUnit: 'Acres',
      farmAddress: {
        addressLine: 'Farm Lane 4',
        village: 'Khatkar Kalan',
        district: 'SBS Nagar',
        state: 'Punjab',
        country: 'India',
        pincode: '144505',
        latitude: 31.126,
        longitude: 75.953,
      },
    });

    expect(farmer.location).toBeDefined();
    expect(farmer.location.type).toBe('Point');
    expect(farmer.location.coordinates).toEqual([75.953, 31.126]);
    expect(farmer.fullAddress).toContain('Khatkar Kalan');
  });

  it('3. WorkerProfile model should support location address & GeoJSON Point [longitude, latitude]', async () => {
    const workerUser = await User.create({
      name: 'Harman Preet Worker',
      email: `harman.${Date.now()}@geotest.com`,
      mobile: `+919814${Math.floor(100000 + Math.random() * 900000)}`,
      password: 'Password123!',
      role: 'Worker',
    });

    const worker = await WorkerProfile.create({
      owner: workerUser._id,
      title: 'Combine Pilot Specialist',
      skills: ['Combine Operator'],
      expectedDailyWage: 900,
      preferredDistrict: 'Ludhiana',
      preferredState: 'Punjab',
      address: {
        addressLine: 'Worker Hub Colony',
        village: 'Samrala',
        district: 'Ludhiana',
        state: 'Punjab',
        country: 'India',
        pincode: '141114',
        latitude: 30.835,
        longitude: 76.191,
      },
    });

    expect(worker.location).toBeDefined();
    expect(worker.location.type).toBe('Point');
    expect(worker.location.coordinates).toEqual([76.191, 30.835]);
    expect(worker.address.country).toBe('India');
  });

  it('4. Job model should support job address & GeoJSON Point [longitude, latitude]', async () => {
    const job = await Job.create({
      farmer: testUser._id,
      title: 'Paddy Harvesting Crew Required',
      description: 'Need harvest crew with tractors and combines.',
      category: 'Harvesting',
      workType: 'Daily Basis',
      numberOfWorkers: 5,
      requiredSkills: ['Harvesting'],
      wageType: 'Daily',
      dailyWage: 850,
      startDate: new Date(),
      jobAddress: {
        addressLine: 'Field 99, GT Road',
        village: 'Rayya',
        district: 'Amritsar',
        state: 'Punjab',
        country: 'India',
        pincode: '143112',
        latitude: 31.634,
        longitude: 74.872,
      },
    });

    expect(job.location).toBeDefined();
    expect(job.location.type).toBe('Point');
    expect(job.location.coordinates).toEqual([74.872, 31.634]);
    expect(job.jobAddress.country).toBe('India');
  });

  it('5. Should support nullable location without throwing errors for missing coordinates', async () => {
    const nullableUser = await User.create({
      name: 'No Location User',
      email: `nolocation.${Date.now()}@geotest.com`,
      mobile: `+919814${Math.floor(100000 + Math.random() * 900000)}`,
      password: 'Password123!',
      role: 'Farmer',
    });

    expect(nullableUser.location).toBeNull();
  });

  it('6. Should enforce coordinate boundaries (-90 to 90 for lat, -180 to 180 for lng)', async () => {
    const invalidLatUser = new User({
      name: 'Invalid Lat User',
      email: `invalidlat.${Date.now()}@geotest.com`,
      mobile: `+919814${Math.floor(100000 + Math.random() * 900000)}`,
      password: 'Password123!',
      role: 'Farmer',
      address: {
        district: 'Amritsar',
        state: 'Punjab',
        latitude: 120.0, // Invalid latitude (> 90)
        longitude: 74.872,
      },
    });

    await expect(invalidLatUser.save()).rejects.toThrow();
  });

  it('7. Helper createGeoPoint should return null for out-of-range coordinates', () => {
    expect(createGeoPoint(200, 30)).toBeNull(); // lng out of range
    expect(createGeoPoint(75, 100)).toBeNull(); // lat out of range
    expect(createGeoPoint(75.8, 31.6)).toEqual({
      type: 'Point',
      coordinates: [75.8, 31.6],
    });
  });
});
