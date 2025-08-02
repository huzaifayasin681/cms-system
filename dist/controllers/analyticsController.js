"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportAnalytics = exports.getSearchAnalytics = exports.getMediaAnalytics = exports.getUserAnalytics = exports.getTrafficAnalytics = exports.getContentPerformance = exports.getDashboardOverview = void 0;
const Post_1 = __importDefault(require("../models/Post"));
const Page_1 = __importDefault(require("../models/Page"));
const User_1 = __importDefault(require("../models/User"));
const Media_1 = __importDefault(require("../models/Media"));
const Analytics_1 = __importDefault(require("../models/Analytics"));
const getDashboardOverview = async (req, res) => {
    try {
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const [totalPosts, totalPages, totalUsers, totalMedia, publishedPosts, draftPosts, totalViews, totalLikes, postsThisMonth, postsThisWeek] = await Promise.all([
            Post_1.default.countDocuments(),
            Page_1.default.countDocuments(),
            User_1.default.countDocuments(),
            Media_1.default.countDocuments(),
            Post_1.default.countDocuments({ status: 'published' }),
            Post_1.default.countDocuments({ status: 'draft' }),
            Post_1.default.aggregate([{ $group: { _id: null, totalViews: { $sum: '$views' } } }]),
            Post_1.default.aggregate([{ $group: { _id: null, totalLikes: { $sum: { $size: '$likes' } } } }]),
            Post_1.default.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
            Post_1.default.countDocuments({ createdAt: { $gte: sevenDaysAgo } })
        ]);
        const previousThirtyDaysAgo = new Date(thirtyDaysAgo.getTime() - 30 * 24 * 60 * 60 * 1000);
        const previousSevenDaysAgo = new Date(sevenDaysAgo.getTime() - 7 * 24 * 60 * 60 * 1000);
        const [previousMonthPosts, previousWeekPosts, previousMonthViews, previousMonthUsers, previousMonthLikes] = await Promise.all([
            Post_1.default.countDocuments({ createdAt: { $gte: previousThirtyDaysAgo, $lt: thirtyDaysAgo } }),
            Post_1.default.countDocuments({ createdAt: { $gte: previousSevenDaysAgo, $lt: sevenDaysAgo } }),
            Post_1.default.aggregate([
                { $match: { publishedAt: { $gte: previousThirtyDaysAgo, $lt: thirtyDaysAgo } } },
                { $group: { _id: null, totalViews: { $sum: '$views' } } }
            ]),
            User_1.default.countDocuments({ createdAt: { $gte: previousThirtyDaysAgo, $lt: thirtyDaysAgo } }),
            Post_1.default.aggregate([
                { $match: { publishedAt: { $gte: previousThirtyDaysAgo, $lt: thirtyDaysAgo } } },
                { $group: { _id: null, totalLikes: { $sum: { $size: '$likes' } } } }
            ])
        ]);
        const currentMonthViews = await Post_1.default.aggregate([
            { $match: { publishedAt: { $gte: thirtyDaysAgo } } },
            { $group: { _id: null, totalViews: { $sum: '$views' } } }
        ]);
        const currentMonthUsers = await User_1.default.countDocuments({ createdAt: { $gte: thirtyDaysAgo } });
        const currentMonthLikes = await Post_1.default.aggregate([
            { $match: { publishedAt: { $gte: thirtyDaysAgo } } },
            { $group: { _id: null, totalLikes: { $sum: { $size: '$likes' } } } }
        ]);
        const postsGrowth = previousMonthPosts > 0 ? ((postsThisMonth - previousMonthPosts) / previousMonthPosts) * 100 : 0;
        const viewsGrowth = (previousMonthViews[0]?.totalViews || 0) > 0 ?
            (((currentMonthViews[0]?.totalViews || 0) - (previousMonthViews[0]?.totalViews || 0)) / (previousMonthViews[0]?.totalViews || 1)) * 100 : 0;
        const usersGrowth = previousMonthUsers > 0 ? ((currentMonthUsers - previousMonthUsers) / previousMonthUsers) * 100 : 0;
        const likesGrowth = (previousMonthLikes[0]?.totalLikes || 0) > 0 ?
            (((currentMonthLikes[0]?.totalLikes || 0) - (previousMonthLikes[0]?.totalLikes || 0)) / (previousMonthLikes[0]?.totalLikes || 1)) * 100 : 0;
        res.json({
            success: true,
            data: {
                overview: {
                    totalPosts,
                    totalPages,
                    totalUsers,
                    totalMedia,
                    publishedPosts,
                    draftPosts,
                    totalViews: totalViews[0]?.totalViews || 0,
                    totalLikes: totalLikes[0]?.totalLikes || 0,
                    postsThisMonth,
                    postsThisWeek
                },
                growth: {
                    posts: {
                        value: Math.round(postsGrowth * 10) / 10,
                        trend: postsGrowth > 0 ? 'up' : postsGrowth < 0 ? 'down' : 'stable'
                    },
                    views: {
                        value: Math.round(viewsGrowth * 10) / 10,
                        trend: viewsGrowth > 0 ? 'up' : viewsGrowth < 0 ? 'down' : 'stable'
                    },
                    users: {
                        value: Math.round(usersGrowth * 10) / 10,
                        trend: usersGrowth > 0 ? 'up' : usersGrowth < 0 ? 'down' : 'stable'
                    },
                    likes: {
                        value: Math.round(likesGrowth * 10) / 10,
                        trend: likesGrowth > 0 ? 'up' : likesGrowth < 0 ? 'down' : 'stable'
                    }
                }
            }
        });
    }
    catch (error) {
        console.error('Dashboard overview error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching dashboard overview'
        });
    }
};
exports.getDashboardOverview = getDashboardOverview;
const getContentPerformance = async (req, res) => {
    try {
        const { period = '30' } = req.query;
        const days = parseInt(period);
        const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        const topPostsByViews = await Post_1.default.find({
            status: 'published',
            publishedAt: { $gte: startDate }
        })
            .select('title slug views likes publishedAt author')
            .populate('author', 'username firstName lastName')
            .sort({ views: -1 })
            .limit(10);
        const topPostsByLikes = await Post_1.default.aggregate([
            {
                $match: {
                    status: 'published',
                    publishedAt: { $gte: startDate }
                }
            },
            {
                $addFields: {
                    likesCount: { $size: '$likes' }
                }
            },
            { $sort: { likesCount: -1 } },
            { $limit: 10 },
            {
                $lookup: {
                    from: 'users',
                    localField: 'author',
                    foreignField: '_id',
                    as: 'author'
                }
            },
            { $unwind: '$author' },
            {
                $project: {
                    title: 1,
                    slug: 1,
                    views: 1,
                    likes: 1,
                    publishedAt: 1,
                    'author.username': 1,
                    'author.firstName': 1,
                    'author.lastName': 1
                }
            }
        ]);
        const categoryStats = await Post_1.default.aggregate([
            { $match: { status: 'published', publishedAt: { $gte: startDate } } },
            { $unwind: '$categories' },
            {
                $group: {
                    _id: '$categories',
                    postCount: { $sum: 1 },
                    totalViews: { $sum: '$views' },
                    totalLikes: { $sum: { $size: '$likes' } },
                    avgViews: { $avg: '$views' }
                }
            },
            { $sort: { totalViews: -1 } },
            { $limit: 10 }
        ]);
        const tagStats = await Post_1.default.aggregate([
            { $match: { status: 'published', publishedAt: { $gte: startDate } } },
            { $unwind: '$tags' },
            {
                $group: {
                    _id: '$tags',
                    postCount: { $sum: 1 },
                    totalViews: { $sum: '$views' },
                    totalLikes: { $sum: { $size: '$likes' } }
                }
            },
            { $sort: { totalViews: -1 } },
            { $limit: 15 }
        ]);
        res.json({
            success: true,
            data: {
                topPostsByViews,
                topPostsByLikes,
                categoryStats,
                tagStats,
                period: days
            }
        });
    }
    catch (error) {
        console.error('Content performance error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching content performance'
        });
    }
};
exports.getContentPerformance = getContentPerformance;
const getTrafficAnalytics = async (req, res) => {
    try {
        const { period = '30' } = req.query;
        const days = parseInt(period);
        const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        const dailyViews = await Post_1.default.aggregate([
            { $match: { status: 'published', publishedAt: { $gte: startDate } } },
            {
                $group: {
                    _id: {
                        $dateToString: { format: '%Y-%m-%d', date: '$publishedAt' }
                    },
                    views: { $sum: '$views' },
                    posts: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);
        const filledDailyViews = [];
        const currentDate = new Date(startDate);
        const endDate = new Date();
        while (currentDate <= endDate) {
            const dateString = currentDate.toISOString().split('T')[0];
            const existingData = dailyViews.find(item => item._id === dateString);
            filledDailyViews.push({
                date: dateString,
                views: existingData?.views || 0,
                posts: existingData?.posts || 0
            });
            currentDate.setDate(currentDate.getDate() + 1);
        }
        const popularContent = await Post_1.default.find({
            status: 'published',
            publishedAt: { $gte: startDate }
        })
            .select('title slug views publishedAt')
            .sort({ views: -1 })
            .limit(5);
        const trafficSourcesRaw = await Analytics_1.default.aggregate([
            {
                $match: {
                    eventType: { $in: ['page_view', 'post_view'] },
                    timestamp: { $gte: startDate }
                }
            },
            {
                $addFields: {
                    trafficSource: {
                        $cond: {
                            if: { $or: [{ $eq: ['$referrer', null] }, { $eq: ['$referrer', ''] }] },
                            then: 'Direct',
                            else: {
                                $cond: {
                                    if: { $regexMatch: { input: '$referrer', regex: /google|bing|yahoo|duckduckgo/i } },
                                    then: 'Search Engines',
                                    else: {
                                        $cond: {
                                            if: { $regexMatch: { input: '$referrer', regex: /facebook|twitter|instagram|linkedin|youtube/i } },
                                            then: 'Social Media',
                                            else: 'Referrals'
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            {
                $group: {
                    _id: '$trafficSource',
                    visits: { $sum: 1 }
                }
            },
            { $sort: { visits: -1 } }
        ]);
        const totalTrafficVisits = trafficSourcesRaw.reduce((sum, source) => sum + source.visits, 0);
        const trafficSources = trafficSourcesRaw.map(source => ({
            source: source._id,
            visits: source.visits,
            percentage: totalTrafficVisits > 0 ? Math.round((source.visits / totalTrafficVisits) * 100 * 10) / 10 : 0
        }));
        res.json({
            success: true,
            data: {
                dailyViews: filledDailyViews,
                popularContent,
                trafficSources,
                period: days,
                totalViews: filledDailyViews.reduce((sum, day) => sum + day.views, 0)
            }
        });
    }
    catch (error) {
        console.error('Traffic analytics error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching traffic analytics'
        });
    }
};
exports.getTrafficAnalytics = getTrafficAnalytics;
const getUserAnalytics = async (req, res) => {
    try {
        const { period = '30' } = req.query;
        const days = parseInt(period);
        const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        const userRegistrations = await User_1.default.aggregate([
            { $match: { createdAt: { $gte: startDate } } },
            {
                $group: {
                    _id: {
                        $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
                    },
                    registrations: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);
        const userRoles = await User_1.default.aggregate([
            {
                $group: {
                    _id: '$role',
                    count: { $sum: 1 }
                }
            }
        ]);
        const activeUsers = await User_1.default.aggregate([
            {
                $lookup: {
                    from: 'posts',
                    localField: '_id',
                    foreignField: 'author',
                    as: 'posts'
                }
            },
            {
                $match: {
                    'posts.0': { $exists: true },
                    'posts.createdAt': { $gte: startDate }
                }
            },
            {
                $project: {
                    username: 1,
                    firstName: 1,
                    lastName: 1,
                    avatar: 1,
                    postCount: { $size: '$posts' },
                    totalViews: { $sum: '$posts.views' },
                    totalLikes: { $sum: { $map: { input: '$posts', as: 'post', in: { $size: '$$post.likes' } } } }
                }
            },
            { $sort: { postCount: -1 } },
            { $limit: 10 }
        ]);
        res.json({
            success: true,
            data: {
                userRegistrations,
                userRoles,
                activeUsers,
                period: days
            }
        });
    }
    catch (error) {
        console.error('User analytics error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching user analytics'
        });
    }
};
exports.getUserAnalytics = getUserAnalytics;
const getMediaAnalytics = async (req, res) => {
    try {
        const { period = '30' } = req.query;
        const days = parseInt(period);
        const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        const mediaUploads = await Media_1.default.aggregate([
            { $match: { uploadedAt: { $gte: startDate } } },
            {
                $group: {
                    _id: {
                        $dateToString: { format: '%Y-%m-%d', date: '$uploadedAt' }
                    },
                    count: { $sum: 1 },
                    totalSize: { $sum: '$size' }
                }
            },
            { $sort: { _id: 1 } }
        ]);
        const mediaTypes = await Media_1.default.aggregate([
            {
                $group: {
                    _id: '$type',
                    count: { $sum: 1 },
                    totalSize: { $sum: '$size' }
                }
            },
            { $sort: { count: -1 } }
        ]);
        const storageStats = await Media_1.default.aggregate([
            {
                $group: {
                    _id: null,
                    totalFiles: { $sum: 1 },
                    totalSize: { $sum: '$size' },
                    avgSize: { $avg: '$size' }
                }
            }
        ]);
        const popularMedia = await Media_1.default.find({
            uploadedAt: { $gte: startDate }
        })
            .select('filename originalName size type url uploadedAt')
            .sort({ createdAt: -1 })
            .limit(10);
        res.json({
            success: true,
            data: {
                mediaUploads,
                mediaTypes,
                storageStats: storageStats[0] || { totalFiles: 0, totalSize: 0, avgSize: 0 },
                popularMedia,
                period: days
            }
        });
    }
    catch (error) {
        console.error('Media analytics error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching media analytics'
        });
    }
};
exports.getMediaAnalytics = getMediaAnalytics;
const getSearchAnalytics = async (req, res) => {
    try {
        const { period = '30' } = req.query;
        const days = parseInt(period);
        const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        const previousPeriodStart = new Date(startDate.getTime() - days * 24 * 60 * 60 * 1000);
        const searchTermsRaw = await Analytics_1.default.aggregate([
            {
                $match: {
                    eventType: 'search',
                    timestamp: { $gte: startDate },
                    'metadata.searchTerm': { $exists: true, $ne: '' }
                }
            },
            {
                $group: {
                    _id: '$metadata.searchTerm',
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ]);
        const previousSearchTerms = await Analytics_1.default.aggregate([
            {
                $match: {
                    eventType: 'search',
                    timestamp: { $gte: previousPeriodStart, $lt: startDate },
                    'metadata.searchTerm': { $exists: true, $ne: '' }
                }
            },
            {
                $group: {
                    _id: '$metadata.searchTerm',
                    count: { $sum: 1 }
                }
            }
        ]);
        const previousSearchMap = new Map(previousSearchTerms.map(item => [item._id, item.count]));
        const searchTerms = searchTermsRaw.map(term => {
            const previousCount = previousSearchMap.get(term._id) || 0;
            let trend = 'stable';
            if (previousCount === 0 && term.count > 0) {
                trend = 'up';
            }
            else if (previousCount > 0) {
                const change = ((term.count - previousCount) / previousCount) * 100;
                if (change > 10)
                    trend = 'up';
                else if (change < -10)
                    trend = 'down';
            }
            return {
                term: term._id,
                count: term.count,
                trend
            };
        });
        const searchResults = await Post_1.default.aggregate([
            { $match: { status: 'published' } },
            {
                $project: {
                    title: 1,
                    slug: 1,
                    views: 1,
                    searchScore: {
                        $add: [
                            { $multiply: ['$views', 0.6] },
                            { $multiply: [{ $size: '$likes' }, 0.4] }
                        ]
                    }
                }
            },
            { $sort: { searchScore: -1 } },
            { $limit: 10 }
        ]);
        res.json({
            success: true,
            data: {
                searchTerms,
                searchResults,
                totalSearches: searchTerms.reduce((sum, term) => sum + term.count, 0)
            }
        });
    }
    catch (error) {
        console.error('Search analytics error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching search analytics'
        });
    }
};
exports.getSearchAnalytics = getSearchAnalytics;
const exportAnalytics = async (req, res) => {
    try {
        const { period = '30', format = 'json' } = req.query;
        const days = parseInt(period);
        const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        const [overviewData, contentData, trafficData, userData, mediaData] = await Promise.all([
            getDashboardOverviewData(startDate),
            getContentPerformanceData(startDate),
            getTrafficAnalyticsData(startDate),
            getUserAnalyticsData(startDate),
            getMediaAnalyticsData(startDate)
        ]);
        const report = {
            generatedAt: new Date().toISOString(),
            period: `${days} days`,
            dateRange: {
                start: startDate.toISOString(),
                end: new Date().toISOString()
            },
            overview: overviewData,
            content: contentData,
            traffic: trafficData,
            users: userData,
            media: mediaData
        };
        if (format === 'csv') {
            const csvData = convertToCSV(report);
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="analytics-report-${Date.now()}.csv"`);
            return res.send(csvData);
        }
        res.json({
            success: true,
            data: report
        });
    }
    catch (error) {
        console.error('Export analytics error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error exporting analytics'
        });
    }
};
exports.exportAnalytics = exportAnalytics;
async function getDashboardOverviewData(startDate) {
    const [totalPosts, publishedPosts, totalViews, totalLikes] = await Promise.all([
        Post_1.default.countDocuments(),
        Post_1.default.countDocuments({ status: 'published' }),
        Post_1.default.aggregate([{ $group: { _id: null, totalViews: { $sum: '$views' } } }]),
        Post_1.default.aggregate([{ $group: { _id: null, totalLikes: { $sum: { $size: '$likes' } } } }])
    ]);
    return {
        totalPosts,
        publishedPosts,
        totalViews: totalViews[0]?.totalViews || 0,
        totalLikes: totalLikes[0]?.totalLikes || 0
    };
}
async function getContentPerformanceData(startDate) {
    const topPosts = await Post_1.default.find({
        status: 'published',
        publishedAt: { $gte: startDate }
    })
        .select('title views likes')
        .sort({ views: -1 })
        .limit(5);
    return { topPosts };
}
async function getTrafficAnalyticsData(startDate) {
    const totalViews = await Post_1.default.aggregate([
        { $match: { status: 'published', publishedAt: { $gte: startDate } } },
        { $group: { _id: null, totalViews: { $sum: '$views' } } }
    ]);
    return {
        totalViews: totalViews[0]?.totalViews || 0
    };
}
async function getUserAnalyticsData(startDate) {
    const totalUsers = await User_1.default.countDocuments();
    const newUsers = await User_1.default.countDocuments({ createdAt: { $gte: startDate } });
    return { totalUsers, newUsers };
}
async function getMediaAnalyticsData(startDate) {
    const totalMedia = await Media_1.default.countDocuments();
    const storageUsed = await Media_1.default.aggregate([
        { $group: { _id: null, totalSize: { $sum: '$size' } } }
    ]);
    return {
        totalMedia,
        storageUsed: storageUsed[0]?.totalSize || 0
    };
}
function convertToCSV(data) {
    const headers = ['Metric', 'Value'];
    const rows = [
        ['Total Posts', data.overview.totalPosts],
        ['Published Posts', data.overview.publishedPosts],
        ['Total Views', data.overview.totalViews],
        ['Total Likes', data.overview.totalLikes],
        ['Total Users', data.users.totalUsers],
        ['New Users', data.users.newUsers],
        ['Total Media Files', data.media.totalMedia],
        ['Storage Used (bytes)', data.media.storageUsed]
    ];
    return [headers, ...rows].map(row => row.join(',')).join('\n');
}
//# sourceMappingURL=analyticsController.js.map