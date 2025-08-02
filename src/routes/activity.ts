import { Router } from 'express';
import {
  getRecentActivities,
  getActivityStats
} from '../controllers/activityController';
import { authenticate, authorize } from '../middleware/auth';
import { generalLimiter } from '../middleware/rateLimiter';

const router = Router();

// All activity routes require authentication
router.use(authenticate);

// Get recent activities for dashboard
router.get(
  '/',
  generalLimiter,
  authorize(['superadmin', 'admin', 'editor']), // Only superadmins, admins and editors can see activity
  getRecentActivities
);

// Get activity statistics
router.get(
  '/stats',
  generalLimiter,
  authorize(['superadmin', 'admin', 'editor']),
  getActivityStats
);

export default router;