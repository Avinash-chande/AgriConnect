import { WorkerProfile } from '../models/WorkerProfile.js';
import { User } from '../models/User.js';
import { cacheService } from './cacheService.js';

/**
 * Service: Get Featured Verified Workers from MongoDB WorkerProfile collection
 */
export const getFeaturedWorkersService = async (limit = 6) => {
  const parsedLimit = Math.min(50, Math.max(1, parseInt(limit, 10) || 6));
  const cacheKey = `workers:featured:${parsedLimit}`;
  const cached = cacheService.get(cacheKey);
  if (cached) return cached;

  // Query eligible worker profiles:
  // - Not soft deleted
  // - Populated owner user is not deleted and has role 'worker'
  const workerProfiles = await WorkerProfile.find({
    isDeleted: { $ne: true },
  })
    .populate({
      path: 'owner',
      select: 'name email role profileImage isVerified identityVerified isDeleted',
      match: { isDeleted: { $ne: true }, role: { $regex: /^worker$/i } },
    })
    .sort({
      aadhaarVerified: -1,
      rating: -1,
      totalJobsCompleted: -1,
      createdAt: -1,
    })
    .lean();

  const formattedWorkers = workerProfiles
    .filter((w) => w.owner && !w.owner.isDeleted)
    .slice(0, parsedLimit)
    .map((w) => {
      const owner = w.owner;
      const isVerified = Boolean(w.aadhaarVerified || owner.isVerified || owner.identityVerified);
      const districtState = [w.preferredDistrict, w.preferredState].filter(Boolean).join(', ');
      const locationStr =
        districtState ||
        (w.address && [w.address.district, w.address.state].filter(Boolean).join(', ')) ||
        'India';
      const avatarUrl = owner.profileImage || (w.profileGallery && w.profileGallery[0]) || '';
      const dailyWageNum = w.expectedDailyWage || 0;

      return {
        id: w._id.toString(),
        _id: w._id.toString(),
        ownerId: owner._id.toString(),
        name: owner.name || 'Agricultural Worker',
        title: w.title || 'Agricultural Specialist',
        bio: w.bio || '',
        skills: w.skills || [],
        experience: typeof w.experience === 'number' ? w.experience : 0,
        experienceYears: typeof w.experience === 'number' ? w.experience : 0,
        dailyWage: dailyWageNum,
        expectedDailyWage: dailyWageNum,
        monthlySalary: w.expectedMonthlySalary || 0,
        expectedMonthlySalary: w.expectedMonthlySalary || 0,
        hourlyRate: dailyWageNum ? `₹${Math.round(dailyWageNum / 8)}/hr` : '₹80/hr',
        dailyRate: dailyWageNum ? `₹${dailyWageNum}/day` : '₹600/day',
        availability: w.availability || 'Immediate',
        preferredWorkType: w.preferredWorkType || 'Full-Time',
        preferredDistrict: w.preferredDistrict || '',
        preferredState: w.preferredState || '',
        preferredVillage: w.preferredVillage || '',
        location: locationStr,
        avatar: avatarUrl,
        profileImage: avatarUrl,
        profileGallery: w.profileGallery || [],
        certificateImages: w.certificateImages || [],
        languages: w.languages || ['Hindi', 'English'],
        education: w.education || '10th Pass',
        rating: typeof w.rating === 'number' ? Number(w.rating.toFixed(2)) : 5.0,
        totalJobsCompleted: w.totalJobsCompleted || 0,
        completedJobs: w.totalJobsCompleted || 0,
        reviewsCount: w.totalJobsCompleted || 0,
        slug: w.slug || '',
        aadhaarVerified: isVerified,
        isVerified: isVerified,
      };
    });

  cacheService.set(cacheKey, formattedWorkers, 120); // 2 mins TTL cache
  return formattedWorkers;
};
