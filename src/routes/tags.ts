import express from 'express';
import { authenticate, authorize } from '../middleware/auth';
import {
  getTags,
  getPopularTags,
  getTag,
  getTagBySlug,
  createTag,
  updateTag,
  deleteTag,
  bulkCreateTags,
  bulkDeleteTags,
  mergeTags,
  getTagStats,
  suggestTags,
  updateTagUsageCounts
} from '../controllers/tagController';

const router = express.Router();

// Public routes
router.get('/popular', getPopularTags);
router.get('/slug/:slug', getTagBySlug);

// Protected routes
router.use(authenticate);

// Get all tags
router.get('/', getTags);

// Get single tag
router.get('/:id', getTag);

// Get tag statistics
router.get('/:id/stats', getTagStats);

// Auto-suggest tags
router.post('/suggest', authorize(['editor', 'admin', 'superadmin']), suggestTags);

// Editor and above can create/update
router.post('/', authorize(['editor', 'admin', 'superadmin']), createTag);
router.put('/:id', authorize(['editor', 'admin', 'superadmin']), updateTag);
router.post('/bulk-create', authorize(['editor', 'admin', 'superadmin']), bulkCreateTags);

// Admin and above can delete and merge
router.delete('/:id', authorize(['admin', 'superadmin']), deleteTag);
router.post('/bulk-delete', authorize(['admin', 'superadmin']), bulkDeleteTags);
router.post('/merge', authorize(['admin', 'superadmin']), mergeTags);

// Superadmin only maintenance
router.post('/update-counts', authorize(['superadmin']), updateTagUsageCounts);

export default router;