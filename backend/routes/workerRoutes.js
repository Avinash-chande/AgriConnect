import express from 'express';
import {
  getFeaturedWorkersController,
  searchWorkersController,
  matchWorkersController,
} from '../controllers/workerController.js';
import { publicCacheControl } from './profileRoutes.js';

const router = express.Router();

/**
 * @route   GET /api/v1/workers/agrimatch
 * @desc    AgriMatch AI Engine: match verified workers from MongoDB
 * @access  Public
 */
router.get('/agrimatch', publicCacheControl, matchWorkersController);
router.get('/match', publicCacheControl, matchWorkersController);

/**
 * @route   GET /api/v1/workers/featured
 * @desc    Get featured verified worker profiles
 * @access  Public
 */
router.get('/featured', publicCacheControl, getFeaturedWorkersController);

/**
 * @route   GET /api/v1/workers/search
 * @desc    Public search workers by keyword, location, category with pagination
 * @access  Public (No Authorization header, JWT, or login required)
 */
router.get('/search', publicCacheControl, searchWorkersController);

/**
 * @route   GET /api/v1/workers
 * @desc    Public list workers with query filters
 * @access  Public
 */
router.get('/', publicCacheControl, searchWorkersController);

export default router;

