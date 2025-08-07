"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_validator_1 = require("express-validator");
const auth_1 = require("../middleware/auth");
const notificationController_1 = require("../controllers/notificationController");
const router = express_1.default.Router();
const createNotificationValidation = [
    (0, express_validator_1.body)('recipient')
        .isMongoId()
        .withMessage('Valid recipient ID is required'),
    (0, express_validator_1.body)('type')
        .isIn(['info', 'success', 'warning', 'error', 'system'])
        .withMessage('Valid type is required'),
    (0, express_validator_1.body)('category')
        .isIn(['user_action', 'system_update', 'content_change', 'security', 'approval', 'media', 'comment', 'general'])
        .withMessage('Valid category is required'),
    (0, express_validator_1.body)('title')
        .isLength({ min: 1, max: 100 })
        .withMessage('Title must be between 1 and 100 characters'),
    (0, express_validator_1.body)('message')
        .isLength({ min: 1, max: 500 })
        .withMessage('Message must be between 1 and 500 characters'),
    (0, express_validator_1.body)('priority')
        .optional()
        .isIn(['low', 'medium', 'high', 'urgent'])
        .withMessage('Valid priority is required'),
    (0, express_validator_1.body)('sendEmail')
        .optional()
        .isBoolean()
        .withMessage('sendEmail must be a boolean'),
    (0, express_validator_1.body)('expiresIn')
        .optional()
        .isInt({ min: 1, max: 8760 })
        .withMessage('expiresIn must be between 1 and 8760 hours'),
    (0, express_validator_1.body)('actionUrl')
        .optional()
        .isURL()
        .withMessage('actionUrl must be a valid URL'),
    (0, express_validator_1.body)('actionText')
        .optional()
        .isLength({ max: 50 })
        .withMessage('actionText must be max 50 characters')
];
const createBulkNotificationValidation = [
    (0, express_validator_1.body)('notifications')
        .isArray({ min: 1, max: 100 })
        .withMessage('notifications must be an array with 1-100 items'),
    (0, express_validator_1.body)('notifications.*.recipient')
        .isMongoId()
        .withMessage('Valid recipient ID is required for each notification'),
    (0, express_validator_1.body)('notifications.*.type')
        .isIn(['info', 'success', 'warning', 'error', 'system'])
        .withMessage('Valid type is required for each notification'),
    (0, express_validator_1.body)('notifications.*.category')
        .isIn(['user_action', 'system_update', 'content_change', 'security', 'approval', 'media', 'comment', 'general'])
        .withMessage('Valid category is required for each notification'),
    (0, express_validator_1.body)('notifications.*.title')
        .isLength({ min: 1, max: 100 })
        .withMessage('Title must be between 1 and 100 characters for each notification'),
    (0, express_validator_1.body)('notifications.*.message')
        .isLength({ min: 1, max: 500 })
        .withMessage('Message must be between 1 and 500 characters for each notification')
];
const paginationValidation = [
    (0, express_validator_1.query)('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Page must be a positive integer'),
    (0, express_validator_1.query)('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100'),
    (0, express_validator_1.query)('type')
        .optional()
        .isIn(['info', 'success', 'warning', 'error', 'system'])
        .withMessage('Invalid type filter'),
    (0, express_validator_1.query)('category')
        .optional()
        .isIn(['user_action', 'system_update', 'content_change', 'security', 'approval', 'media', 'comment', 'general'])
        .withMessage('Invalid category filter'),
    (0, express_validator_1.query)('priority')
        .optional()
        .isIn(['low', 'medium', 'high', 'urgent'])
        .withMessage('Invalid priority filter'),
    (0, express_validator_1.query)('unreadOnly')
        .optional()
        .isBoolean()
        .withMessage('unreadOnly must be a boolean')
];
const mongoIdValidation = [
    (0, express_validator_1.param)('id')
        .isMongoId()
        .withMessage('Valid notification ID is required')
];
router.get('/', auth_1.authenticate, paginationValidation, notificationController_1.getNotifications);
router.get('/unread-count', auth_1.authenticate, notificationController_1.getUnreadCount);
router.get('/stats', auth_1.authenticate, notificationController_1.getNotificationStats);
router.patch('/:id/read', auth_1.authenticate, mongoIdValidation, notificationController_1.markAsRead);
router.patch('/mark-all-read', auth_1.authenticate, notificationController_1.markAllAsRead);
router.delete('/:id', auth_1.authenticate, mongoIdValidation, notificationController_1.deleteNotification);
router.post('/', auth_1.authenticate, (0, auth_1.authorize)(['admin', 'superadmin']), createNotificationValidation, notificationController_1.createNotification);
router.post('/bulk', auth_1.authenticate, (0, auth_1.authorize)(['admin', 'superadmin']), createBulkNotificationValidation, notificationController_1.createBulkNotifications);
router.get('/system/stats', auth_1.authenticate, (0, auth_1.authorize)(['admin', 'superadmin']), notificationController_1.getSystemNotificationStats);
router.delete('/system/cleanup', auth_1.authenticate, (0, auth_1.authorize)(['superadmin']), notificationController_1.cleanupExpiredNotifications);
exports.default = router;
