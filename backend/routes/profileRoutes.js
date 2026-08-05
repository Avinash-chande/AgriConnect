import express from 'express';
import {
  getMyProfile,
  createProfile,
  updateProfile,
  deleteProfile,
  getUserProfile,
  searchProfiles,
  filterProfiles,
  uploadProfileImage,
  uploadFarmImages,
  uploadCertificates,
  deleteImage,
  getUserPresence,
} from '../controllers/profileController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { uploadSingleImage, uploadMultipleImages } from '../middleware/uploadMiddleware.js';
import { validateProfileQuery } from '../validators/profileValidator.js';
import { USER_ROLES } from '../constants/index.js';
import { profileRateLimiter, uploadRateLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Cache Control middleware for public GET routes
export const publicCacheControl = (req, res, next) => {
  res.set('Cache-Control', 'public, max-age=180, s-maxage=300, stale-while-revalidate=600');
  next();
};

/**
 * Public Presence & Profile Routes
 */
router.get('/presence/:userId', getUserPresence);
router.get('/search', publicCacheControl, validateProfileQuery, searchProfiles);
router.get('/filter', publicCacheControl, validateProfileQuery, filterProfiles);
router.get('/user/:identifier', publicCacheControl, getUserProfile);

/**
 * Protected User Profile Routes
 */
router.get('/me', protect, getMyProfile);
router.post('/me', protect, createProfile);
router.put('/me', protect, profileRateLimiter, updateProfile);
router.delete('/me', protect, deleteProfile);

/**
 * Image Upload & Management Routes
 */
router.post('/upload/photo', protect, uploadRateLimiter, uploadSingleImage, uploadProfileImage);
router.post('/upload-photo', protect, uploadRateLimiter, uploadSingleImage, uploadProfileImage);

router.post(
  '/upload/farm',
  protect,
  authorize(USER_ROLES.FARMER),
  uploadRateLimiter,
  uploadMultipleImages,
  uploadFarmImages
);
router.post(
  '/upload-farm-images',
  protect,
  authorize(USER_ROLES.FARMER),
  uploadRateLimiter,
  uploadMultipleImages,
  uploadFarmImages
);

router.post(
  '/upload/certificates',
  protect,
  authorize(USER_ROLES.WORKER),
  uploadRateLimiter,
  uploadMultipleImages,
  uploadCertificates
);
router.post(
  '/upload-certificates',
  protect,
  authorize(USER_ROLES.WORKER),
  uploadRateLimiter,
  uploadMultipleImages,
  uploadCertificates
);

router.delete('/upload/image', protect, deleteImage);

export default router;
