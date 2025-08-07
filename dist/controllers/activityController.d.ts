import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
export declare const getRecentActivities: (req: AuthRequest, res: Response) => Promise<void>;
export declare const logActivity: (data: {
    type: "post" | "page" | "media" | "user" | "comment" | "login" | "logout";
    action: string;
    entityId?: string;
    entityTitle?: string;
    userId: string;
    userDetails: {
        username: string;
        firstName?: string;
        lastName?: string;
    };
    metadata?: any;
    ipAddress?: string;
    userAgent?: string;
}) => Promise<import("mongoose").Document<unknown, {}, import("../models/Activity").IActivity, {}> & import("../models/Activity").IActivity & Required<{
    _id: unknown;
}> & {
    __v: number;
}>;
export declare const getActivityStats: (req: AuthRequest, res: Response) => Promise<void>;
//# sourceMappingURL=activityController.d.ts.map