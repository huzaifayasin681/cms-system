import mongoose from 'mongoose';
import ContentSchedule from '../models/ContentSchedule';
import Post from '../models/Post';
import Page from '../models/Page';
import { NotificationService } from './notificationService';

export interface IScheduleOptions {
  scheduledAt: Date;
  action: 'publish' | 'unpublish' | 'archive' | 'delete';
  targetStatus: string;
  notifyUsers: mongoose.Types.ObjectId[];
  emailNotification: boolean;
  socialMediaPost: boolean;
}

export class ContentSchedulingService {
  /**
   * Schedule a content action
   */
  static async scheduleAction(
    contentId: mongoose.Types.ObjectId,
    contentType: 'post' | 'page',
    userId: mongoose.Types.ObjectId,
    options: IScheduleOptions
  ) {
    try {
      // Validate that the content exists
      const Model = contentType === 'post' ? Post : Page;
      const content = await Model.findById(contentId);
      
      if (!content) {
        throw new Error(`${contentType} not found`);
      }

      // Cancel any existing pending schedules for the same content
      await this.cancelPendingSchedules(contentId, contentType);

      // Create new schedule
      const schedule = new ContentSchedule({
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

      // Update content status to 'scheduled' if publishing
      if (options.action === 'publish') {
        await Model.findByIdAndUpdate(contentId, {
          status: 'scheduled',
          scheduledAt: options.scheduledAt
        });
      }

      return schedule;
    } catch (error) {
      throw new Error(`Failed to schedule action: ${error.message}`);
    }
  }

  /**
   * Execute due schedules
   */
  static async executeDueSchedules() {
    try {
      const dueSchedules = await ContentSchedule.find({
        status: 'pending',
        scheduledAt: { $lte: new Date() },
        $expr: { $lt: ['$retryCount', '$maxRetries'] }
      }).populate('contentId').populate('createdBy');

      const results = {
        executed: 0,
        failed: 0,
        errors: [] as string[]
      };

      for (const schedule of dueSchedules) {
        try {
          await this.executeSchedule(schedule);
          results.executed++;
        } catch (error) {
          await schedule.markFailed(error.message);
          results.failed++;
          results.errors.push(`Schedule ${schedule._id}: ${error.message}`);
        }
      }

      return results;
    } catch (error) {
      throw new Error(`Failed to execute schedules: ${error.message}`);
    }
  }

  /**
   * Execute a single schedule
   */
  static async executeSchedule(schedule: any) {
    try {
      const Model = schedule.contentType === 'post' ? Post : Page;
      const content = await Model.findById(schedule.contentId);

      if (!content) {
        throw new Error(`${schedule.contentType} not found`);
      }

      let updateData: any = {};

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
          await Model.findByIdAndDelete(schedule.contentId);
          await this.sendNotifications(schedule, 'deleted');
          await schedule.markExecuted();
          return;

        default:
          throw new Error(`Unknown action: ${schedule.action}`);
      }

      // Update the content
      await Model.findByIdAndUpdate(schedule.contentId, updateData);

      // Send notifications
      await this.sendNotifications(schedule, schedule.action);

      // Mark schedule as executed
      await schedule.markExecuted();

    } catch (error) {
      throw error;
    }
  }

  /**
   * Get scheduled actions for content
   */
  static async getScheduledActions(
    contentId?: mongoose.Types.ObjectId,
    contentType?: 'post' | 'page',
    userId?: mongoose.Types.ObjectId,
    status: string = 'pending',
    limit: number = 20,
    offset: number = 0
  ) {
    try {
      const filter: any = { status };

      if (contentId && contentType) {
        filter.contentId = contentId;
        filter.contentType = contentType;
      }

      if (userId) {
        filter.createdBy = userId;
      }

      const schedules = await ContentSchedule.find(filter)
        .sort({ scheduledAt: 1 })
        .limit(limit)
        .skip(offset)
        .populate('contentId')
        .populate('createdBy', 'username email firstName lastName')
        .populate('metadata.notifyUsers', 'username email firstName lastName');

      const total = await ContentSchedule.countDocuments(filter);

      return {
        schedules,
        total,
        hasMore: (offset + limit) < total
      };
    } catch (error) {
      throw new Error(`Failed to get scheduled actions: ${error.message}`);
    }
  }

  /**
   * Cancel a scheduled action
   */
  static async cancelSchedule(scheduleId: mongoose.Types.ObjectId, userId: mongoose.Types.ObjectId) {
    try {
      const schedule = await ContentSchedule.findById(scheduleId);
      
      if (!schedule) {
        throw new Error('Schedule not found');
      }

      if (schedule.status !== 'pending') {
        throw new Error('Can only cancel pending schedules');
      }

      await schedule.cancel();

      // Reset content status if it was scheduled for publishing
      if (schedule.action === 'publish') {
        const Model = schedule.contentType === 'post' ? Post : Page;
        await Model.findByIdAndUpdate(schedule.contentId, {
          status: schedule.metadata.originalStatus || 'draft',
          scheduledAt: null
        });
      }

      return schedule;
    } catch (error) {
      throw new Error(`Failed to cancel schedule: ${error.message}`);
    }
  }

  /**
   * Update scheduled action
   */
  static async updateSchedule(
    scheduleId: mongoose.Types.ObjectId,
    updates: {
      scheduledAt?: Date;
      action?: 'publish' | 'unpublish' | 'archive' | 'delete';
      notifyUsers?: mongoose.Types.ObjectId[];
      emailNotification?: boolean;
      socialMediaPost?: boolean;
    },
    userId: mongoose.Types.ObjectId
  ) {
    try {
      const schedule = await ContentSchedule.findById(scheduleId);
      
      if (!schedule) {
        throw new Error('Schedule not found');
      }

      if (schedule.status !== 'pending') {
        throw new Error('Can only update pending schedules');
      }

      // Update fields
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

      // Update content scheduledAt if action is publish
      if (schedule.action === 'publish' && updates.scheduledAt) {
        const Model = schedule.contentType === 'post' ? Post : Page;
        await Model.findByIdAndUpdate(schedule.contentId, {
          scheduledAt: updates.scheduledAt
        });
      }

      return schedule;
    } catch (error) {
      throw new Error(`Failed to update schedule: ${error.message}`);
    }
  }

  /**
   * Get scheduling statistics
   */
  static async getSchedulingStats(userId?: mongoose.Types.ObjectId) {
    try {
      const filter = userId ? { createdBy: userId } : {};

      const stats = await ContentSchedule.aggregate([
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
        result[stat._id as keyof typeof result] = stat.count;
      });

      // Get upcoming schedules (next 7 days)
      const upcomingCount = await ContentSchedule.countDocuments({
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
    } catch (error) {
      throw new Error(`Failed to get scheduling stats: ${error.message}`);
    }
  }

  /**
   * Private helper methods
   */
  private static async cancelPendingSchedules(
    contentId: mongoose.Types.ObjectId,
    contentType: 'post' | 'page'
  ) {
    try {
      await ContentSchedule.updateMany(
        {
          contentId,
          contentType,
          status: 'pending'
        },
        {
          status: 'cancelled'
        }
      );
    } catch (error) {
      console.error('Failed to cancel pending schedules:', error);
    }
  }

  private static async sendNotifications(schedule: any, action: string) {
    try {
      if (schedule.metadata.notifyUsers && schedule.metadata.notifyUsers.length > 0) {
        const notificationData = {
          title: `Content ${action}`,
          message: `${schedule.contentType} "${schedule.contentId.title}" has been ${action}`,
          type: 'info' as const,
          relatedId: schedule.contentId._id,
          relatedType: schedule.contentType
        };

        for (const userId of schedule.metadata.notifyUsers) {
          await NotificationService.createNotification({
            ...notificationData,
            userId
          });
        }
      }
    } catch (error) {
      console.error('Failed to send notifications:', error);
    }
  }

  /**
   * Cleanup old executed/failed schedules
   */
  static async cleanupOldSchedules(daysToKeep: number = 30) {
    try {
      const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);
      
      const result = await ContentSchedule.deleteMany({
        status: { $in: ['executed', 'failed', 'cancelled'] },
        updatedAt: { $lt: cutoffDate }
      });

      return result.deletedCount;
    } catch (error) {
      throw new Error(`Failed to cleanup schedules: ${error.message}`);
    }
  }
}

export default ContentSchedulingService;