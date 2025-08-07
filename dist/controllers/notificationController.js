"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanupExpiredNotifications = exports.getSystemNotificationStats = exports.getNotificationStats = exports.createBulkNotifications = exports.createNotification = exports.deleteNotification = exports.markAllAsRead = exports.markAsRead = exports.getUnreadCount = exports.getNotifications = void 0;
const Notification_1 = __importDefault(require("../models/Notification"));
const notificationService_1 = __importDefault(require("../services/notificationService"));
const express_validator_1 = require("express-validator");
const getNotifications = async (req, res) => {
    try {
        const userId = req.user?._id;
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const type = req.query.type;
        const category = req.query.category;
        const unreadOnly = req.query.unreadOnly === 'true';
        const priority = req.query.priority;
        const filter = { recipient: userId };
        if (type)
            filter.type = type;
        if (category)
            filter.category = category;
        if (unreadOnly)
            filter.read = false;
        if (priority)
            filter.priority = priority;
        const skip = (page - 1) * limit;
        const [notifications, total, unreadCount] = await Promise.all([
            Notification_1.default.find(filter)
                .populate('sender', 'username firstName lastName avatar')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Notification_1.default.countDocuments(filter),
            notificationService_1.default.getUnreadCount(userId)
        ]);
        res.json({
            success: true,
            data: {
                notifications,
                pagination: {
                    currentPage: page,
                    totalPages: Math.ceil(total / limit),
                    totalItems: total,
                    itemsPerPage: limit,
                    hasNextPage: page < Math.ceil(total / limit),
                    hasPrevPage: page > 1
                },
                unreadCount
            }
        });
    }
    catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch notifications'
        });
    }
};
exports.getNotifications = getNotifications;
const getUnreadCount = async (req, res) => {
    try {
        const userId = req.user?._id;
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        const unreadCount = await notificationService_1.default.getUnreadCount(userId);
        res.json({
            success: true,
            data: { unreadCount }
        });
    }
    catch (error) {
        console.error('Error fetching unread count:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch unread count'
        });
    }
};
exports.getUnreadCount = getUnreadCount;
const markAsRead = async (req, res) => {
    try {
        const userId = req.user?._id;
        const notificationId = req.params.id;
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        const success = await notificationService_1.default.markAsRead(notificationId, userId);
        if (!success) {
            return res.status(404).json({
                success: false,
                message: 'Notification not found or already read'
            });
        }
        const unreadCount = await notificationService_1.default.getUnreadCount(userId);
        res.json({
            success: true,
            message: 'Notification marked as read',
            data: { unreadCount }
        });
    }
    catch (error) {
        console.error('Error marking notification as read:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to mark notification as read'
        });
    }
};
exports.markAsRead = markAsRead;
const markAllAsRead = async (req, res) => {
    try {
        const userId = req.user?._id;
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        const markedCount = await notificationService_1.default.markAllAsRead(userId);
        res.json({
            success: true,
            message: `${markedCount} notifications marked as read`,
            data: {
                markedCount,
                unreadCount: 0
            }
        });
    }
    catch (error) {
        console.error('Error marking all notifications as read:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to mark all notifications as read'
        });
    }
};
exports.markAllAsRead = markAllAsRead;
const deleteNotification = async (req, res) => {
    try {
        const userId = req.user?._id;
        const notificationId = req.params.id;
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        const success = await notificationService_1.default.deleteNotification(notificationId, userId);
        if (!success) {
            return res.status(404).json({
                success: false,
                message: 'Notification not found'
            });
        }
        const unreadCount = await notificationService_1.default.getUnreadCount(userId);
        res.json({
            success: true,
            message: 'Notification deleted',
            data: { unreadCount }
        });
    }
    catch (error) {
        console.error('Error deleting notification:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete notification'
        });
    }
};
exports.deleteNotification = deleteNotification;
const createNotification = async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }
        const senderId = req.user?._id;
        if (!senderId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        const userRole = req.user?.role;
        if (!['superadmin', 'admin'].includes(userRole || '')) {
            return res.status(403).json({
                success: false,
                message: 'Insufficient permissions to create notifications'
            });
        }
        const notificationData = {
            ...req.body,
            sender: senderId
        };
        const notification = await notificationService_1.default.createNotification({
            notification: notificationData,
            websocketServer: req.app.get('websocketServer')
        });
        res.status(201).json({
            success: true,
            message: 'Notification created successfully',
            data: { notification }
        });
    }
    catch (error) {
        console.error('Error creating notification:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create notification'
        });
    }
};
exports.createNotification = createNotification;
const createBulkNotifications = async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }
        const senderId = req.user?._id;
        if (!senderId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        const userRole = req.user?.role;
        if (!['superadmin', 'admin'].includes(userRole || '')) {
            return res.status(403).json({
                success: false,
                message: 'Insufficient permissions to create bulk notifications'
            });
        }
        const notifications = req.body.notifications.map((notif) => ({
            ...notif,
            sender: senderId
        }));
        const createdNotifications = await notificationService_1.default.createBulkNotifications(notifications, req.app.get('websocketServer'));
        res.status(201).json({
            success: true,
            message: `${createdNotifications.length} notifications created successfully`,
            data: {
                notifications: createdNotifications,
                createdCount: createdNotifications.length,
                requestedCount: notifications.length
            }
        });
    }
    catch (error) {
        console.error('Error creating bulk notifications:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create bulk notifications'
        });
    }
};
exports.createBulkNotifications = createBulkNotifications;
const getNotificationStats = async (req, res) => {
    try {
        const userId = req.user?._id;
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        const [totalCount, unreadCount, urgentCount, typeStats, categoryStats] = await Promise.all([
            Notification_1.default.countDocuments({ recipient: userId }),
            Notification_1.default.countDocuments({ recipient: userId, read: false }),
            Notification_1.default.countDocuments({ recipient: userId, priority: 'urgent', read: false }),
            Notification_1.default.aggregate([
                { $match: { recipient: userId } },
                { $group: { _id: '$type', count: { $sum: 1 } } },
                { $sort: { count: -1 } }
            ]),
            Notification_1.default.aggregate([
                { $match: { recipient: userId } },
                { $group: { _id: '$category', count: { $sum: 1 } } },
                { $sort: { count: -1 } }
            ])
        ]);
        res.json({
            success: true,
            data: {
                totalCount,
                unreadCount,
                urgentCount,
                readCount: totalCount - unreadCount,
                typeBreakdown: typeStats,
                categoryBreakdown: categoryStats
            }
        });
    }
    catch (error) {
        console.error('Error fetching notification stats:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch notification statistics'
        });
    }
};
exports.getNotificationStats = getNotificationStats;
const getSystemNotificationStats = async (req, res) => {
    try {
        const userRole = req.user?.role;
        if (!['superadmin', 'admin'].includes(userRole || '')) {
            return res.status(403).json({
                success: false,
                message: 'Insufficient permissions'
            });
        }
        const [totalNotifications, unsentEmails, recentNotifications, priorityStats, deliveryStats] = await Promise.all([
            Notification_1.default.countDocuments(),
            Notification_1.default.countDocuments({ emailSent: false }),
            Notification_1.default.countDocuments({
                createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
            }),
            Notification_1.default.aggregate([
                { $group: { _id: '$priority', count: { $sum: 1 } } },
                { $sort: { count: -1 } }
            ]),
            Notification_1.default.aggregate([
                { $group: {
                        _id: null,
                        emailSent: { $sum: { $cond: ['$emailSent', 1, 0] } },
                        emailNotSent: { $sum: { $cond: ['$emailSent', 0, 1] } }
                    } }
            ])
        ]);
        res.json({
            success: true,
            data: {
                totalNotifications,
                unsentEmails,
                recentNotifications,
                priorityBreakdown: priorityStats,
                emailDeliveryStats: deliveryStats[0] || { emailSent: 0, emailNotSent: 0 }
            }
        });
    }
    catch (error) {
        console.error('Error fetching system notification stats:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch system notification statistics'
        });
    }
};
exports.getSystemNotificationStats = getSystemNotificationStats;
const cleanupExpiredNotifications = async (req, res) => {
    try {
        const userRole = req.user?.role;
        if (userRole !== 'superadmin') {
            return res.status(403).json({
                success: false,
                message: 'Only superadmin can perform cleanup operations'
            });
        }
        const deletedCount = await notificationService_1.default.cleanupExpiredNotifications();
        res.json({
            success: true,
            message: `Cleaned up ${deletedCount} expired notifications`,
            data: { deletedCount }
        });
    }
    catch (error) {
        console.error('Error cleaning up expired notifications:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to cleanup expired notifications'
        });
    }
};
exports.cleanupExpiredNotifications = cleanupExpiredNotifications;
