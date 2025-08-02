import { Router } from 'express';
import {
  getDashboardOverview,
  getContentPerformance,
  getTrafficAnalytics,
  getUserAnalytics,
  getMediaAnalytics,
  getSearchAnalytics,
  exportAnalytics
} from '../controllers/analyticsController';
import { authenticate, authorize } from '../middleware/auth';
import { generalLimiter } from '../middleware/rateLimiter';

const router = Router();

// All analytics routes require authentication and appropriate permissions
// Only admin and editor roles can access analytics

// Dashboard overview - provides key metrics for dashboard cards
router.get(
  '/overview',
  generalLimiter,
  authenticate,
  authorize(['superadmin', 'admin', 'editor']),
  getDashboardOverview
);

// Content performance analytics - top posts, categories, tags performance
router.get(
  '/content',
  generalLimiter,
  authenticate,
  authorize(['superadmin', 'admin', 'editor']),
  getContentPerformance
);

// Traffic analytics - views over time, popular content, traffic sources
router.get(
  '/traffic',
  generalLimiter,
  authenticate,
  authorize(['superadmin', 'admin', 'editor']),
  getTrafficAnalytics
);

// User analytics - registrations, roles, active users
router.get(
  '/users',
  generalLimiter,
  authenticate,
  authorize(['superadmin', 'admin']), // Only superadmins and admins can see user analytics
  getUserAnalytics
);

// Media analytics - uploads, storage, file types
router.get(
  '/media',
  generalLimiter,
  authenticate,
  authorize(['superadmin', 'admin', 'editor']),
  getMediaAnalytics
);

// Search analytics - search terms, results performance
router.get(
  '/search',
  generalLimiter,
  authenticate,
  authorize(['superadmin', 'admin', 'editor']),
  getSearchAnalytics
);

// Export comprehensive analytics report
router.get(
  '/export',
  generalLimiter,
  authenticate,
  authorize(['superadmin', 'admin']), // Only superadmins and admins can export full reports
  exportAnalytics
);

export default router;