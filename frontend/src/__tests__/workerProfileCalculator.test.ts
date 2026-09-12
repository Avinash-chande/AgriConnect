import { describe, it, expect } from 'vitest';
import { calculateWorkerProfileCompletion } from '../utils/workerProfileCalculator';

describe('Worker Profile 8-Section Dynamic Completion System', () => {
  it('should return 0/8 and 0% when no sections are completed', () => {
    const result = calculateWorkerProfileCompletion({});
    expect(result.completedSections).toBe(0);
    expect(result.totalSections).toBe(8);
    expect(result.percentage).toBe(0);
    expect(result.sections.every((s) => !s.isComplete)).toBe(true);
  });

  it('should return 1/8 and 13% when only Section 1 (Title & Bio) is completed', () => {
    const result = calculateWorkerProfileCompletion({
      fullName: 'Jaswinder Singh',
      title: 'Harvester Driver',
      bio: 'Experienced farm machine operator for 5 seasons.',
    });
    expect(result.completedSections).toBe(1);
    expect(result.totalSections).toBe(8);
    expect(result.percentage).toBe(13); // Math.round(1/8 * 100) = 13
    expect(result.sections[0].isComplete).toBe(true);
    expect(result.sections[1].isComplete).toBe(false);
  });

  it('should return 2/8 and 25% when Section 1 and Section 2 (Skills) are completed', () => {
    const result = calculateWorkerProfileCompletion({
      fullName: 'Jaswinder Singh',
      title: 'Harvester Driver',
      bio: 'Experienced farm machine operator for 5 seasons.',
      skills: ['Combine Harvester Operator'],
    });
    expect(result.completedSections).toBe(2);
    expect(result.totalSections).toBe(8);
    expect(result.percentage).toBe(25);
    expect(result.sections[0].isComplete).toBe(true);
    expect(result.sections[1].isComplete).toBe(true);
    expect(result.sections[2].isComplete).toBe(false);
  });

  it('should return 3/8 and 38% when Sections 1, 2, and 3 (Experience & Education) are completed', () => {
    const result = calculateWorkerProfileCompletion({
      fullName: 'Jaswinder Singh',
      title: 'Harvester Driver',
      bio: 'Experienced farm machine operator for 5 seasons.',
      skills: ['Combine Harvester Operator'],
      experience: 4,
      education: '10th Pass',
    });
    expect(result.completedSections).toBe(3);
    expect(result.totalSections).toBe(8);
    expect(result.percentage).toBe(38); // Math.round(3/8 * 100) = 38
    expect(result.sections[2].isComplete).toBe(true);
  });

  it('should accept experience=0 as valid for Section 3', () => {
    const result = calculateWorkerProfileCompletion({
      experience: 0,
      education: '10th Pass',
    });
    expect(result.sections[2].isComplete).toBe(true);
  });

  it('should return 4/8 and 50% when Sections 1 to 4 are completed', () => {
    const result = calculateWorkerProfileCompletion({
      fullName: 'Jaswinder Singh',
      title: 'Harvester Driver',
      bio: 'Experienced farm machine operator.',
      skills: ['Combine Harvester Operator'],
      experience: 2,
      education: '12th Pass',
      expectedDailyWage: 600,
      availability: 'Immediate',
      preferredWorkType: 'Daily Basis',
    });
    expect(result.completedSections).toBe(4);
    expect(result.totalSections).toBe(8);
    expect(result.percentage).toBe(50);
  });

  it('should return 5/8 and 63% when Sections 1 to 5 (Locations) are completed', () => {
    const result = calculateWorkerProfileCompletion({
      fullName: 'Jaswinder Singh',
      title: 'Harvester Driver',
      bio: 'Experienced farm machine operator.',
      skills: ['Combine Harvester Operator'],
      experience: 2,
      education: '12th Pass',
      expectedDailyWage: 600,
      availability: 'Immediate',
      preferredWorkType: 'Daily Basis',
      preferredDistrict: 'Ludhiana',
      preferredState: 'Punjab',
    });
    expect(result.completedSections).toBe(5);
    expect(result.totalSections).toBe(8);
    expect(result.percentage).toBe(63); // Math.round(5/8 * 100) = 63
  });

  it('should return 6/8 and 75% when Sections 1 to 6 (Certificates) are completed', () => {
    const result = calculateWorkerProfileCompletion({
      fullName: 'Jaswinder Singh',
      title: 'Harvester Driver',
      bio: 'Experienced farm machine operator.',
      skills: ['Combine Harvester Operator'],
      experience: 2,
      education: '12th Pass',
      expectedDailyWage: 600,
      availability: 'Immediate',
      preferredWorkType: 'Daily Basis',
      preferredDistrict: 'Ludhiana',
      preferredState: 'Punjab',
      certificateImages: ['https://res.cloudinary.com/demo/image/upload/sample_cert.jpg'],
    });
    expect(result.completedSections).toBe(6);
    expect(result.totalSections).toBe(8);
    expect(result.percentage).toBe(75);
  });

  it('should return 7/8 and 88% when Sections 1 to 7 (Gallery) are completed', () => {
    const result = calculateWorkerProfileCompletion({
      fullName: 'Jaswinder Singh',
      title: 'Harvester Driver',
      bio: 'Experienced farm machine operator.',
      skills: ['Combine Harvester Operator'],
      experience: 2,
      education: '12th Pass',
      expectedDailyWage: 600,
      availability: 'Immediate',
      preferredWorkType: 'Daily Basis',
      preferredDistrict: 'Ludhiana',
      preferredState: 'Punjab',
      certificateImages: ['https://res.cloudinary.com/demo/image/upload/sample_cert.jpg'],
      profileGallery: ['https://res.cloudinary.com/demo/image/upload/field_photo.jpg'],
    });
    expect(result.completedSections).toBe(7);
    expect(result.totalSections).toBe(8);
    expect(result.percentage).toBe(88); // Math.round(7/8 * 100) = 88
    expect(result.sections[7].isComplete).toBe(false); // Section 8 incomplete
  });

  it('should NOT complete Section 8 merely because an Aadhaar number was typed if aadhaarVerified is false', () => {
    const result = calculateWorkerProfileCompletion({
      aadhaarNumber: '123456789012',
      aadhaarVerified: false,
    });
    expect(result.sections[7].isComplete).toBe(false);
  });

  it('should return 8/8 and 100% when all 8 sections including Aadhaar Verification are complete', () => {
    const result = calculateWorkerProfileCompletion({
      fullName: 'Jaswinder Singh',
      title: 'Harvester Driver',
      bio: 'Experienced farm machine operator.',
      skills: ['Combine Harvester Operator'],
      experience: 2,
      education: '12th Pass',
      expectedDailyWage: 600,
      availability: 'Immediate',
      preferredWorkType: 'Daily Basis',
      preferredDistrict: 'Ludhiana',
      preferredState: 'Punjab',
      certificateImages: ['https://res.cloudinary.com/demo/image/upload/sample_cert.jpg'],
      profileGallery: ['https://res.cloudinary.com/demo/image/upload/field_photo.jpg'],
      aadhaarVerified: true,
      aadhaarNumber: '123456789012',
    });
    expect(result.completedSections).toBe(8);
    expect(result.totalSections).toBe(8);
    expect(result.percentage).toBe(100);
    expect(result.sections.every((s) => s.isComplete)).toBe(true);
  });

  it('should immediately decrease completion from 8/8 to 7/8 (88%) if a skill is removed', () => {
    const fullProfile = {
      fullName: 'Jaswinder Singh',
      title: 'Harvester Driver',
      bio: 'Experienced farm machine operator.',
      skills: ['Combine Harvester Operator'],
      experience: 2,
      education: '12th Pass',
      expectedDailyWage: 600,
      availability: 'Immediate',
      preferredWorkType: 'Daily Basis',
      preferredDistrict: 'Ludhiana',
      preferredState: 'Punjab',
      certificateImages: ['https://res.cloudinary.com/demo/image/upload/sample_cert.jpg'],
      profileGallery: ['https://res.cloudinary.com/demo/image/upload/field_photo.jpg'],
      aadhaarVerified: true,
    };

    const initial = calculateWorkerProfileCompletion(fullProfile);
    expect(initial.completedSections).toBe(8);
    expect(initial.percentage).toBe(100);

    // Remove skills
    const updated = calculateWorkerProfileCompletion({ ...fullProfile, skills: [] });
    expect(updated.completedSections).toBe(7);
    expect(updated.percentage).toBe(88);
    expect(updated.sections[1].isComplete).toBe(false);

    // Restore skills
    const restored = calculateWorkerProfileCompletion({ ...fullProfile, skills: ['Drone Spraying'] });
    expect(restored.completedSections).toBe(8);
    expect(restored.percentage).toBe(100);
  });
});
