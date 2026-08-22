import { calculateProfileCompletion } from '../utils/profileCalculator.js';

describe('Backend Worker Profile 8-Section Completion Calculator', () => {
  it('should return 0% when no sections are completed', () => {
    const user = { role: 'worker', name: '' };
    const profile = {};
    expect(calculateProfileCompletion(user, profile)).toBe(0);
  });

  it('should return 13% for 1 completed section', () => {
    const user = { role: 'worker', name: 'Jaswinder' };
    const profile = { title: 'Harvester Operator', bio: 'Experienced driver' };
    expect(calculateProfileCompletion(user, profile)).toBe(13);
  });

  it('should return 25% for 2 completed sections', () => {
    const user = { role: 'worker', name: 'Jaswinder' };
    const profile = {
      title: 'Harvester Operator',
      bio: 'Experienced driver',
      skills: ['Combine Harvester Operator'],
    };
    expect(calculateProfileCompletion(user, profile)).toBe(25);
  });

  it('should return 50% for 4 completed sections', () => {
    const user = { role: 'worker', name: 'Jaswinder' };
    const profile = {
      title: 'Harvester Operator',
      bio: 'Experienced driver',
      skills: ['Combine Harvester Operator'],
      experience: 2,
      education: '10th Pass',
      expectedDailyWage: 600,
      availability: 'Immediate',
      preferredWorkType: 'Daily Basis',
    };
    expect(calculateProfileCompletion(user, profile)).toBe(50);
  });

  it('should return 88% for 7 completed sections', () => {
    const user = { role: 'worker', name: 'Jaswinder' };
    const profile = {
      title: 'Harvester Operator',
      bio: 'Experienced driver',
      skills: ['Combine Harvester Operator'],
      experience: 2,
      education: '10th Pass',
      expectedDailyWage: 600,
      availability: 'Immediate',
      preferredWorkType: 'Daily Basis',
      preferredDistrict: 'Ludhiana',
      preferredState: 'Punjab',
      certificateImages: ['https://example.com/cert.jpg'],
      profileGallery: ['https://example.com/photo.jpg'],
      aadhaarVerified: false,
    };
    expect(calculateProfileCompletion(user, profile)).toBe(88);
  });

  it('should return 100% when all 8 sections including Aadhaar are complete', () => {
    const user = { role: 'worker', name: 'Jaswinder' };
    const profile = {
      title: 'Harvester Operator',
      bio: 'Experienced driver',
      skills: ['Combine Harvester Operator'],
      experience: 2,
      education: '10th Pass',
      expectedDailyWage: 600,
      availability: 'Immediate',
      preferredWorkType: 'Daily Basis',
      preferredDistrict: 'Ludhiana',
      preferredState: 'Punjab',
      certificateImages: ['https://example.com/cert.jpg'],
      profileGallery: ['https://example.com/photo.jpg'],
      aadhaarVerified: true,
    };
    expect(calculateProfileCompletion(user, profile)).toBe(100);
  });
});
