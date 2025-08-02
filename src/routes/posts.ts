import { Router } from 'express';
import {
  createPost,
  getPosts,
  getPost,
  updatePost,
  deletePost,
  toggleLike,
  savePostDraft
} from '../controllers/postController';
import { authenticate, authorize, optionalAuth } from '../middleware/auth';
import { validatePost } from '../middleware/validation';
import { generalLimiter } from '../middleware/rateLimiter';
import { 
  trackPostView, 
  trackSearch, 
  trackLike, 
  saveAnalyticsEvent 
} from '../middleware/analytics';

const router = Router();

// Public routes
router.get('/', generalLimiter, trackSearch, getPosts, saveAnalyticsEvent);
router.get('/:id', generalLimiter, optionalAuth, trackPostView, getPost, saveAnalyticsEvent);

// Protected routes
router.post('/', authenticate, authorize(['superadmin', 'admin', 'editor']), validatePost, createPost);
router.put('/:id', authenticate, authorize(['superadmin', 'admin', 'editor']), validatePost, updatePost);
router.delete('/:id', authenticate, authorize(['superadmin', 'admin', 'editor']), deletePost);

// Like/unlike post
router.post('/:id/like', authenticate, trackLike, toggleLike, saveAnalyticsEvent);

// Auto-save draft
router.post('/:id/save-draft', authenticate, authorize(['superadmin', 'admin', 'editor']), savePostDraft);

export default router;