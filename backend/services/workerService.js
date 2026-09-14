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

/**
 * Helper to escape regex special characters for safe MongoDB queries
 */
const escapeRegex = (str) => {
  if (typeof str !== 'string') return '';
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * Helper to safely serialize a WorkerProfile for public read-only discovery
 */
const formatPublicWorker = (w) => {
  const owner = w.owner || {};
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
    ownerId: owner._id ? owner._id.toString() : (w.owner ? w.owner.toString() : ''),
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
};

/**
 * Service: Search Workers by Keyword, Location, and Category from MongoDB WorkerProfile collection
 * Public, read-only search with pagination
 */
export const searchWorkersService = async ({
  search = '',
  location = '',
  category = '',
  page = 1,
  limit = 12,
  sort = 'rating',
} = {}) => {
  const parsedPage = Math.max(1, parseInt(page, 10) || 1);
  const parsedLimit = Math.min(50, Math.max(1, parseInt(limit, 10) || 12));
  const skip = (parsedPage - 1) * parsedLimit;

  // Build safe MongoDB filter conditions
  const conditions = [{ isDeleted: { $ne: true } }];

  // 1. Keyword Filter (skill, crop type, search term)
  const trimmedSearch = typeof search === 'string' ? search.trim() : '';
  if (trimmedSearch) {
    const escapedKeyword = escapeRegex(trimmedSearch);
    const keywordRegex = new RegExp(escapedKeyword, 'i');
    conditions.push({
      $or: [
        { skills: { $regex: keywordRegex } },
        { title: { $regex: keywordRegex } },
        { bio: { $regex: keywordRegex } },
        { languages: { $regex: keywordRegex } },
      ],
    });
  }

  // 2. Location Filter
  const trimmedLocation = typeof location === 'string' ? location.trim() : '';
  if (
    trimmedLocation &&
    trimmedLocation.toLowerCase() !== 'all locations' &&
    trimmedLocation.toLowerCase() !== 'all'
  ) {
    // Check full location and comma-separated tokens (e.g., "Nagpur, Maharashtra")
    const parts = trimmedLocation
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean);

    const locationConditions = parts.map((part) => {
      const locRegex = new RegExp(escapeRegex(part), 'i');
      return {
        $or: [
          { preferredDistrict: { $regex: locRegex } },
          { preferredState: { $regex: locRegex } },
          { preferredVillage: { $regex: locRegex } },
          { 'address.district': { $regex: locRegex } },
          { 'address.state': { $regex: locRegex } },
          { 'address.village': { $regex: locRegex } },
        ],
      };
    });

    if (locationConditions.length === 1) {
      conditions.push(locationConditions[0]);
    } else if (locationConditions.length > 1) {
      // Either token matches
      conditions.push({ $or: locationConditions });
    }
  }

  // 3. Category Filter
  const trimmedCategory = typeof category === 'string' ? category.trim() : '';
  if (
    trimmedCategory &&
    trimmedCategory.toLowerCase() !== 'all categories' &&
    trimmedCategory.toLowerCase() !== 'all'
  ) {
    // Map high-level categories to relevant domain keywords if applicable, or match direct category name
    const catLower = trimmedCategory.toLowerCase();
    const categoryKeywords = [];

    if (catLower.includes('harvest')) {
      categoryKeywords.push('harvest', 'crop', 'combine', 'grain', 'paddy', 'wheat', 'sugarcane', 'cotton');
    } else if (catLower.includes('machinery') || catLower.includes('tractor')) {
      categoryKeywords.push('tractor', 'machinery', 'combine', 'harvester', 'plough', 'operator', 'driver');
    } else if (catLower.includes('drone') || catLower.includes('tech')) {
      categoryKeywords.push('drone', 'tech', 'sensor', 'gps', 'spraying');
    } else if (catLower.includes('irrigat') || catLower.includes('water')) {
      categoryKeywords.push('irrigat', 'water', 'pump', 'drip', 'soil');
    } else if (catLower.includes('dairy') || catLower.includes('livestock')) {
      categoryKeywords.push('dairy', 'milk', 'livestock', 'cattle', 'animal');
    } else if (catLower.includes('greenhouse') || catLower.includes('polyhouse')) {
      categoryKeywords.push('greenhouse', 'polyhouse', 'hydroponic', 'horticulture', 'organic');
    } else {
      // Fallback: tokenize words from category name
      const tokens = trimmedCategory.split(/\s+/).filter((t) => t.length > 2);
      categoryKeywords.push(trimmedCategory, ...tokens);
    }

    const uniqueKeywords = Array.from(new Set(categoryKeywords));
    const catOrConditions = uniqueKeywords.map((kw) => {
      const reg = new RegExp(escapeRegex(kw), 'i');
      return {
        $or: [{ title: { $regex: reg } }, { skills: { $regex: reg } }, { bio: { $regex: reg } }],
      };
    });

    conditions.push({ $or: catOrConditions });
  }

  const query = conditions.length === 1 ? conditions[0] : { $and: conditions };

  // Define sorting
  const sortCriteria = {
    aadhaarVerified: -1,
    rating: -1,
    totalJobsCompleted: -1,
    createdAt: -1,
  };

  const [rawWorkers, totalCount] = await Promise.all([
    WorkerProfile.find(query)
      .populate({
        path: 'owner',
        select: 'name role profileImage isVerified identityVerified isDeleted',
        match: { isDeleted: { $ne: true }, role: { $regex: /^worker$/i } },
      })
      .sort(sortCriteria)
      .skip(skip)
      .limit(parsedLimit)
      .lean(),
    WorkerProfile.countDocuments(query),
  ]);

  // Filter out any documents where owner is missing or soft deleted
  const validWorkers = rawWorkers.filter((w) => w.owner && !w.owner.isDeleted);
  const formattedWorkers = validWorkers.map(formatPublicWorker);

  return {
    workers: formattedWorkers,
    pagination: {
      page: parsedPage,
      limit: parsedLimit,
      total: totalCount,
      totalPages: Math.ceil(totalCount / parsedLimit) || 1,
    },
  };
};
