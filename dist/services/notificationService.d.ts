import { INotification } from '../models/Notification';
import { IUser } from '../models/User';
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
    expiresIn?: number;
    actionUrl?: string;
    actionText?: string;
}
export interface CreateNotificationOptions {
    notification: NotificationData;
    websocketServer?: WebSocketServer;
}
declare class NotificationService {
    createNotification(options: CreateNotificationOptions): Promise<INotification>;
    createBulkNotifications(notifications: NotificationData[], websocketServer?: WebSocketServer): Promise<INotification[]>;
    private shouldSendEmail;
    private sendEmailNotification;
    private getTypeIcon;
    private getPriorityColor;
    private generateEmailTemplate;
    notifyUserApprovalRequired(approverIds: string[], newUser: IUser, createdBy: IUser, websocketServer?: WebSocketServer): Promise<void>;
    notifyUserApproved(userId: string, approvedBy: IUser, websocketServer?: WebSocketServer): Promise<void>;
    notifyContentPublished(authorId: string, contentType: 'post' | 'page', contentTitle: string, publishedBy: IUser, websocketServer?: WebSocketServer): Promise<void>;
    notifySystemMaintenance(userIds: string[], maintenanceDetails: {
        title: string;
        message: string;
        startTime: Date;
        endTime: Date;
    }, websocketServer?: WebSocketServer): Promise<void>;
    markAsRead(notificationId: string, userId: string): Promise<boolean>;
    markAllAsRead(userId: string): Promise<number>;
    deleteNotification(notificationId: string, userId: string): Promise<boolean>;
    getUnreadCount(userId: string): Promise<number>;
    cleanupExpiredNotifications(): Promise<number>;
    notifyNewBlogPost(post: any, author: IUser, websocketServer?: WebSocketServer): Promise<void>;
    notifyNewPage(page: any, author: IUser, websocketServer?: WebSocketServer): Promise<void>;
    notifyPagePublished(page: any, author: IUser, websocketServer?: WebSocketServer): Promise<void>;
}
declare const _default: NotificationService;
export default _default;
//# sourceMappingURL=notificationService.d.ts.map