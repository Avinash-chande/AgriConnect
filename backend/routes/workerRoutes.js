import express from 'express';
import { getFeaturedWorkersController } from '../controllers/workerController.js';
import { publicCacheControl } from './profileRoutes.js';

const router = express.Router();

/**
 * @route   GET /api/v1/workers/featured
 * @desc    Get featured verified worker profiles
 * @access  Public
 */
router.get('/featured', publicCacheControl, getFeaturedWorkersController);

export default router;
