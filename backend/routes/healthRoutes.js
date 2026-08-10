import express from 'express';
import { checkHealth, checkLiveness, checkReadiness } from '../controllers/healthController.js';

const router = express.Router();

router.get('/health', checkHealth);
router.get('/liveness', checkLiveness);
router.get('/readiness', checkReadiness);

export default router;
