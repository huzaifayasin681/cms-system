import { Response } from 'express';
import Activity from '../models/Activity';
import { AuthRequest } from '../middleware/auth';

// Get recent activities for dashboard
export const getRecentActivities = async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const type = req.query.type as string;
    const skip = (page - 1) * limit;

    // Build query
    const query: any = {};
    if (type) {
      query.type = type;
    }

    // Get activities with pagination
    const activities = await Activity.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Get total count for pagination
    const total = await Activity.countDocuments(query);

    // Format activities for frontend
    const formattedActivities = activities.map(activity => ({
      id: activity._id,
      type: activity.type,
      title: activity.entityTitle || `${activity.type} ${activity.action}`,
      action: activity.action,
      timestamp: formatTimestamp(activity.createdAt),
      user: activity.userDetails.firstName && activity.userDetails.lastName 
        ? `${activity.userDetails.firstName} ${activity.userDetails.lastName}`
        : activity.userDetails.username,
      entityId: activity.entityId,
      createdAt: activity.createdAt
    }));

    res.json({
      success: true,
      data: {
        activities: formattedActivities,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get recent activities error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch recent activities',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
};

// Log activity (helper function used by other controllers)
export const logActivity = async (data: {
  type: 'post' | 'page' | 'media' | 'user' | 'comment' | 'login' | 'logout';
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
}) => {
  try {
    const activity = new Activity(data);
    await activity.save();
    return activity;
  } catch (error) {
    console.error('Log activity error:', error);
    // Don't throw error, just log it - activity logging shouldn't break main functionality
  }
};

// Get activity statistics
export const getActivityStats = async (req: AuthRequest, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get activity counts by type
    const activityStats = await Activity.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    // Get activity timeline (daily counts)
    const activityTimeline = await Activity.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$createdAt'
            }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id': 1 }
      }
    ]);

    res.json({
      success: true,
      data: {
        activityStats,
        activityTimeline,
        period: days
      }
    });
  } catch (error) {
    console.error('Get activity stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch activity statistics',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
};

// Helper function to format timestamps
const formatTimestamp = (date: Date): string => {
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);

  if (diffInMinutes < 1) {
    return 'just now';
  } else if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes === 1 ? '' : 's'} ago`;
  } else if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours === 1 ? '' : 's'} ago`;
  } else if (diffInDays < 7) {
    return `${diffInDays} day${diffInDays === 1 ? '' : 's'} ago`;
  } else {
    return date.toLocaleDateString();
  }
};