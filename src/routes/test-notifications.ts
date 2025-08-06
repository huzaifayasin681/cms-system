import express from 'express';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import notificationService from '../services/notificationService';
import User from '../models/User';

const router = express.Router();

// Test endpoint to create sample notifications
router.post('/test-notification', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { type = 'info', priority = 'medium', sendEmail = false } = req.body;

    const notification = await notificationService.createNotification({
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
  } catch (error) {
    console.error('Error creating test notification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create test notification'
    });
  }
});

// Test endpoint for user approval notifications
router.post('/test-approval', authenticate, authorize(['admin', 'superadmin']), async (req: AuthRequest, res) => {
  try {
    const senderId = req.user?._id;
    if (!senderId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Get all admins to notify
    const admins = await User.find({ role: { $in: ['admin', 'superadmin'] } });
    const sender = await User.findById(senderId);

    if (!sender) {
      return res.status(404).json({ message: 'Sender not found' });
    }

    // Create mock user data
    const mockUser = {
      _id: 'test-user-id',
      username: 'testuser',
      email: 'test@example.com',
      role: 'editor',
      firstName: 'Test'
    } as any;

    await notificationService.notifyUserApprovalRequired(
      admins.map(admin => (admin._id as any).toString()),
      mockUser,
      sender,
      req.app.get('websocketServer')
    );

    res.json({
      success: true,
      message: `Approval notifications sent to ${admins.length} admin(s)`,
      data: { notifiedAdmins: admins.length }
    });
  } catch (error) {
    console.error('Error creating test approval notification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create test approval notification'
    });
  }
});

// Test endpoint for system maintenance notifications
router.post('/test-maintenance', authenticate, authorize(['superadmin']), async (req: AuthRequest, res) => {
  try {
    // Get all users
    const users = await User.find({ isActive: true });
    const userIds = users.map(user => (user._id as any).toString());

    const maintenanceDetails = {
      title: 'Scheduled System Maintenance',
      message: 'The system will undergo maintenance from 2:00 AM to 4:00 AM UTC. During this time, some features may be unavailable.',
      startTime: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
      endTime: new Date(Date.now() + 3 * 60 * 60 * 1000)  // 3 hours from now
    };

    await notificationService.notifySystemMaintenance(
      userIds,
      maintenanceDetails,
      req.app.get('websocketServer')
    );

    res.json({
      success: true,
      message: `Maintenance notifications sent to ${users.length} user(s)`,
      data: { notifiedUsers: users.length }
    });
  } catch (error) {
    console.error('Error creating test maintenance notification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create test maintenance notification'
    });
  }
});

// Test endpoint for content published notifications
router.post('/test-content', authenticate, async (req: AuthRequest, res) => {
  try {
    const publisherId = req.user?._id;
    const targetUserId = req.body.targetUserId || publisherId;
    
    if (!publisherId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const publisher = await User.findById(publisherId);
    if (!publisher) {
      return res.status(404).json({ message: 'Publisher not found' });
    }

    await notificationService.notifyContentPublished(
      targetUserId,
      'post',
      'Sample Blog Post About Notifications',
      publisher,
      req.app.get('websocketServer')
    );

    res.json({
      success: true,
      message: 'Content published notification sent',
      data: { targetUser: targetUserId }
    });
  } catch (error) {
    console.error('Error creating test content notification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create test content notification'
    });
  }
});

// Test endpoint for bulk notifications
router.post('/test-bulk', authenticate, authorize(['admin', 'superadmin']), async (req: AuthRequest, res) => {
  try {
    const senderId = req.user?._id;
    if (!senderId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Get all users
    const users = await User.find({ isActive: true }).limit(10); // Limit to 10 for testing
    
    const notifications = users.map(user => ({
      recipient: (user._id as any).toString(),
      sender: senderId,
      type: 'info' as const,
      category: 'general' as const,
      title: 'Bulk Test Notification',
      message: `Hello ${user.firstName || user.username}! This is a bulk notification test.`,
      priority: 'low' as const,
      sendEmail: false
    }));

    const results = await notificationService.createBulkNotifications(
      notifications,
      req.app.get('websocketServer')
    );

    res.json({
      success: true,
      message: `Bulk notifications sent to ${results.length} user(s)`,
      data: { 
        sentCount: results.length,
        requestedCount: notifications.length
      }
    });
  } catch (error) {
    console.error('Error creating bulk test notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create bulk test notifications'
    });
  }
});

// Test endpoint to check notification system health
router.get('/health', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const websocketServer = req.app.get('websocketServer');
    const isUserConnected = websocketServer?.isUserConnected(userId) || false;
    const connectedUsers = websocketServer?.getConnectedUsersCount() || 0;

    // Get user's notification stats
    const unreadCount = await notificationService.getUnreadCount(userId);

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
  } catch (error) {
    console.error('Error checking notification system health:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check notification system health'
    });
  }
});

// Test blog post notifications
router.post('/test-blog-post-notification', authenticate, async (req: AuthRequest, res) => {
  try {
    const author = req.user;
    if (!author) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Mock blog post data
    const mockPost = {
      _id: 'test-post-id',
      title: 'Test Blog Post for Notifications',
      slug: 'test-blog-post-notifications',
      content: 'This is a test blog post to verify notification functionality.',
      status: 'published',
      publishedAt: new Date()
    };

    await notificationService.notifyNewBlogPost(
      mockPost,
      author,
      req.app.get('websocketServer')
    );

    res.json({
      success: true,
      message: 'Blog post notifications sent successfully',
      testPost: mockPost
    });
  } catch (error) {
    console.error('Blog post notification test error:', error);
    res.status(500).json({
      message: 'Failed to send blog post notifications',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Test page notifications
router.post('/test-page-notification', authenticate, async (req: AuthRequest, res) => {
  try {
    const author = req.user;
    if (!author) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Mock page data
    const mockPage = {
      _id: 'test-page-id',
      title: 'Test Page for Notifications',
      slug: 'test-page-notifications',
      content: 'This is a test page to verify notification functionality.',
      status: 'published',
      createdAt: new Date()
    };

    await notificationService.notifyPagePublished(
      mockPage,
      author,
      req.app.get('websocketServer')
    );

    res.json({
      success: true,
      message: 'Page notifications sent successfully',
      testPage: mockPage
    });
  } catch (error) {
    console.error('Page notification test error:', error);
    res.status(500).json({
      message: 'Failed to send page notifications',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;