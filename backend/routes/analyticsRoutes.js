import express from 'express';
import { getHomeStatisticsController } from '../controllers/analyticsController.js';
import { publicCacheControl } from './profileRoutes.js';

const router = express.Router();

/**
 * @route   GET /api/v1/analytics/home-stats
 * @desc    Public real database aggregate statistics for /home page cards
 * @access  Public (No JWT, Authorization, or cookie required)
 */
router.get('/home-stats', publicCacheControl, getHomeStatisticsController);

export default router;
