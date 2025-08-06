import express from 'express';
import { authenticate, authorize } from '../middleware/auth';
import {
  getCategories,
  getCategoryHierarchy,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
  bulkDeleteCategories,
  getCategoryStats,
  moveCategory
} from '../controllers/categoryController';

const router = express.Router();

// Public routes
router.get('/hierarchy', getCategoryHierarchy);

// Protected routes
router.use(authenticate);

// Get all categories
router.get('/', getCategories);

// Get single category
router.get('/:id', getCategory);

// Get category statistics
router.get('/:id/stats', getCategoryStats);

// Editor and above can create/update
router.post('/', authorize(['editor', 'admin', 'superadmin']), createCategory);
router.put('/:id', authorize(['editor', 'admin', 'superadmin']), updateCategory);
router.patch('/:id/move', authorize(['editor', 'admin', 'superadmin']), moveCategory);

// Admin and above can delete
router.delete('/:id', authorize(['admin', 'superadmin']), deleteCategory);
router.post('/bulk-delete', authorize(['admin', 'superadmin']), bulkDeleteCategories);

export default router;