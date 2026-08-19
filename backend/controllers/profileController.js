import { asyncHandler } from '../utils/asyncHandler.js';
import { sendResponse } from '../utils/apiResponse.js';
import { AppError } from '../utils/appError.js';
import {
  getMyProfileService,
  createProfileService,
  updateProfileService,
  deleteProfileService,
  getProfileByIdOrSlugService,
  searchProfilesService,
  filterProfilesService,
  uploadProfileImageService,
  uploadFarmImagesService,
  uploadCertificatesService,
  deleteImageService,
  updateFarmLocationService,
  deleteFarmLocationService,
  updateLocationPrivacyService,
  deleteSavedLocationService,
} from '../services/profileService.js';
import { connectedUsersStore } from '../socket/connectedUsers.js';
import { User } from '../models/User.js';

/**
 * @desc    Get Current User's Profile
 * @route   GET /api/v1/profiles/me
 * @access  Private
 */
export const getMyProfile = asyncHandler(async (req, res) => {
  const result = await getMyProfileService(req.user._id);
  return sendResponse(res, 200, 'User profile retrieved successfully', result);
});

/**
 * @desc    Create Profile (Farmer or Worker)
 * @route   POST /api/v1/profiles/me
 * @access  Private
 */
export const createProfile = asyncHandler(async (req, res) => {
  const profile = await createProfileService(req.user, req.body);
  return sendResponse(res, 201, 'Profile created successfully', { profile });
});

/**
 * @desc    Update Profile
 * @route   PUT /api/v1/profiles/me
 * @access  Private
 */
export const updateProfile = asyncHandler(async (req, res) => {
  const result = await updateProfileService(req.user, req.body);
  return sendResponse(res, 200, 'Profile updated successfully', result);
});

/**
 * @desc    Soft Delete Profile & Account
 * @route   DELETE /api/v1/profiles/me
 * @access  Private
 */
export const deleteProfile = asyncHandler(async (req, res) => {
  await deleteProfileService(req.user);
  return sendResponse(res, 200, 'Profile and user account soft deleted successfully');
});

/**
 * @desc    Get User Profile by ID or Slug
 * @route   GET /api/v1/profiles/user/:identifier
 * @access  Public
 */
export const getUserProfile = asyncHandler(async (req, res) => {
  const profile = await getProfileByIdOrSlugService(req.params.identifier);
  return sendResponse(res, 200, 'User profile retrieved successfully', { profile });
});

/**
 * @desc    Search Profiles Across Names, Skills, Bio, Farm Names & Locations
 * @route   GET /api/v1/profiles/search
 * @access  Public
 */
export const searchProfiles = asyncHandler(async (req, res, next) => {
  const { q, page, limit } = req.query;

  if (!q) {
    return next(new AppError('Please provide a search query parameter `q`.', 400));
  }

  const results = await searchProfilesService(q, Number(page) || 1, Number(limit) || 10);
  return sendResponse(res, 200, 'Search query executed successfully', results);
});

/**
 * @desc    Filter Profiles with Pagination & Sorting
 * @route   GET /api/v1/profiles/filter
 * @access  Public
 */
export const filterProfiles = asyncHandler(async (req, res) => {
  const { page, limit, sort, ...filters } = req.query;
  const results = await filterProfilesService(
    filters,
    Number(page) || 1,
    Number(limit) || 10,
    sort || '-createdAt'
  );
  return sendResponse(res, 200, 'Profiles filtered successfully', results);
});

/**
 * @desc    Upload Single Profile Avatar Image
 * @route   POST /api/v1/profiles/upload-avatar
 * @access  Private
 */
export const uploadProfileImage = asyncHandler(async (req, res, next) => {
  if (!req.file) {
    return next(new AppError('Please upload an image file.', 400));
  }

  const profileImageUrl = await uploadProfileImageService(req.user, req.file.buffer);
  return sendResponse(res, 200, 'Profile avatar image uploaded successfully', { profileImage: profileImageUrl });
});

/**
 * @desc    Upload Farm Gallery Images (Farmers Only)
 * @route   POST /api/v1/profiles/upload-farm-images
 * @access  Private (Farmer)
 */
export const uploadFarmImages = asyncHandler(async (req, res, next) => {
  if (!req.files || req.files.length === 0) {
    return next(new AppError('Please upload at least one farm image file.', 400));
  }

  const farmImages = await uploadFarmImagesService(req.user, req.files);
  return sendResponse(res, 200, 'Farm images uploaded successfully', { farmImages });
});

/**
 * @desc    Upload Certificate or Work Gallery Images (Workers Only)
 * @route   POST /api/v1/profiles/upload-certificates
 * @access  Private (Worker)
 */
export const uploadCertificates = asyncHandler(async (req, res, next) => {
  if (!req.files || req.files.length === 0) {
    return next(new AppError('Please upload at least one certificate or work photo file.', 400));
  }

  const targetField = req.query.target === 'profileGallery' ? 'profileGallery' : 'certificateImages';
  const images = await uploadCertificatesService(req.user, req.files, targetField);
  return sendResponse(res, 200, 'Certificates / gallery uploaded successfully', { [targetField]: images });
});

/**
 * @desc    Delete Specific Image URL from Profile Gallery
 * @route   DELETE /api/v1/profiles/images
 * @access  Private
 */
export const deleteImage = asyncHandler(async (req, res, next) => {
  const { imageUrl, imageType } = req.body;

  if (!imageUrl || !imageType) {
    return next(new AppError('Please provide imageUrl and imageType (farmImages, certificateImages, or profileGallery).', 400));
  }

  await deleteImageService(req.user, imageUrl, imageType);
  return sendResponse(res, 200, 'Image removed from profile gallery successfully');
});

/**
 * @desc    Get User Real-Time Presence & Last Seen Timestamp
 * @route   GET /api/v1/profiles/presence/:userId
 * @access  Public / Private
 */
export const getUserPresence = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const isOnlineInMemory = connectedUsersStore.isUserOnline(userId);

  const user = await User.findById(userId).select('name isOnline lastSeen role');
  if (!user) {
    throw new AppError('User account not found', 404);
  }

  return sendResponse(res, 200, 'User presence status retrieved successfully', {
    userId: user._id,
    name: user.name,
    role: user.role,
    isOnline,
    lastSeen: user.lastSeen,
  });
});

/**
 * @desc    Update Farm Location (Farmer Only)
 * @route   PUT /api/v1/profiles/farm-location
 * @access  Private (Farmer Only)
 */
export const updateFarmLocation = asyncHandler(async (req, res) => {
  const profile = await updateFarmLocationService(req.user, req.body);
  return sendResponse(res, 200, 'Farm location successfully updated and synced with GeoJSON.', profile);
});

/**
 * @desc    Delete/Reset Farm Location (Farmer Only)
 * @route   DELETE /api/v1/profiles/farm-location
 * @access  Private (Farmer Only)
 */
export const deleteFarmLocation = asyncHandler(async (req, res) => {
  const profile = await deleteFarmLocationService(req.user);
  return sendResponse(res, 200, 'Farm location removed from profile successfully.', profile);
});

/**
 * @desc    Update Location Privacy Preference ('private' | 'approximate' | 'verified_users' | 'public')
 * @route   PUT /api/v1/profiles/location-privacy
 * @access  Private
 */
export const updateLocationPrivacy = asyncHandler(async (req, res) => {
  const { locationVisibility } = req.body;
  const result = await updateLocationPrivacyService(req.user, locationVisibility);
  return sendResponse(res, 200, 'Location privacy preference updated successfully.', result);
});

/**
 * @desc    Delete Saved Location from Profile
 * @route   DELETE /api/v1/profiles/saved-location
 * @access  Private
 */
export const deleteSavedLocation = asyncHandler(async (req, res) => {
  const result = await deleteSavedLocationService(req.user);
  return sendResponse(res, 200, 'Saved location deleted from profile.', result);
});


