import request from 'supertest';
import app from '../app.js';
import { WorkerProfile } from '../models/WorkerProfile.js';
import { cacheService } from '../services/cacheService.js';
import { jest } from '@jest/globals';

describe('Featured Workers Public API Suite', () => {
  beforeEach(() => {
    cacheService.flush();
    jest.clearAllMocks();
  });

  const mockWorkerData = [
    {
      _id: '65f1a2b3c4d5e6f7a8b9c0d1',
      owner: {
        _id: '65f1a2b3c4d5e6f7a8b9c0a1',
        name: 'Ramesh Patel',
        email: 'ramesh@example.com',
        role: 'worker',
        profileImage: 'https://images.example.com/ramesh.jpg',
        isVerified: true,
        identityVerified: true,
        isDeleted: false,
      },
      title: 'Senior Harvester Specialist',
      bio: 'Expert in grain harvesting and combine operations.',
      skills: ['Harvesting', 'Combine Operator'],
      experience: 7,
      languages: ['Hindi', 'English'],
      education: '12th Pass',
      expectedDailyWage: 750,
      expectedMonthlySalary: 20000,
      availability: 'Immediate',
      preferredDistrict: 'Pune',
      preferredState: 'Maharashtra',
      preferredVillage: 'Baramati',
      aadhaarVerified: true,
      rating: 4.9,
      totalJobsCompleted: 25,
      slug: 'worker-harvesting-c0d1',
      isDeleted: false,
    },
    {
      _id: '65f1a2b3c4d5e6f7a8b9c0d2',
      owner: {
        _id: '65f1a2b3c4d5e6f7a8b9c0a2',
        name: 'Sunil Verma',
        email: 'sunil@example.com',
        role: 'worker',
        profileImage: '',
        isVerified: false,
        identityVerified: false,
        isDeleted: false,
      },
      title: 'Tractor Driver',
      bio: 'Reliable tractor driver for plowing and tilling.',
      skills: ['Tractor Driving', 'Plowing'],
      experience: 3,
      languages: ['Hindi'],
      education: '10th Pass',
      expectedDailyWage: 500,
      expectedMonthlySalary: 14000,
      availability: 'Within 3 Days',
      preferredDistrict: 'Nashik',
      preferredState: 'Maharashtra',
      preferredVillage: '',
      aadhaarVerified: false,
      rating: 4.5,
      totalJobsCompleted: 8,
      slug: 'worker-tractor-c0d2',
      isDeleted: false,
    },
  ];

  it('GET /api/v1/workers/featured should return sanitized featured real workers', async () => {
    jest.spyOn(WorkerProfile, 'find').mockReturnValue({
      populate: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockWorkerData),
        }),
      }),
    });

    const res = await request(app).get('/api/v1/workers/featured?limit=6');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(2);

    const worker1 = res.body.data[0];
    expect(worker1.id).toBe('65f1a2b3c4d5e6f7a8b9c0d1');
    expect(worker1.ownerId).toBe('65f1a2b3c4d5e6f7a8b9c0a1');
    expect(worker1.name).toBe('Ramesh Patel');
    expect(worker1.title).toBe('Senior Harvester Specialist');
    expect(worker1.skills).toEqual(['Harvesting', 'Combine Operator']);
    expect(worker1.experience).toBe(7);
    expect(worker1.dailyWage).toBe(750);
    expect(worker1.location).toBe('Pune, Maharashtra');
    expect(worker1.avatar).toBe('https://images.example.com/ramesh.jpg');
    expect(worker1.isVerified).toBe(true);
    expect(worker1.aadhaarVerified).toBe(true);

    // Verify sensitive data is NOT leaked
    expect(worker1.password).toBeUndefined();
    expect(worker1.passwordHash).toBeUndefined();
    expect(worker1.aadhaarNumber).toBeUndefined();
    expect(worker1.refreshToken).toBeUndefined();
  });

  it('GET /api/workers/featured should serve as an alias to the same handler', async () => {
    jest.spyOn(WorkerProfile, 'find').mockReturnValue({
      populate: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockWorkerData),
        }),
      }),
    });

    const res = await request(app).get('/api/workers/featured');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(2);
  });

  it('GET /api/v1/profiles/featured-workers should also return featured workers', async () => {
    jest.spyOn(WorkerProfile, 'find').mockReturnValue({
      populate: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockWorkerData),
        }),
      }),
    });

    const res = await request(app).get('/api/v1/profiles/featured-workers');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(2);
  });

  it('Should handle empty results gracefully with an empty array', async () => {
    jest.spyOn(WorkerProfile, 'find').mockReturnValue({
      populate: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([]),
        }),
      }),
    });

    const res = await request(app).get('/api/v1/workers/featured');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual([]);
  });
});
