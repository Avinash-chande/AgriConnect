import express from 'express';
import {
  getPlans,
  getPlanById,
  seedPlans,
} from '../controllers/planController.js';
import {
  validateGetPlans,
  validatePlanId,
} from '../validators/planValidator.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public routes for fetching membership plans
router.get('/', validateGetPlans, getPlans);
router.get('/:planId', validatePlanId, getPlanById);

// Admin route to seed default plans
router.post('/seed', protect, authorize('Admin'), seedPlans);

export default router;
