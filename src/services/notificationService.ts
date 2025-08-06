import Notification, { INotification } from '../models/Notification';
import User, { IUser } from '../models/User';
import emailService from '../utils/emailService';
import { WebSocketServer } from '../websocket/websocketServer';

export interface NotificationData {
  recipient: string;
  sender?: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'system';
  category: 'user_action' | 'system_update' | 'content_change' | 'security' | 'approval' | 'media' | 'comment' | 'general';
  title: string;
  message: string;
  data?: any;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  sendEmail?: boolean;
  expiresIn?: number; // Hours until expiration
  actionUrl?: string;
  actionText?: string;
}

export interface CreateNotificationOptions {
  notification: NotificationData;
  websocketServer?: WebSocketServer;
}

class NotificationService {
  async createNotification(options: CreateNotificationOptions): Promise<INotification> {
    const { notification, websocketServer } = options;
    
    // Validate recipient exists
    const recipient = await User.findById(notification.recipient);
    if (!recipient) {
      throw new Error('Recipient user not found');
    }

    // Calculate expiration date if provided
    let expiresAt: Date | undefined;
    if (notification.expiresIn) {
      expiresAt = new Date(Date.now() + notification.expiresIn * 60 * 60 * 1000);
    }

    // Create notification
    const newNotification = new Notification({
      recipient: notification.recipient,
      sender: notification.sender,
      type: notification.type,
      category: notification.category,
      title: notification.title,
      message: notification.message,
      data: notification.data || {},
      priority: notification.priority || 'medium',
      expiresAt,
      actionUrl: notification.actionUrl,
      actionText: notification.actionText,
    });

    const savedNotification = await newNotification.save();
    await savedNotification.populate('sender', 'username firstName lastName avatar');

    // Send real-time notification via WebSocket
    if (websocketServer) {
      try {
        const sent = websocketServer.broadcastNotificationToUser(
          notification.recipient,
          {
            id: savedNotification._id,
            type: savedNotification.type,
            category: savedNotification.category,
            title: savedNotification.title,
            message: savedNotification.message,
            priority: savedNotification.priority,
            actionUrl: savedNotification.actionUrl,
            actionText: savedNotification.actionText,
            sender: savedNotification.sender,
            createdAt: savedNotification.createdAt,
            data: savedNotification.data,
            read: savedNotification.read,
            expiresAt: savedNotification.expiresAt
          }
        );
        
        if (!sent) {
          console.log(`User ${notification.recipient} not connected for real-time notification`);
        }
      } catch (error) {
        console.error('Error sending real-time notification:', error);
      }
    }

    // Send email notification if requested and appropriate
    if (notification.sendEmail !== false && this.shouldSendEmail(savedNotification, recipient)) {
      await this.sendEmailNotification(savedNotification, recipient);
    }

    return savedNotification;
  }

  async createBulkNotifications(
    notifications: NotificationData[],
    websocketServer?: WebSocketServer
  ): Promise<INotification[]> {
    const results: INotification[] = [];
    
    for (const notification of notifications) {
      try {
        const result = await this.createNotification({
          notification,
          websocketServer
        });
        results.push(result);
      } catch (error) {
        console.error(`Failed to create notification for ${notification.recipient}:`, error);
      }
    }
    
    return results;
  }

  private shouldSendEmail(notification: INotification, recipient: IUser): boolean {
    // Don't send email if already sent
    if (notification.emailSent) {
      return false;
    }

    // Don't send email if recipient email is not verified
    if (!recipient.emailVerified) {
      return false;
    }

    // Always send for urgent notifications
    if (notification.priority === 'urgent') {
      return true;
    }

    // Send for high priority security and approval notifications
    if (notification.priority === 'high' && 
        ['security', 'approval'].includes(notification.category)) {
      return true;
    }

    // Send for system updates and errors
    if (['system_update', 'security'].includes(notification.category) && 
        ['error', 'warning', 'system'].includes(notification.type)) {
      return true;
    }

    return false;
  }

  private async sendEmailNotification(notification: INotification, recipient: IUser): Promise<void> {
    try {
      const subject = `${this.getTypeIcon(notification.type)} ${notification.title}`;
      const html = this.generateEmailTemplate(notification, recipient);

      await emailService.sendEmail({
        to: recipient.email,
        subject,
        html
      });

      // Mark email as sent
      notification.emailSent = true;
      notification.emailSentAt = new Date();
      await notification.save();

      console.log(`Email notification sent to ${recipient.email} for notification ${notification._id}`);
    } catch (error) {
      console.error(`Failed to send email notification to ${recipient.email}:`, error);
    }
  }

  private getTypeIcon(type: string): string {
    const icons = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️',
      system: '🔧'
    };
    return icons[type as keyof typeof icons] || 'ℹ️';
  }

  private getPriorityColor(priority: string): string {
    const colors = {
      low: '#6b7280',
      medium: '#3b82f6',
      high: '#f59e0b',
      urgent: '#ef4444'
    };
    return colors[priority as keyof typeof colors] || '#3b82f6';
  }

  private generateEmailTemplate(notification: INotification, recipient: IUser): string {
    const priorityColor = this.getPriorityColor(notification.priority);
    const actionButton = notification.actionUrl ? `
      <div style="text-align: center; margin: 30px 0;">
        <a href="${notification.actionUrl}" 
           style="display: inline-block; background: ${priorityColor}; color: white; padding: 12px 24px; 
                  text-decoration: none; border-radius: 6px; font-weight: 600;">
          ${notification.actionText || 'View Details'}
        </a>
      </div>
    ` : '';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${notification.title}</title>
        <style>
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
            line-height: 1.6; 
            color: #333; 
            margin: 0; 
            padding: 0; 
            background-color: #f5f5f5; 
          }
          .container { 
            max-width: 600px; 
            margin: 0 auto; 
            background-color: white; 
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); 
          }
          .header { 
            background: linear-gradient(135deg, ${priorityColor}, ${priorityColor}dd); 
            color: white; 
            padding: 30px 20px; 
            text-align: center; 
          }
          .header h1 { 
            margin: 0; 
            font-size: 24px; 
            font-weight: 600; 
          }
          .priority-badge {
            display: inline-block;
            background: rgba(255,255,255,0.2);
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            text-transform: uppercase;
            margin-top: 8px;
          }
          .content { 
            padding: 40px 30px; 
          }
          .message { 
            font-size: 16px;
            margin-bottom: 20px;
            color: #666;
          }
          .metadata {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
            font-size: 14px;
          }
          .footer { 
            background: #f8f9fa; 
            padding: 20px; 
            text-align: center; 
            font-size: 12px; 
            color: #666; 
            border-top: 1px solid #e9ecef; 
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${this.getTypeIcon(notification.type)} ${notification.title}</h1>
            <div class="priority-badge">${notification.priority} priority</div>
          </div>
          <div class="content">
            <p>Hello ${recipient.firstName || recipient.username}!</p>
            
            <div class="message">
              ${notification.message}
            </div>
            
            ${actionButton}
            
            <div class="metadata">
              <strong>Category:</strong> ${notification.category.replace('_', ' ')}<br>
              <strong>Time:</strong> ${notification.createdAt.toLocaleString()}<br>
              ${notification.expiresAt ? `<strong>Expires:</strong> ${notification.expiresAt.toLocaleString()}<br>` : ''}
            </div>
            
            <p style="color: #666; font-size: 14px;">
              You can also view this notification in your dashboard. 
              ${notification.actionUrl ? 'Click the button above to take action.' : ''}
            </p>
          </div>
          <div class="footer">
            <p>This is an automated notification. Please do not reply to this message.</p>
            <p>&copy; ${new Date().getFullYear()} CMS System. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // Notification template methods for common scenarios
  async notifyUserApprovalRequired(
    approverIds: string[],
    newUser: IUser,
    createdBy: IUser,
    websocketServer?: WebSocketServer
  ): Promise<void> {
    const notifications: NotificationData[] = approverIds.map(approverId => ({
      recipient: approverId,
      sender: (createdBy._id as any).toString(),
      type: 'warning' as const,
      category: 'approval' as const,
      title: 'User Approval Required',
      message: `New ${newUser.role} account for ${newUser.firstName || newUser.username} (${newUser.email}) requires your approval.`,
      priority: 'high' as const,
      sendEmail: true,
      actionUrl: '/dashboard/users?tab=pending',
      actionText: 'Review Request',
      data: {
        newUserId: newUser._id,
        newUserEmail: newUser.email,
        newUserRole: newUser.role
      }
    }));

    await this.createBulkNotifications(notifications, websocketServer);
  }

  async notifyUserApproved(
    userId: string,
    approvedBy: IUser,
    websocketServer?: WebSocketServer
  ): Promise<void> {
    await this.createNotification({
      notification: {
        recipient: userId,
        sender: (approvedBy._id as any).toString(),
        type: 'success',
        category: 'approval',
        title: 'Account Approved',
        message: `Your account has been approved by ${approvedBy.firstName || approvedBy.username}. Welcome aboard!`,
        priority: 'high',
        sendEmail: true,
        actionUrl: '/dashboard',
        actionText: 'Go to Dashboard'
      },
      websocketServer
    });
  }

  async notifyContentPublished(
    authorId: string,
    contentType: 'post' | 'page',
    contentTitle: string,
    publishedBy: IUser,
    websocketServer?: WebSocketServer
  ): Promise<void> {
    await this.createNotification({
      notification: {
        recipient: authorId,
        sender: (publishedBy._id as any).toString(),
        type: 'success',
        category: 'content_change',
        title: `${contentType.charAt(0).toUpperCase() + contentType.slice(1)} Published`,
        message: `Your ${contentType} "${contentTitle}" has been published by ${publishedBy.firstName || publishedBy.username}.`,
        priority: 'medium',
        sendEmail: true,
        actionUrl: contentType === 'post' ? '/dashboard/posts' : '/dashboard/pages',
        actionText: `View ${contentType.charAt(0).toUpperCase() + contentType.slice(1)}`
      },
      websocketServer
    });
  }

  async notifySystemMaintenance(
    userIds: string[],
    maintenanceDetails: {
      title: string;
      message: string;
      startTime: Date;
      endTime: Date;
    },
    websocketServer?: WebSocketServer
  ): Promise<void> {
    const notifications: NotificationData[] = userIds.map(userId => ({
      recipient: userId,
      type: 'warning' as const,
      category: 'system_update' as const,
      title: maintenanceDetails.title,
      message: maintenanceDetails.message,
      priority: 'high' as const,
      sendEmail: true,
      expiresIn: 48, // Expire after 48 hours
      data: {
        startTime: maintenanceDetails.startTime,
        endTime: maintenanceDetails.endTime
      }
    }));

    await this.createBulkNotifications(notifications, websocketServer);
  }

  // Utility methods for managing notifications
  async markAsRead(notificationId: string, userId: string): Promise<boolean> {
    const result = await Notification.updateOne(
      { _id: notificationId, recipient: userId },
      { read: true }
    );
    return result.modifiedCount > 0;
  }

  async markAllAsRead(userId: string): Promise<number> {
    const result = await Notification.updateMany(
      { recipient: userId, read: false },
      { read: true }
    );
    return result.modifiedCount;
  }

  async deleteNotification(notificationId: string, userId: string): Promise<boolean> {
    const result = await Notification.deleteOne({
      _id: notificationId,
      recipient: userId
    });
    return result.deletedCount > 0;
  }

  async getUnreadCount(userId: string): Promise<number> {
    return await Notification.countDocuments({
      recipient: userId,
      read: false
    });
  }

  async cleanupExpiredNotifications(): Promise<number> {
    const result = await Notification.deleteMany({
      expiresAt: { $lt: new Date() }
    });
    return result.deletedCount;
  }

  // Blog post notifications
  async notifyNewBlogPost(
    post: any,
    author: IUser,
    websocketServer?: WebSocketServer
  ): Promise<void> {
    try {
      // Get all viewers and other users who should be notified
      const viewers = await User.find({ 
        role: { $in: ['viewer', 'editor', 'admin', 'superadmin'] },
        isActive: true,
        emailVerified: true,
        _id: { $ne: author._id } // Exclude the author
      });

      if (viewers.length === 0) {
        console.log('No viewers to notify for new blog post');
        return;
      }

      const notifications: NotificationData[] = viewers.map(viewer => ({
        recipient: (viewer._id as any).toString(),
        sender: (author._id as any).toString(),
        type: 'info' as const,
        category: 'content_change' as const,
        title: 'New Blog Post Published',
        message: `"${post.title}" has been published by ${author.firstName || author.username}.`,
        priority: 'medium' as const,
        sendEmail: true,
        actionUrl: `/blog/${post.slug}`,
        actionText: 'Read Post',
        data: {
          postId: post._id.toString(),
          postTitle: post.title,
          postSlug: post.slug,
          authorName: author.firstName || author.username,
          publishedAt: post.publishedAt || new Date()
        }
      }));

      // Create all notifications
      const results = await this.createBulkNotifications(
        notifications,
        websocketServer
      );

      console.log(`Created ${results.length} notifications for new blog post: ${post.title}`);
    } catch (error) {
      console.error('Error notifying users of new blog post:', error);
      throw error;
    }
  }

  // Page notifications
  async notifyNewPage(
    page: any,
    author: IUser,
    websocketServer?: WebSocketServer
  ): Promise<void> {
    try {
      // Get all users except the author
      const users = await User.find({ 
        role: { $in: ['viewer', 'editor', 'admin', 'superadmin'] },
        isActive: true,
        emailVerified: true,
        _id: { $ne: author._id } // Exclude the author
      });

      if (users.length === 0) {
        console.log('No users to notify for new page');
        return;
      }

      const notifications: NotificationData[] = users.map(user => ({
        recipient: (user._id as any).toString(),
        sender: (author._id as any).toString(),
        type: 'info' as const,
        category: 'content_change' as const,
        title: 'New Page Created',
        message: `"${page.title}" page has been created by ${author.firstName || author.username}.`,
        priority: 'low' as const,
        sendEmail: page.status === 'published', // Only send email if published
        actionUrl: `/pages/${page.slug}`,
        actionText: 'View Page',
        data: {
          pageId: page._id.toString(),
          pageTitle: page.title,
          pageSlug: page.slug,
          authorName: author.firstName || author.username,
          status: page.status,
          createdAt: page.createdAt || new Date()
        }
      }));

      // Create all notifications
      const results = await this.createBulkNotifications(
        notifications,
        websocketServer
      );

      console.log(`Created ${results.length} notifications for new page: ${page.title}`);
    } catch (error) {
      console.error('Error notifying users of new page:', error);
      throw error;
    }
  }

  // Page update notifications (when published)
  async notifyPagePublished(
    page: any,
    author: IUser,
    websocketServer?: WebSocketServer
  ): Promise<void> {
    try {
      // Get all viewers and other users
      const users = await User.find({ 
        role: { $in: ['viewer', 'editor', 'admin', 'superadmin'] },
        isActive: true,
        emailVerified: true,
        _id: { $ne: author._id } // Exclude the author
      });

      if (users.length === 0) {
        console.log('No users to notify for published page');
        return;
      }

      const notifications: NotificationData[] = users.map(user => ({
        recipient: (user._id as any).toString(),
        sender: (author._id as any).toString(),
        type: 'success' as const,
        category: 'content_change' as const,
        title: 'Page Published',
        message: `"${page.title}" page is now live and available to view.`,
        priority: 'medium' as const,
        sendEmail: true,
        actionUrl: `/pages/${page.slug}`,
        actionText: 'View Page',
        data: {
          pageId: page._id.toString(),
          pageTitle: page.title,
          pageSlug: page.slug,
          authorName: author.firstName || author.username,
          publishedAt: page.publishedAt || new Date()
        }
      }));

      // Create all notifications
      const results = await this.createBulkNotifications(
        notifications,
        websocketServer
      );

      console.log(`Created ${results.length} notifications for published page: ${page.title}`);
    } catch (error) {
      console.error('Error notifying users of published page:', error);
      throw error;
    }
  }
}

export default new NotificationService();