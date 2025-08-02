import { Router } from 'express';
import {
  getSettings,
  updateSettings,
  resetSettings,
  uploadLogo,
  testEmailConfig
} from '../controllers/settingsController';
import { authenticate, authorize } from '../middleware/auth';
import { generalLimiter } from '../middleware/rateLimiter';
import { uploadSingle } from '../middleware/upload';
import { validateSettings } from '../middleware/validation';

const router = Router();

// All settings routes require authentication and admin access
router.use(authenticate);
router.use(authorize(['superadmin', 'admin'])); // Only superadmins and admins can manage settings

// Get current settings
router.get('/', generalLimiter, getSettings);

// Update settings
router.put('/', generalLimiter, validateSettings, updateSettings);

// Reset settings to defaults
router.post('/reset', generalLimiter, resetSettings);

// Upload site logo
router.post('/logo', generalLimiter, uploadSingle, uploadLogo);

// Test email configuration
router.post('/test-email', generalLimiter, testEmailConfig);

export default router;