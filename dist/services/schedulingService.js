"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContentSchedulingService = void 0;
const ContentSchedule_1 = __importDefault(require("../models/ContentSchedule"));
const Post_1 = __importDefault(require("../models/Post"));
const Page_1 = __importDefault(require("../models/Page"));
const notificationService_1 = __importDefault(require("./notificationService"));
const mongooseHelper_1 = require("../utils/mongooseHelper");
class ContentSchedulingService {
    static async scheduleAction(contentId, contentType, userId, options) {
        try {
            const Model = contentType === 'post' ? Post_1.default : Page_1.default;
            const content = await (0, mongooseHelper_1.safeFindById)(Model, contentId);
            if (!content) {
                throw new Error(`${contentType} not found`);
            }
            await this.cancelPendingSchedules(contentId, contentType);
            const schedule = new ContentSchedule_1.default({
                contentId,
                contentType,
                action: options.action,
                scheduledAt: options.scheduledAt,
                metadata: {
                    originalStatus: content.status,
                    targetStatus: options.targetStatus,
                    notifyUsers: options.notifyUsers,
                    emailNotification: options.emailNotification,
                    socialMediaPost: options.socialMediaPost
                },
                createdBy: userId
            });
            await schedule.save();
            if (options.action === 'publish') {
                await (0, mongooseHelper_1.safeFindByIdAndUpdate)(Model, contentId, {
                    status: 'scheduled',
                    scheduledAt: options.scheduledAt
                });
            }
            return schedule;
        }
        catch (error) {
            throw new Error(`Failed to schedule action: ${error.message}`);
        }
    }
    static async executeDueSchedules() {
        try {
            const dueSchedules = await ContentSchedule_1.default.find({
                status: 'pending',
                scheduledAt: { $lte: new Date() },
                $expr: { $lt: ['$retryCount', '$maxRetries'] }
            }).populate('contentId').populate('createdBy');
            const results = {
                executed: 0,
                failed: 0,
                errors: []
            };
            for (const schedule of dueSchedules) {
                try {
                    await this.executeSchedule(schedule);
                    results.executed++;
                }
                catch (error) {
                    await (0, mongooseHelper_1.castDocument)(schedule).markFailed(error.message);
                    results.failed++;
                    results.errors.push(`Schedule ${schedule._id}: ${error.message}`);
                }
            }
            return results;
        }
        catch (error) {
            throw new Error(`Failed to execute schedules: ${error.message}`);
        }
    }
    static async executeSchedule(schedule) {
        try {
            const Model = schedule.contentType === 'post' ? Post_1.default : Page_1.default;
            const content = await (0, mongooseHelper_1.safeFindById)(Model, schedule.contentId);
            if (!content) {
                throw new Error(`${schedule.contentType} not found`);
            }
            let updateData = {};
            switch (schedule.action) {
                case 'publish':
                    updateData = {
                        status: 'published',
                        publishedAt: new Date(),
                        scheduledAt: null
                    };
                    break;
                case 'unpublish':
                    updateData = {
                        status: 'draft',
                        publishedAt: null
                    };
                    break;
                case 'archive':
                    updateData = {
                        status: 'archived'
                    };
                    break;
                case 'delete':
                    await (0, mongooseHelper_1.safeFindByIdAndDelete)(Model, schedule.contentId);
                    await this.sendNotifications(schedule, 'deleted');
                    await (0, mongooseHelper_1.castDocument)(schedule).markExecuted();
                    return;
                default:
                    throw new Error(`Unknown action: ${schedule.action}`);
            }
            await (0, mongooseHelper_1.safeFindByIdAndUpdate)(Model, schedule.contentId, updateData);
            await this.sendNotifications(schedule, schedule.action);
            await schedule.markExecuted();
        }
        catch (error) {
            throw error;
        }
    }
    static async getScheduledActions(contentId, contentType, userId, status = 'pending', limit = 20, offset = 0) {
        try {
            const filter = { status };
            if (contentId && contentType) {
                filter.contentId = contentId;
                filter.contentType = contentType;
            }
            if (userId) {
                filter.createdBy = userId;
            }
            const schedules = await ContentSchedule_1.default.find(filter)
                .sort({ scheduledAt: 1 })
                .limit(limit)
                .skip(offset)
                .populate('contentId')
                .populate('createdBy', 'username email firstName lastName')
                .populate('metadata.notifyUsers', 'username email firstName lastName');
            const total = await ContentSchedule_1.default.countDocuments(filter);
            return {
                schedules,
                total,
                hasMore: (offset + limit) < total
            };
        }
        catch (error) {
            throw new Error(`Failed to get scheduled actions: ${error.message}`);
        }
    }
    static async cancelSchedule(scheduleId, userId) {
        try {
            const schedule = await ContentSchedule_1.default.findById(scheduleId);
            if (!schedule) {
                throw new Error('Schedule not found');
            }
            if (schedule.status !== 'pending') {
                throw new Error('Can only cancel pending schedules');
            }
            await (0, mongooseHelper_1.castDocument)(schedule).cancel();
            if (schedule.action === 'publish') {
                const Model = schedule.contentType === 'post' ? Post_1.default : Page_1.default;
                await (0, mongooseHelper_1.safeFindByIdAndUpdate)(Model, schedule.contentId, {
                    status: schedule.metadata.originalStatus || 'draft',
                    scheduledAt: null
                });
            }
            return schedule;
        }
        catch (error) {
            throw new Error(`Failed to cancel schedule: ${error.message}`);
        }
    }
    static async updateSchedule(scheduleId, updates, userId) {
        try {
            const schedule = await ContentSchedule_1.default.findById(scheduleId);
            if (!schedule) {
                throw new Error('Schedule not found');
            }
            if (schedule.status !== 'pending') {
                throw new Error('Can only update pending schedules');
            }
            if (updates.scheduledAt) {
                if (updates.scheduledAt <= new Date()) {
                    throw new Error('Scheduled time must be in the future');
                }
                schedule.scheduledAt = updates.scheduledAt;
            }
            if (updates.action) {
                schedule.action = updates.action;
            }
            if (updates.notifyUsers) {
                schedule.metadata.notifyUsers = updates.notifyUsers;
            }
            if (updates.emailNotification !== undefined) {
                schedule.metadata.emailNotification = updates.emailNotification;
            }
            if (updates.socialMediaPost !== undefined) {
                schedule.metadata.socialMediaPost = updates.socialMediaPost;
            }
            await schedule.save();
            if (schedule.action === 'publish' && updates.scheduledAt) {
                const Model = schedule.contentType === 'post' ? Post_1.default : Page_1.default;
                await (0, mongooseHelper_1.safeFindByIdAndUpdate)(Model, schedule.contentId, {
                    scheduledAt: updates.scheduledAt
                });
            }
            return schedule;
        }
        catch (error) {
            throw new Error(`Failed to update schedule: ${error.message}`);
        }
    }
    static async getSchedulingStats(userId) {
        try {
            const filter = userId ? { createdBy: userId } : {};
            const stats = await ContentSchedule_1.default.aggregate([
                { $match: filter },
                {
                    $group: {
                        _id: '$status',
                        count: { $sum: 1 }
                    }
                }
            ]);
            const result = {
                pending: 0,
                executed: 0,
                failed: 0,
                cancelled: 0
            };
            stats.forEach(stat => {
                result[stat._id] = stat.count;
            });
            const upcomingCount = await ContentSchedule_1.default.countDocuments({
                ...filter,
                status: 'pending',
                scheduledAt: {
                    $gte: new Date(),
                    $lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                }
            });
            return {
                ...result,
                upcoming: upcomingCount
            };
        }
        catch (error) {
            throw new Error(`Failed to get scheduling stats: ${error.message}`);
        }
    }
    static async cancelPendingSchedules(contentId, contentType) {
        try {
            await ContentSchedule_1.default.updateMany({
                contentId,
                contentType,
                status: 'pending'
            }, {
                status: 'cancelled'
            });
        }
        catch (error) {
            console.error('Failed to cancel pending schedules:', error);
        }
    }
    static async sendNotifications(schedule, action) {
        try {
            if (schedule.metadata.notifyUsers && schedule.metadata.notifyUsers.length > 0) {
                const notificationData = {
                    title: `Content ${action}`,
                    message: `${schedule.contentType} "${schedule.contentId.title}" has been ${action}`,
                    type: 'info',
                    relatedId: schedule.contentId._id,
                    relatedType: schedule.contentType
                };
                for (const userId of schedule.metadata.notifyUsers) {
                    await notificationService_1.default.createNotification({
                        notification: {
                            ...notificationData,
                            recipient: userId,
                            category: 'content_change'
                        }
                    });
                }
            }
        }
        catch (error) {
            console.error('Failed to send notifications:', error);
        }
    }
    static async cleanupOldSchedules(daysToKeep = 30) {
        try {
            const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);
            const result = await ContentSchedule_1.default.deleteMany({
                status: { $in: ['executed', 'failed', 'cancelled'] },
                updatedAt: { $lt: cutoffDate }
            });
            return result.deletedCount;
        }
        catch (error) {
            throw new Error(`Failed to cleanup schedules: ${error.message}`);
        }
    }
}
exports.ContentSchedulingService = ContentSchedulingService;
exports.default = ContentSchedulingService;
