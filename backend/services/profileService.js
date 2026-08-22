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
import { createGeoPoint } from '../models/schemas/commonSchemas.js';
import { cacheService } from './cacheService.js';

/**
 * Get profile of current logged-in user
 */
export const getMyProfileService = async (userInput) => {
  if (!userInput) return null;

  let user = userInput;
  if (typeof user === 'string' || user instanceof mongoose.Types.ObjectId || (!user.role && (user._id || user.id))) {
    const userId = user._id || user.id || user;
    user = await User.findOne({ _id: userId, isDeleted: { $ne: true } });
  }

  if (!user) return null;

  const roleLower = user?.role?.toLowerCase() || '';
  const userId = user._id || user.id;

  let profile = null;

  if (roleLower === 'farmer') {
    profile = await FarmerProfile.findOne({ owner: userId, isDeleted: { $ne: true } });
  } else if (roleLower === 'worker') {
    profile = await WorkerProfile.findOne({ owner: userId, isDeleted: { $ne: true } });
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

  // If name is provided in data, update User document
  if (data.name && data.name.trim() !== '') {
    user.name = data.name.trim();
    await user.save({ validateBeforeSave: false });
  }

  const { name, ...profileData } = data;
  let profile = null;

  if (roleLower === 'farmer') {
    if (profileData.farmAddress) {
      const lat = profileData.farmAddress.latitude;
      const lng = profileData.farmAddress.longitude;
      if (typeof lat === 'number' && typeof lng === 'number' && !isNaN(lat) && !isNaN(lng)) {
        const geoPoint = createGeoPoint(lng, lat);
        if (geoPoint) {
          profileData.location = geoPoint;
        }
      } else if (lat === null || lat === 0) {
        profileData.location = null;
      }
    }

    profile = await FarmerProfile.findOneAndUpdate(
      { owner: userId, isDeleted: { $ne: true } },
      { $set: profileData },
      { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true }
    );
  } else if (roleLower === 'worker') {
    profile = await WorkerProfile.findOneAndUpdate(
      { owner: userId, isDeleted: { $ne: true } },
      { $set: profileData },
      { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true }
    );
  }

  if (!profile) {
    throw new AppError('Profile not found for update.', 404);
  }

  cacheService.clearPrefix('profile:');

  const completionPercentage = calculateProfileCompletion(user, profile);
  if (completionPercentage === 100 && !user.profileCompleted) {
    user.profileCompleted = true;
    await user.save({ validateBeforeSave: false });
  }

  return { user, profile, completionPercentage, profileCompleted: user.profileCompleted };
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
export const uploadProfileImageService = async (user, fileOrBuffer) => {
  const buffer = Buffer.isBuffer(fileOrBuffer) ? fileOrBuffer : fileOrBuffer?.buffer;
  if (!buffer || !Buffer.isBuffer(buffer)) {
    throw new AppError('Invalid image data provided.', 400);
  }
  const uploadResult = await uploadProfilePhotoService(buffer);
  user.profileImage = uploadResult.secure_url;
  await user.save({ validateBeforeSave: false });
  cacheService.clearPrefix('profile:');
  return user.profileImage;
};

/**
 * Upload farm gallery images (Farmer only)
 */
export const uploadFarmImagesProfileService = async (user, files) => {
  if (!Array.isArray(files) || files.length === 0) {
    throw new AppError('Please upload at least one farm image.', 400);
  }

  const invalidFile = files.find(
    (file) => !file?.buffer || !Buffer.isBuffer(file.buffer)
  );

  if (invalidFile) {
    throw new AppError('Invalid uploaded image data.', 400);
  }
  const fileBuffers = files.map((file) => file.buffer);

  const uploadResults = await cloudinaryFarmUpload(fileBuffers);
  const imageUrls = uploadResults.map((r) => r.secure_url);

  const profile = await FarmerProfile.findOneAndUpdate(
    { owner: user._id },
    { $push: { farmImages: { $each: imageUrls } } },
    { new: true }
  );

  if (!profile) {
    throw new AppError('Farmer profile not found.', 404);
  }

  cacheService.clearPrefix('profile:');

  return profile.farmImages;
};

export const uploadFarmImagesService = uploadFarmImagesProfileService;

/**
 * Upload certificate OR work gallery image (Worker only)
 */
export const uploadCertificatesProfileService = async (
  user,
  files,
  targetField = 'certificateImages'
) => {
  // Only allow these two fields
  if (!['certificateImages', 'profileGallery'].includes(targetField)) {
    throw new AppError('Invalid image target field.', 400);
  }

  if (!Array.isArray(files) || files.length === 0) {
    throw new AppError('Please upload at least one certificate or work photo file.', 400);
  }

  const invalidFile = files.find(
    (file) => !file?.buffer || !Buffer.isBuffer(file.buffer)
  );

  if (invalidFile) {
    throw new AppError('Invalid uploaded image data.', 400);
  }

  const fileBuffers = files.map((file) => file.buffer);

  // Upload image(s) to Cloudinary
  const uploadResults = await cloudinaryCertUpload(fileBuffers);
  const imageUrls = uploadResults.map((r) => r.secure_url);

  if (!imageUrls || imageUrls.length === 0) {
    throw new AppError('Image upload failed.', 500);
  }

  const profile = await WorkerProfile.findOneAndUpdate(
    { owner: user._id },
    {
      $push: {
        [targetField]: { $each: imageUrls },
      },
    },
    {
      new: true,
      runValidators: true,
    }
  );

  if (!profile) {
    throw new AppError('Worker profile not found.', 404);
  }

  cacheService.clearPrefix('profile:');

  return profile[targetField];
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

/**
 * Update Farm Location (Farmer Only)
 */
export const updateFarmLocationService = async (user, locationData) => {
  if (user.role?.toLowerCase() !== 'farmer') {
    throw new AppError('Unauthorized: Worker accounts cannot modify farmer farm locations.', 403);
  }

  const { addressLine, village, district, state, pincode, country = 'India', latitude, longitude } = locationData;

  const farmerProfile = await FarmerProfile.findOne({ owner: user._id });
  if (!farmerProfile) {
    throw new AppError('Farmer profile not found. Please create a profile first.', 404);
  }

  farmerProfile.farmAddress = {
    addressLine: addressLine || farmerProfile.farmAddress?.addressLine || '',
    village: village || farmerProfile.farmAddress?.village || '',
    district: district || farmerProfile.farmAddress?.district || 'Amritsar',
    state: state || farmerProfile.farmAddress?.state || 'Punjab',
    pincode: pincode || farmerProfile.farmAddress?.pincode || '',
    country,
    latitude: Number(latitude),
    longitude: Number(longitude),
  };

  await farmerProfile.save();
  cacheService.clearPrefix('profile:');

  return farmerProfile;
};

/**
 * Reset/Delete Farm Location (Farmer Only)
 */
export const deleteFarmLocationService = async (user) => {
  if (user.role?.toLowerCase() !== 'farmer') {
    throw new AppError('Unauthorized: Worker accounts cannot modify farmer farm locations.', 403);
  }

  const farmerProfile = await FarmerProfile.findOne({ owner: user._id });
  if (!farmerProfile) {
    throw new AppError('Farmer profile not found.', 404);
  }

  farmerProfile.farmAddress = {
    addressLine: '',
    village: '',
    district: farmerProfile.farmAddress?.district || 'Amritsar',
    state: farmerProfile.farmAddress?.state || 'Punjab',
    pincode: '',
    country: 'India',
    latitude: undefined,
    longitude: undefined,
  };
  farmerProfile.location = null;

  await farmerProfile.save();
  cacheService.clearPrefix('profile:');

  return farmerProfile;
};

/**
 * Update Location Privacy Settings ('private' | 'approximate' | 'verified_users' | 'public')
 */
export const updateLocationPrivacyService = async (user, locationVisibility) => {
  const allowed = ['private', 'approximate', 'verified_users', 'public'];
  if (!allowed.includes(locationVisibility)) {
    throw new AppError('Invalid locationVisibility setting. Must be private, approximate, verified_users, or public.', 400);
  }

  let profile;
  if (user.role?.toLowerCase() === 'farmer') {
    profile = await FarmerProfile.findOne({ owner: user._id });
  } else {
    profile = await WorkerProfile.findOne({ owner: user._id });
  }

  if (!profile) {
    throw new AppError('Profile not found.', 404);
  }

  profile.locationVisibility = locationVisibility;
  await profile.save();
  cacheService.clearPrefix('profile:');

  return { locationVisibility: profile.locationVisibility };
};

/**
 * Delete Saved Location from Profile
 */
export const deleteSavedLocationService = async (user) => {
  let profile;
  if (user.role?.toLowerCase() === 'farmer') {
    profile = await FarmerProfile.findOne({ owner: user._id });
    if (profile) {
      profile.farmAddress = null;
      profile.location = null;
      await profile.save();
    }
  } else {
    profile = await WorkerProfile.findOne({ owner: user._id });
    if (profile) {
      profile.address = null;
      profile.location = null;
      await profile.save();
    }
  }

  cacheService.clearPrefix('profile:');
  return { success: true, message: 'Saved location cleared from profile.' };
};
