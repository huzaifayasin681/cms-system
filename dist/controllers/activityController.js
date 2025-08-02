"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getActivityStats = exports.logActivity = exports.getRecentActivities = void 0;
const Activity_1 = __importDefault(require("../models/Activity"));
const getRecentActivities = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const type = req.query.type;
        const skip = (page - 1) * limit;
        const query = {};
        if (type) {
            query.type = type;
        }
        const activities = await Activity_1.default.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();
        const total = await Activity_1.default.countDocuments(query);
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
    }
    catch (error) {
        console.error('Get recent activities error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch recent activities',
            error: process.env.NODE_ENV === 'development' ? error : {}
        });
    }
};
exports.getRecentActivities = getRecentActivities;
const logActivity = async (data) => {
    try {
        const activity = new Activity_1.default(data);
        await activity.save();
        return activity;
    }
    catch (error) {
        console.error('Log activity error:', error);
    }
};
exports.logActivity = logActivity;
const getActivityStats = async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 30;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        const activityStats = await Activity_1.default.aggregate([
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
        const activityTimeline = await Activity_1.default.aggregate([
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
    }
    catch (error) {
        console.error('Get activity stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch activity statistics',
            error: process.env.NODE_ENV === 'development' ? error : {}
        });
    }
};
exports.getActivityStats = getActivityStats;
const formatTimestamp = (date) => {
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInMinutes < 1) {
        return 'just now';
    }
    else if (diffInMinutes < 60) {
        return `${diffInMinutes} minute${diffInMinutes === 1 ? '' : 's'} ago`;
    }
    else if (diffInHours < 24) {
        return `${diffInHours} hour${diffInHours === 1 ? '' : 's'} ago`;
    }
    else if (diffInDays < 7) {
        return `${diffInDays} day${diffInDays === 1 ? '' : 's'} ago`;
    }
    else {
        return date.toLocaleDateString();
    }
};
//# sourceMappingURL=activityController.js.map