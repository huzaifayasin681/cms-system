import { Router } from 'express';
import {
  uploadMedia,
  getMedia,
  getMediaById,
  updateMedia,
  deleteMedia,
  bulkDeleteMedia,
  getMediaStats
} from '../controllers/mediaController';
import { authenticate, authorize } from '../middleware/auth';
import { uploadSingle, handleMulterError } from '../middleware/upload';
import { uploadLimiter } from '../middleware/rateLimiter';

const router = Router();

// All media routes require authentication
router.use(authenticate);

// Upload media
router.post('/upload', uploadLimiter, uploadSingle, handleMulterError, uploadMedia);

// Get media files
router.get('/', getMedia);
router.get('/stats', getMediaStats);
router.get('/:id', getMediaById);

// Update media metadata
router.put('/:id', updateMedia);

// Delete media
router.delete('/:id', deleteMedia);
router.post('/bulk-delete', authorize(['superadmin', 'admin']), bulkDeleteMedia);

export default router;