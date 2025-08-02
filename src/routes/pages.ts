import { Router } from 'express';
import {
  createPage,
  getPages,
  getPage,
  updatePage,
  deletePage,
  getMenuPages,
  getHomePage
} from '../controllers/pageController';
import { authenticate, authorize, optionalAuth } from '../middleware/auth';
import { validatePage } from '../middleware/validation';
import { generalLimiter } from '../middleware/rateLimiter';
import { trackPageView, saveAnalyticsEvent } from '../middleware/analytics';

const router = Router();

// Public routes
router.get('/', generalLimiter, getPages);
router.get('/menu', generalLimiter, getMenuPages);
router.get('/homepage', generalLimiter, getHomePage);
router.get('/:id', generalLimiter, optionalAuth, trackPageView, getPage, saveAnalyticsEvent);

// Protected routes
router.post('/', authenticate, authorize(['superadmin', 'admin', 'editor']), validatePage, createPage);
router.put('/:id', authenticate, authorize(['superadmin', 'admin', 'editor']), validatePage, updatePage);
router.delete('/:id', authenticate, authorize(['superadmin', 'admin', 'editor']), deletePage);

export default router;