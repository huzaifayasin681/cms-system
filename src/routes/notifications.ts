import express from 'express';
import { body, param, query } from 'express-validator';
import { authenticate, authorize } from '../middleware/auth';
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  createNotification,
  createBulkNotifications,
  getNotificationStats,
  getSystemNotificationStats,
  cleanupExpiredNotifications
} from '../controllers/notificationController';

const router = express.Router();

// Validation schemas
const createNotificationValidation = [
  body('recipient')
    .isMongoId()
    .withMessage('Valid recipient ID is required'),
  body('type')
    .isIn(['info', 'success', 'warning', 'error', 'system'])
    .withMessage('Valid type is required'),
  body('category')
    .isIn(['user_action', 'system_update', 'content_change', 'security', 'approval', 'media', 'comment', 'general'])
    .withMessage('Valid category is required'),
  body('title')
    .isLength({ min: 1, max: 100 })
    .withMessage('Title must be between 1 and 100 characters'),
  body('message')
    .isLength({ min: 1, max: 500 })
    .withMessage('Message must be between 1 and 500 characters'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('Valid priority is required'),
  body('sendEmail')
    .optional()
    .isBoolean()
    .withMessage('sendEmail must be a boolean'),
  body('expiresIn')
    .optional()
    .isInt({ min: 1, max: 8760 })
    .withMessage('expiresIn must be between 1 and 8760 hours'),
  body('actionUrl')
    .optional()
    .isURL()
    .withMessage('actionUrl must be a valid URL'),
  body('actionText')
    .optional()
    .isLength({ max: 50 })
    .withMessage('actionText must be max 50 characters')
];

const createBulkNotificationValidation = [
  body('notifications')
    .isArray({ min: 1, max: 100 })
    .withMessage('notifications must be an array with 1-100 items'),
  body('notifications.*.recipient')
    .isMongoId()
    .withMessage('Valid recipient ID is required for each notification'),
  body('notifications.*.type')
    .isIn(['info', 'success', 'warning', 'error', 'system'])
    .withMessage('Valid type is required for each notification'),
  body('notifications.*.category')
    .isIn(['user_action', 'system_update', 'content_change', 'security', 'approval', 'media', 'comment', 'general'])
    .withMessage('Valid category is required for each notification'),
  body('notifications.*.title')
    .isLength({ min: 1, max: 100 })
    .withMessage('Title must be between 1 and 100 characters for each notification'),
  body('notifications.*.message')
    .isLength({ min: 1, max: 500 })
    .withMessage('Message must be between 1 and 500 characters for each notification')
];

const paginationValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('type')
    .optional()
    .isIn(['info', 'success', 'warning', 'error', 'system'])
    .withMessage('Invalid type filter'),
  query('category')
    .optional()
    .isIn(['user_action', 'system_update', 'content_change', 'security', 'approval', 'media', 'comment', 'general'])
    .withMessage('Invalid category filter'),
  query('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('Invalid priority filter'),
  query('unreadOnly')
    .optional()
    .isBoolean()
    .withMessage('unreadOnly must be a boolean')
];

const mongoIdValidation = [
  param('id')
    .isMongoId()
    .withMessage('Valid notification ID is required')
];

// Public routes (authenticated users)
router.get('/', 
  authenticate, 
  paginationValidation, 
  getNotifications
);

router.get('/unread-count', 
  authenticate, 
  getUnreadCount
);

router.get('/stats', 
  authenticate, 
  getNotificationStats
);

router.patch('/:id/read', 
  authenticate, 
  mongoIdValidation, 
  markAsRead
);

router.patch('/mark-all-read', 
  authenticate, 
  markAllAsRead
);

router.delete('/:id', 
  authenticate, 
  mongoIdValidation, 
  deleteNotification
);

// Admin routes
router.post('/', 
  authenticate, 
  authorize(['admin', 'superadmin']),
  createNotificationValidation, 
  createNotification
);

router.post('/bulk', 
  authenticate, 
  authorize(['admin', 'superadmin']),
  createBulkNotificationValidation, 
  createBulkNotifications
);

router.get('/system/stats', 
  authenticate, 
  authorize(['admin', 'superadmin']),
  getSystemNotificationStats
);

// Superadmin routes
router.delete('/system/cleanup', 
  authenticate, 
  authorize(['superadmin']),
  cleanupExpiredNotifications
);

export default router;