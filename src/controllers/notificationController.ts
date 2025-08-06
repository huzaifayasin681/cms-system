import { Request, Response } from 'express';
import Notification from '../models/Notification';
import notificationService, { NotificationData } from '../services/notificationService';
import { AuthRequest } from '../middleware/auth';
import { validationResult } from 'express-validator';

export const getNotifications = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const type = req.query.type as string;
    const category = req.query.category as string;
    const unreadOnly = req.query.unreadOnly === 'true';
    const priority = req.query.priority as string;

    // Build filter query
    const filter: any = { recipient: userId };
    
    if (type) filter.type = type;
    if (category) filter.category = category;
    if (unreadOnly) filter.read = false;
    if (priority) filter.priority = priority;

    const skip = (page - 1) * limit;

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(filter)
        .populate('sender', 'username firstName lastName avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Notification.countDocuments(filter),
      notificationService.getUnreadCount(userId)
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
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications'
    });
  }
};

export const getUnreadCount = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const unreadCount = await notificationService.getUnreadCount(userId);
    
    res.json({
      success: true,
      data: { unreadCount }
    });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch unread count'
    });
  }
};

export const markAsRead = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    const notificationId = req.params.id;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const success = await notificationService.markAsRead(notificationId, userId);
    
    if (!success) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found or already read'
      });
    }

    const unreadCount = await notificationService.getUnreadCount(userId);
    
    res.json({
      success: true,
      message: 'Notification marked as read',
      data: { unreadCount }
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark notification as read'
    });
  }
};

export const markAllAsRead = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const markedCount = await notificationService.markAllAsRead(userId);
    
    res.json({
      success: true,
      message: `${markedCount} notifications marked as read`,
      data: { 
        markedCount,
        unreadCount: 0 
      }
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark all notifications as read'
    });
  }
};

export const deleteNotification = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    const notificationId = req.params.id;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const success = await notificationService.deleteNotification(notificationId, userId);
    
    if (!success) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    const unreadCount = await notificationService.getUnreadCount(userId);
    
    res.json({
      success: true,
      message: 'Notification deleted',
      data: { unreadCount }
    });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete notification'
    });
  }
};

export const createNotification = async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
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

    // Check if user has permission to create notifications
    const userRole = req.user?.role;
    if (!['superadmin', 'admin'].includes(userRole || '')) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions to create notifications'
      });
    }

    const notificationData: NotificationData = {
      ...req.body,
      sender: senderId
    };

    const notification = await notificationService.createNotification({
      notification: notificationData,
      websocketServer: req.app.get('websocketServer')
    });

    res.status(201).json({
      success: true,
      message: 'Notification created successfully',
      data: { notification }
    });
  } catch (error) {
    console.error('Error creating notification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create notification'
    });
  }
};

export const createBulkNotifications = async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
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

    // Check if user has permission to create bulk notifications
    const userRole = req.user?.role;
    if (!['superadmin', 'admin'].includes(userRole || '')) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions to create bulk notifications'
      });
    }

    const notifications: NotificationData[] = req.body.notifications.map((notif: any) => ({
      ...notif,
      sender: senderId
    }));

    const createdNotifications = await notificationService.createBulkNotifications(
      notifications,
      req.app.get('websocketServer')
    );

    res.status(201).json({
      success: true,
      message: `${createdNotifications.length} notifications created successfully`,
      data: { 
        notifications: createdNotifications,
        createdCount: createdNotifications.length,
        requestedCount: notifications.length
      }
    });
  } catch (error) {
    console.error('Error creating bulk notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create bulk notifications'
    });
  }
};

export const getNotificationStats = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const [
      totalCount,
      unreadCount,
      urgentCount,
      typeStats,
      categoryStats
    ] = await Promise.all([
      Notification.countDocuments({ recipient: userId }),
      Notification.countDocuments({ recipient: userId, read: false }),
      Notification.countDocuments({ recipient: userId, priority: 'urgent', read: false }),
      Notification.aggregate([
        { $match: { recipient: userId } },
        { $group: { _id: '$type', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      Notification.aggregate([
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
  } catch (error) {
    console.error('Error fetching notification stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notification statistics'
    });
  }
};

// Admin-only endpoints
export const getSystemNotificationStats = async (req: AuthRequest, res: Response) => {
  try {
    const userRole = req.user?.role;
    if (!['superadmin', 'admin'].includes(userRole || '')) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
    }

    const [
      totalNotifications,
      unsentEmails,
      recentNotifications,
      priorityStats,
      deliveryStats
    ] = await Promise.all([
      Notification.countDocuments(),
      Notification.countDocuments({ emailSent: false }),
      Notification.countDocuments({ 
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      }),
      Notification.aggregate([
        { $group: { _id: '$priority', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      Notification.aggregate([
        { $group: { 
          _id: null, 
          emailSent: { $sum: { $cond: ['$emailSent', 1, 0] } },
          emailNotSent: { $sum: { $cond: ['$emailSent', 0, 1] } }
        }}
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
  } catch (error) {
    console.error('Error fetching system notification stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch system notification statistics'
    });
  }
};

export const cleanupExpiredNotifications = async (req: AuthRequest, res: Response) => {
  try {
    const userRole = req.user?.role;
    if (userRole !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Only superadmin can perform cleanup operations'
      });
    }

    const deletedCount = await notificationService.cleanupExpiredNotifications();
    
    res.json({
      success: true,
      message: `Cleaned up ${deletedCount} expired notifications`,
      data: { deletedCount }
    });
  } catch (error) {
    console.error('Error cleaning up expired notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cleanup expired notifications'
    });
  }
};