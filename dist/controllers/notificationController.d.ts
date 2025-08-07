import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
export declare const getNotifications: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getUnreadCount: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const markAsRead: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const markAllAsRead: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const deleteNotification: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const createNotification: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const createBulkNotifications: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getNotificationStats: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getSystemNotificationStats: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const cleanupExpiredNotifications: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=notificationController.d.ts.map