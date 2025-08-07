import mongoose from 'mongoose';
export interface IScheduleOptions {
    scheduledAt: Date;
    action: 'publish' | 'unpublish' | 'archive' | 'delete';
    targetStatus: string;
    notifyUsers: mongoose.Types.ObjectId[];
    emailNotification: boolean;
    socialMediaPost: boolean;
}
export declare class ContentSchedulingService {
    static scheduleAction(contentId: mongoose.Types.ObjectId, contentType: 'post' | 'page', userId: mongoose.Types.ObjectId, options: IScheduleOptions): Promise<mongoose.Document<unknown, {}, import("../models/ContentSchedule").IContentSchedule, {}> & import("../models/ContentSchedule").IContentSchedule & Required<{
        _id: unknown;
    }> & {
        __v: number;
    }>;
    static executeDueSchedules(): Promise<{
        executed: number;
        failed: number;
        errors: string[];
    }>;
    static executeSchedule(schedule: any): Promise<void>;
    static getScheduledActions(contentId?: mongoose.Types.ObjectId, contentType?: 'post' | 'page', userId?: mongoose.Types.ObjectId, status?: string, limit?: number, offset?: number): Promise<{
        schedules: (mongoose.Document<unknown, {}, import("../models/ContentSchedule").IContentSchedule, {}> & import("../models/ContentSchedule").IContentSchedule & Required<{
            _id: unknown;
        }> & {
            __v: number;
        })[];
        total: number;
        hasMore: boolean;
    }>;
    static cancelSchedule(scheduleId: mongoose.Types.ObjectId, userId: mongoose.Types.ObjectId): Promise<mongoose.Document<unknown, {}, import("../models/ContentSchedule").IContentSchedule, {}> & import("../models/ContentSchedule").IContentSchedule & Required<{
        _id: unknown;
    }> & {
        __v: number;
    }>;
    static updateSchedule(scheduleId: mongoose.Types.ObjectId, updates: {
        scheduledAt?: Date;
        action?: 'publish' | 'unpublish' | 'archive' | 'delete';
        notifyUsers?: mongoose.Types.ObjectId[];
        emailNotification?: boolean;
        socialMediaPost?: boolean;
    }, userId: mongoose.Types.ObjectId): Promise<mongoose.Document<unknown, {}, import("../models/ContentSchedule").IContentSchedule, {}> & import("../models/ContentSchedule").IContentSchedule & Required<{
        _id: unknown;
    }> & {
        __v: number;
    }>;
    static getSchedulingStats(userId?: mongoose.Types.ObjectId): Promise<{
        upcoming: number;
        pending: number;
        executed: number;
        failed: number;
        cancelled: number;
    }>;
    private static cancelPendingSchedules;
    private static sendNotifications;
    static cleanupOldSchedules(daysToKeep?: number): Promise<number>;
}
export default ContentSchedulingService;
//# sourceMappingURL=schedulingService.d.ts.map