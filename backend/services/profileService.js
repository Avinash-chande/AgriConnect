import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { FarmerProfile } from '../models/FarmerProfile.js';
import { WorkerProfile } from '../models/WorkerProfile.js';
import { AppError } from '../utils/appError.js';
import { calculateProfileCompletion } from '../utils/profileCalculator.js';
import {
  uploadProfilePhotoService,
  uploadFarmImagesService as cloudinaryFarmUpload,
  uploadCertificateImagesService as cloudinaryCertUpload,
  deleteCloudinaryImage,
} from './cloudinaryService.js';
import { cacheService } from './cacheService.js';

/**
 * Get profile of current logged-in user
 */
export const getMyProfileService = async (user) => {
  const roleLower = user?.role?.toLowerCase() || '';
  const userId = user._id || user.id;

  let profile = user.farmerProfile || user.workerProfile || null;

  if (!profile) {
    if (roleLower === 'farmer') {
      profile = await FarmerProfile.findOne({ owner: userId });
    } else if (roleLower === 'worker') {
      profile = await WorkerProfile.findOne({ owner: userId });
    }
  }

  const completionPercentage = calculateProfileCompletion(user, profile);

  return {
    user,
    profile,
    completionPercentage,
  };
};

/**
 * Create profile for current logged-in user if missing
 */
export const createProfileService = async (user, profileData) => {
  const roleLower = user?.role?.toLowerCase() || '';
  const userId = user._id || user.id;

  if (roleLower === 'farmer') {
    const existing = await FarmerProfile.findOne({ owner: userId });
    if (existing) {
      throw new AppError('Farmer profile already exists. Please update your existing profile.', 400);
    }
    const farmerProfile = await FarmerProfile.create({
      owner: userId,
      ...profileData,
    });
    cacheService.clearPrefix('profile:');
    const completionPercentage = calculateProfileCompletion(user, farmerProfile);
    return { profile: farmerProfile, completionPercentage };
  }

  if (roleLower === 'worker') {
    const existing = await WorkerProfile.findOne({ owner: userId });
    if (existing) {
      throw new AppError('Worker profile already exists. Please update your existing profile.', 400);
    }
    const workerProfile = await WorkerProfile.create({
      owner: userId,
      ...profileData,
    });
    cacheService.clearPrefix('profile:');
    const completionPercentage = calculateProfileCompletion(user, workerProfile);
    return { profile: workerProfile, completionPercentage };
  }

  throw new AppError('Invalid user role for profile creation.', 400);
};

/**
 * Update profile of current logged-in user
 */
export const updateProfileService = async (user, data) => {
  const roleLower = user?.role?.toLowerCase() || '';
  const userId = user._id || user.id;

  let profile = null;

  if (roleLower === 'farmer') {
    profile = await FarmerProfile.findOneAndUpdate(
      { owner: userId },
      { $set: data },
      { new: true, runValidators: true }
    );
  } else if (roleLower === 'worker') {
    profile = await WorkerProfile.findOneAndUpdate(
      { owner: userId },
      { $set: data },
      { new: true, runValidators: true }
    );
  }

  if (!profile) {
    throw new AppError('Profile not found for update.', 404);
  }

  cacheService.clearPrefix('profile:');

  const completionPercentage = calculateProfileCompletion(user, profile);
  if (completionPercentage >= 80 && !user.profileCompleted) {
    user.profileCompleted = true;
    await user.save({ validateBeforeSave: false });
  }

  return { profile, completionPercentage, profileCompleted: user.profileCompleted };
};

/**
 * Soft delete profile of current logged-in user
 */
export const deleteProfileService = async (user) => {
  const roleLower = user?.role?.toLowerCase() || '';
  const userId = user._id || user.id;

  if (roleLower === 'farmer') {
    const farmerProf = await FarmerProfile.findOne({ owner: userId });
    if (farmerProf) await farmerProf.softDelete();
  } else if (roleLower === 'worker') {
    const workerProf = await WorkerProfile.findOne({ owner: userId });
    if (workerProf) await workerProf.softDelete();
  }

  user.isDeleted = true;
  await user.save({ validateBeforeSave: false });

  cacheService.clearPrefix('profile:');
  return true;
};

/**
 * Public profile lookup by User ObjectId or Slug with TTL Caching
 */
export const getPublicProfileService = async (identifier) => {
  const cacheKey = `profile:${identifier}`;
  const cached = cacheService.get(cacheKey);
  if (cached) return cached;

  let farmerProf = null;
  let workerProf = null;

  if (mongoose.Types.ObjectId.isValid(identifier)) {
    farmerProf = await FarmerProfile.findOne({ owner: identifier }).populate(
      'owner',
      'name email mobile role profileImage isVerified profileCompleted'
    );
    if (!farmerProf) {
      workerProf = await WorkerProfile.findOne({ owner: identifier }).populate(
        'owner',
        'name email mobile role profileImage isVerified profileCompleted'
      );
    }
  }

  if (!farmerProf && !workerProf) {
    farmerProf = await FarmerProfile.findOne({ slug: identifier }).populate(
      'owner',
      'name email mobile role profileImage isVerified profileCompleted'
    );
    if (!farmerProf) {
      workerProf = await WorkerProfile.findOne({ slug: identifier }).populate(
        'owner',
        'name email mobile role profileImage isVerified profileCompleted'
      );
    }
  }

  const profile = farmerProf || workerProf;
  if (!profile) {
    throw new AppError('User profile not found.', 404);
  }

  const completionPercentage = calculateProfileCompletion(profile.owner, profile);
  const result = { profile, completionPercentage };

  cacheService.set(cacheKey, result, 300);
  return result;
};

export const getProfileByIdOrSlugService = getPublicProfileService;

/**
 * Search profiles by query with TTL Caching & text indexes
 */
export const searchProfilesService = async (queryParams) => {
  const { q = '', page = 1, limit = 10 } = queryParams;
  const cacheKey = `profile:search:${q}:${page}:${limit}`;
  const cached = cacheService.get(cacheKey);
  if (cached) return cached;

  const skip = (Number(page) - 1) * Number(limit);
  const searchRegex = new RegExp(q, 'i');

  const farmerFilter = {
    isDeleted: { $ne: true },
    $or: [
      { farmName: searchRegex },
      { farmDescription: searchRegex },
      { cropTypes: searchRegex },
      { 'farmAddress.district': searchRegex },
      { 'farmAddress.state': searchRegex },
    ],
  };

  const workerFilter = {
    isDeleted: { $ne: true },
    $or: [
      { title: searchRegex },
      { bio: searchRegex },
      { skills: searchRegex },
      { preferredDistrict: searchRegex },
      { preferredState: searchRegex },
    ],
  };

  const [farmers, farmerCount, workers, workerCount] = await Promise.all([
    FarmerProfile.find(farmerFilter).skip(skip).limit(Number(limit)).populate('owner', 'name profileImage mobile role'),
    FarmerProfile.countDocuments(farmerFilter),
    WorkerProfile.find(workerFilter).skip(skip).limit(Number(limit)).populate('owner', 'name profileImage mobile role'),
    WorkerProfile.countDocuments(workerFilter),
  ]);

  const result = {
    farmers,
    workers,
    pagination: {
      totalFarmers: farmerCount,
      totalWorkers: workerCount,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(Math.max(farmerCount, workerCount) / Number(limit)),
    },
  };

  cacheService.set(cacheKey, result, 180);
  return result;
};

export const filterProfilesService = searchProfilesService;

/**
 * Upload profile image
 */
export const uploadProfileImageService = async (user, fileBuffer) => {
  const uploadResult = await uploadProfilePhotoService(fileBuffer);
  user.profileImage = uploadResult.secure_url;
  await user.save({ validateBeforeSave: false });
  cacheService.clearPrefix('profile:');
  return user.profileImage;
};

/**
 * Upload farm gallery images (Farmer only)
 */
export const uploadFarmImagesProfileService = async (user, fileBuffers) => {
  const uploadResults = await cloudinaryFarmUpload(fileBuffers);
  const imageUrls = uploadResults.map((r) => r.secure_url);

  const profile = await FarmerProfile.findOneAndUpdate(
    { owner: user._id },
    { $push: { farmImages: { $each: imageUrls } } },
    { new: true }
  );
  cacheService.clearPrefix('profile:');
  return profile.farmImages;
};

export const uploadFarmImagesService = uploadFarmImagesProfileService;

/**
 * Upload certificates (Worker only)
 */
export const uploadCertificatesProfileService = async (user, fileBuffers) => {
  const uploadResults = await cloudinaryCertUpload(fileBuffers);
  const imageUrls = uploadResults.map((r) => r.secure_url);

  const profile = await WorkerProfile.findOneAndUpdate(
    { owner: user._id },
    { $push: { certificateImages: { $each: imageUrls } } },
    { new: true }
  );
  cacheService.clearPrefix('profile:');
  return profile.certificateImages;
};

export const uploadCertificatesService = uploadCertificatesProfileService;

/**
 * Delete image from profile & Cloudinary
 */
export const deleteProfileImageService = async (user, imageUrl, targetField = 'profileImage') => {
  await deleteCloudinaryImage(imageUrl);

  if (targetField === 'profileImage') {
    user.profileImage = '';
    await user.save({ validateBeforeSave: false });
  } else if (targetField === 'farmImages') {
    await FarmerProfile.findOneAndUpdate(
      { owner: user._id },
      { $pull: { farmImages: imageUrl } }
    );
  } else if (targetField === 'certificateImages') {
    await WorkerProfile.findOneAndUpdate(
      { owner: user._id },
      { $pull: { certificateImages: imageUrl } }
    );
  }

  cacheService.clearPrefix('profile:');
  return true;
};

export const deleteImageService = deleteProfileImageService;
