"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const notificationService_1 = __importDefault(require("../services/notificationService"));
const User_1 = __importDefault(require("../models/User"));
const router = express_1.default.Router();
router.post('/test-notification', auth_1.authenticate, async (req, res) => {
    try {
        const userId = req.user?._id;
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        const { type = 'info', priority = 'medium', sendEmail = false } = req.body;
        const notification = await notificationService_1.default.createNotification({
            notification: {
                recipient: userId,
                type,
                category: 'general',
                title: `Test Notification (${type})`,
                message: `This is a test ${type} notification with ${priority} priority. Created at ${new Date().toLocaleString()}.`,
                priority,
                sendEmail,
                actionUrl: '/dashboard/notifications',
                actionText: 'View All'
            },
            websocketServer: req.app.get('websocketServer')
        });
        res.status(201).json({
            success: true,
            message: 'Test notification created successfully',
            data: { notification }
        });
    }
    catch (error) {
        console.error('Error creating test notification:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create test notification'
        });
    }
});
router.post('/test-approval', auth_1.authenticate, (0, auth_1.authorize)(['admin', 'superadmin']), async (req, res) => {
    try {
        const senderId = req.user?._id;
        if (!senderId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        const admins = await User_1.default.find({ role: { $in: ['admin', 'superadmin'] } });
        const sender = await User_1.default.findById(senderId);
        if (!sender) {
            return res.status(404).json({ message: 'Sender not found' });
        }
        const mockUser = {
            _id: 'test-user-id',
            username: 'testuser',
            email: 'test@example.com',
            role: 'editor',
            firstName: 'Test'
        };
        await notificationService_1.default.notifyUserApprovalRequired(admins.map(admin => admin._id.toString()), mockUser, sender, req.app.get('websocketServer'));
        res.json({
            success: true,
            message: `Approval notifications sent to ${admins.length} admin(s)`,
            data: { notifiedAdmins: admins.length }
        });
    }
    catch (error) {
        console.error('Error creating test approval notification:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create test approval notification'
        });
    }
});
router.post('/test-maintenance', auth_1.authenticate, (0, auth_1.authorize)(['superadmin']), async (req, res) => {
    try {
        const users = await User_1.default.find({ isActive: true });
        const userIds = users.map(user => user._id.toString());
        const maintenanceDetails = {
            title: 'Scheduled System Maintenance',
            message: 'The system will undergo maintenance from 2:00 AM to 4:00 AM UTC. During this time, some features may be unavailable.',
            startTime: new Date(Date.now() + 60 * 60 * 1000),
            endTime: new Date(Date.now() + 3 * 60 * 60 * 1000)
        };
        await notificationService_1.default.notifySystemMaintenance(userIds, maintenanceDetails, req.app.get('websocketServer'));
        res.json({
            success: true,
            message: `Maintenance notifications sent to ${users.length} user(s)`,
            data: { notifiedUsers: users.length }
        });
    }
    catch (error) {
        console.error('Error creating test maintenance notification:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create test maintenance notification'
        });
    }
});
router.post('/test-content', auth_1.authenticate, async (req, res) => {
    try {
        const publisherId = req.user?._id;
        const targetUserId = req.body.targetUserId || publisherId;
        if (!publisherId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        const publisher = await User_1.default.findById(publisherId);
        if (!publisher) {
            return res.status(404).json({ message: 'Publisher not found' });
        }
        await notificationService_1.default.notifyContentPublished(targetUserId, 'post', 'Sample Blog Post About Notifications', publisher, req.app.get('websocketServer'));
        res.json({
            success: true,
            message: 'Content published notification sent',
            data: { targetUser: targetUserId }
        });
    }
    catch (error) {
        console.error('Error creating test content notification:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create test content notification'
        });
    }
});
router.post('/test-bulk', auth_1.authenticate, (0, auth_1.authorize)(['admin', 'superadmin']), async (req, res) => {
    try {
        const senderId = req.user?._id;
        if (!senderId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        const users = await User_1.default.find({ isActive: true }).limit(10);
        const notifications = users.map(user => ({
            recipient: user._id.toString(),
            sender: senderId,
            type: 'info',
            category: 'general',
            title: 'Bulk Test Notification',
            message: `Hello ${user.firstName || user.username}! This is a bulk notification test.`,
            priority: 'low',
            sendEmail: false
        }));
        const results = await notificationService_1.default.createBulkNotifications(notifications, req.app.get('websocketServer'));
        res.json({
            success: true,
            message: `Bulk notifications sent to ${results.length} user(s)`,
            data: {
                sentCount: results.length,
                requestedCount: notifications.length
            }
        });
    }
    catch (error) {
        console.error('Error creating bulk test notifications:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create bulk test notifications'
        });
    }
});
router.get('/health', auth_1.authenticate, async (req, res) => {
    try {
        const userId = req.user?._id;
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        const websocketServer = req.app.get('websocketServer');
        const isUserConnected = websocketServer?.isUserConnected(userId) || false;
        const connectedUsers = websocketServer?.getConnectedUsersCount() || 0;
        const unreadCount = await notificationService_1.default.getUnreadCount(userId);
        res.json({
            success: true,
            data: {
                userId,
                isConnectedToWebSocket: isUserConnected,
                totalConnectedUsers: connectedUsers,
                unreadNotifications: unreadCount,
                timestamp: new Date().toISOString()
            }
        });
    }
    catch (error) {
        console.error('Error checking notification system health:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to check notification system health'
        });
    }
});
router.post('/test-blog-post-notification', auth_1.authenticate, async (req, res) => {
    try {
        const author = req.user;
        if (!author) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        const mockPost = {
            _id: 'test-post-id',
            title: 'Test Blog Post for Notifications',
            slug: 'test-blog-post-notifications',
            content: 'This is a test blog post to verify notification functionality.',
            status: 'published',
            publishedAt: new Date()
        };
        await notificationService_1.default.notifyNewBlogPost(mockPost, author, req.app.get('websocketServer'));
        res.json({
            success: true,
            message: 'Blog post notifications sent successfully',
            testPost: mockPost
        });
    }
    catch (error) {
        console.error('Blog post notification test error:', error);
        res.status(500).json({
            message: 'Failed to send blog post notifications',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.post('/test-page-notification', auth_1.authenticate, async (req, res) => {
    try {
        const author = req.user;
        if (!author) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        const mockPage = {
            _id: 'test-page-id',
            title: 'Test Page for Notifications',
            slug: 'test-page-notifications',
            content: 'This is a test page to verify notification functionality.',
            status: 'published',
            createdAt: new Date()
        };
        await notificationService_1.default.notifyPagePublished(mockPage, author, req.app.get('websocketServer'));
        res.json({
            success: true,
            message: 'Page notifications sent successfully',
            testPage: mockPage
        });
    }
    catch (error) {
        console.error('Page notification test error:', error);
        res.status(500).json({
            message: 'Failed to send page notifications',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
exports.default = router;
