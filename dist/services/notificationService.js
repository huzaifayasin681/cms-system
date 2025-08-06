"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Notification_1 = __importDefault(require("../models/Notification"));
const User_1 = __importDefault(require("../models/User"));
const emailService_1 = __importDefault(require("../utils/emailService"));
class NotificationService {
    async createNotification(options) {
        const { notification, websocketServer } = options;
        const recipient = await User_1.default.findById(notification.recipient);
        if (!recipient) {
            throw new Error('Recipient user not found');
        }
        let expiresAt;
        if (notification.expiresIn) {
            expiresAt = new Date(Date.now() + notification.expiresIn * 60 * 60 * 1000);
        }
        const newNotification = new Notification_1.default({
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
        if (websocketServer) {
            try {
                const sent = websocketServer.broadcastNotificationToUser(notification.recipient, {
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
                });
                if (!sent) {
                    console.log(`User ${notification.recipient} not connected for real-time notification`);
                }
            }
            catch (error) {
                console.error('Error sending real-time notification:', error);
            }
        }
        if (notification.sendEmail !== false && this.shouldSendEmail(savedNotification, recipient)) {
            await this.sendEmailNotification(savedNotification, recipient);
        }
        return savedNotification;
    }
    async createBulkNotifications(notifications, websocketServer) {
        const results = [];
        for (const notification of notifications) {
            try {
                const result = await this.createNotification({
                    notification,
                    websocketServer
                });
                results.push(result);
            }
            catch (error) {
                console.error(`Failed to create notification for ${notification.recipient}:`, error);
            }
        }
        return results;
    }
    shouldSendEmail(notification, recipient) {
        if (notification.emailSent) {
            return false;
        }
        if (!recipient.emailVerified) {
            return false;
        }
        if (notification.priority === 'urgent') {
            return true;
        }
        if (notification.priority === 'high' &&
            ['security', 'approval'].includes(notification.category)) {
            return true;
        }
        if (['system_update', 'security'].includes(notification.category) &&
            ['error', 'warning', 'system'].includes(notification.type)) {
            return true;
        }
        return false;
    }
    async sendEmailNotification(notification, recipient) {
        try {
            const subject = `${this.getTypeIcon(notification.type)} ${notification.title}`;
            const html = this.generateEmailTemplate(notification, recipient);
            await emailService_1.default.sendEmail({
                to: recipient.email,
                subject,
                html
            });
            notification.emailSent = true;
            notification.emailSentAt = new Date();
            await notification.save();
            console.log(`Email notification sent to ${recipient.email} for notification ${notification._id}`);
        }
        catch (error) {
            console.error(`Failed to send email notification to ${recipient.email}:`, error);
        }
    }
    getTypeIcon(type) {
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️',
            system: '🔧'
        };
        return icons[type] || 'ℹ️';
    }
    getPriorityColor(priority) {
        const colors = {
            low: '#6b7280',
            medium: '#3b82f6',
            high: '#f59e0b',
            urgent: '#ef4444'
        };
        return colors[priority] || '#3b82f6';
    }
    generateEmailTemplate(notification, recipient) {
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
    async notifyUserApprovalRequired(approverIds, newUser, createdBy, websocketServer) {
        const notifications = approverIds.map(approverId => ({
            recipient: approverId,
            sender: createdBy._id.toString(),
            type: 'warning',
            category: 'approval',
            title: 'User Approval Required',
            message: `New ${newUser.role} account for ${newUser.firstName || newUser.username} (${newUser.email}) requires your approval.`,
            priority: 'high',
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
    async notifyUserApproved(userId, approvedBy, websocketServer) {
        await this.createNotification({
            notification: {
                recipient: userId,
                sender: approvedBy._id.toString(),
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
    async notifyContentPublished(authorId, contentType, contentTitle, publishedBy, websocketServer) {
        await this.createNotification({
            notification: {
                recipient: authorId,
                sender: publishedBy._id.toString(),
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
    async notifySystemMaintenance(userIds, maintenanceDetails, websocketServer) {
        const notifications = userIds.map(userId => ({
            recipient: userId,
            type: 'warning',
            category: 'system_update',
            title: maintenanceDetails.title,
            message: maintenanceDetails.message,
            priority: 'high',
            sendEmail: true,
            expiresIn: 48,
            data: {
                startTime: maintenanceDetails.startTime,
                endTime: maintenanceDetails.endTime
            }
        }));
        await this.createBulkNotifications(notifications, websocketServer);
    }
    async markAsRead(notificationId, userId) {
        const result = await Notification_1.default.updateOne({ _id: notificationId, recipient: userId }, { read: true });
        return result.modifiedCount > 0;
    }
    async markAllAsRead(userId) {
        const result = await Notification_1.default.updateMany({ recipient: userId, read: false }, { read: true });
        return result.modifiedCount;
    }
    async deleteNotification(notificationId, userId) {
        const result = await Notification_1.default.deleteOne({
            _id: notificationId,
            recipient: userId
        });
        return result.deletedCount > 0;
    }
    async getUnreadCount(userId) {
        return await Notification_1.default.countDocuments({
            recipient: userId,
            read: false
        });
    }
    async cleanupExpiredNotifications() {
        const result = await Notification_1.default.deleteMany({
            expiresAt: { $lt: new Date() }
        });
        return result.deletedCount;
    }
    async notifyNewBlogPost(post, author, websocketServer) {
        try {
            const viewers = await User_1.default.find({
                role: { $in: ['viewer', 'editor', 'admin', 'superadmin'] },
                isActive: true,
                emailVerified: true,
                _id: { $ne: author._id }
            });
            if (viewers.length === 0) {
                console.log('No viewers to notify for new blog post');
                return;
            }
            const notifications = viewers.map(viewer => ({
                recipient: viewer._id.toString(),
                sender: author._id.toString(),
                type: 'info',
                category: 'content_change',
                title: 'New Blog Post Published',
                message: `"${post.title}" has been published by ${author.firstName || author.username}.`,
                priority: 'medium',
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
            const results = await this.createBulkNotifications(notifications, websocketServer);
            console.log(`Created ${results.length} notifications for new blog post: ${post.title}`);
        }
        catch (error) {
            console.error('Error notifying users of new blog post:', error);
            throw error;
        }
    }
    async notifyNewPage(page, author, websocketServer) {
        try {
            const users = await User_1.default.find({
                role: { $in: ['viewer', 'editor', 'admin', 'superadmin'] },
                isActive: true,
                emailVerified: true,
                _id: { $ne: author._id }
            });
            if (users.length === 0) {
                console.log('No users to notify for new page');
                return;
            }
            const notifications = users.map(user => ({
                recipient: user._id.toString(),
                sender: author._id.toString(),
                type: 'info',
                category: 'content_change',
                title: 'New Page Created',
                message: `"${page.title}" page has been created by ${author.firstName || author.username}.`,
                priority: 'low',
                sendEmail: page.status === 'published',
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
            const results = await this.createBulkNotifications(notifications, websocketServer);
            console.log(`Created ${results.length} notifications for new page: ${page.title}`);
        }
        catch (error) {
            console.error('Error notifying users of new page:', error);
            throw error;
        }
    }
    async notifyPagePublished(page, author, websocketServer) {
        try {
            const users = await User_1.default.find({
                role: { $in: ['viewer', 'editor', 'admin', 'superadmin'] },
                isActive: true,
                emailVerified: true,
                _id: { $ne: author._id }
            });
            if (users.length === 0) {
                console.log('No users to notify for published page');
                return;
            }
            const notifications = users.map(user => ({
                recipient: user._id.toString(),
                sender: author._id.toString(),
                type: 'success',
                category: 'content_change',
                title: 'Page Published',
                message: `"${page.title}" page is now live and available to view.`,
                priority: 'medium',
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
            const results = await this.createBulkNotifications(notifications, websocketServer);
            console.log(`Created ${results.length} notifications for published page: ${page.title}`);
        }
        catch (error) {
            console.error('Error notifying users of published page:', error);
            throw error;
        }
    }
}
exports.default = new NotificationService();
//# sourceMappingURL=notificationService.js.map