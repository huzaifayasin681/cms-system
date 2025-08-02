import { Request, Response } from 'express';
import Post from '../models/Post';
import Page from '../models/Page';
import User from '../models/User';
import Media from '../models/Media';
import AnalyticsEvent from '../models/Analytics';
import { AuthRequest } from '../middleware/auth';

// Dashboard Overview Analytics
export const getDashboardOverview = async (req: AuthRequest, res: Response) => {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Get total counts
    const [
      totalPosts,
      totalPages,
      totalUsers,
      totalMedia,
      publishedPosts,
      draftPosts,
      totalViews,
      totalLikes,
      postsThisMonth,
      postsThisWeek
    ] = await Promise.all([
      Post.countDocuments(),
      Page.countDocuments(),
      User.countDocuments(),
      Media.countDocuments(),
      Post.countDocuments({ status: 'published' }),
      Post.countDocuments({ status: 'draft' }),
      Post.aggregate([{ $group: { _id: null, totalViews: { $sum: '$views' } } }]),
      Post.aggregate([{ $group: { _id: null, totalLikes: { $sum: { $size: '$likes' } } } }]),
      Post.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
      Post.countDocuments({ createdAt: { $gte: sevenDaysAgo } })
    ]);

    // Calculate real growth percentages
    const previousThirtyDaysAgo = new Date(thirtyDaysAgo.getTime() - 30 * 24 * 60 * 60 * 1000);
    const previousSevenDaysAgo = new Date(sevenDaysAgo.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const [previousMonthPosts, previousWeekPosts, previousMonthViews, previousMonthUsers, previousMonthLikes] = await Promise.all([
      Post.countDocuments({ createdAt: { $gte: previousThirtyDaysAgo, $lt: thirtyDaysAgo } }),
      Post.countDocuments({ createdAt: { $gte: previousSevenDaysAgo, $lt: sevenDaysAgo } }),
      Post.aggregate([
        { $match: { publishedAt: { $gte: previousThirtyDaysAgo, $lt: thirtyDaysAgo } } },
        { $group: { _id: null, totalViews: { $sum: '$views' } } }
      ]),
      User.countDocuments({ createdAt: { $gte: previousThirtyDaysAgo, $lt: thirtyDaysAgo } }),
      Post.aggregate([
        { $match: { publishedAt: { $gte: previousThirtyDaysAgo, $lt: thirtyDaysAgo } } },
        { $group: { _id: null, totalLikes: { $sum: { $size: '$likes' } } } }
      ])
    ]);

    const currentMonthViews = await Post.aggregate([
      { $match: { publishedAt: { $gte: thirtyDaysAgo } } },
      { $group: { _id: null, totalViews: { $sum: '$views' } } }
    ]);

    const currentMonthUsers = await User.countDocuments({ createdAt: { $gte: thirtyDaysAgo } });
    
    const currentMonthLikes = await Post.aggregate([
      { $match: { publishedAt: { $gte: thirtyDaysAgo } } },
      { $group: { _id: null, totalLikes: { $sum: { $size: '$likes' } } } }
    ]);

    // Calculate growth percentages
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

  } catch (error) {
    console.error('Dashboard overview error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching dashboard overview'
    });
  }
};

// Content Performance Analytics
export const getContentPerformance = async (req: AuthRequest, res: Response) => {
  try {
    const { period = '30' } = req.query;
    const days = parseInt(period as string);
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Top performing posts by views
    const topPostsByViews = await Post.find({ 
      status: 'published',
      publishedAt: { $gte: startDate }
    })
    .select('title slug views likes publishedAt author')
    .populate('author', 'username firstName lastName')
    .sort({ views: -1 })
    .limit(10);

    // Top performing posts by likes
    const topPostsByLikes = await Post.aggregate([
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

    // Content categories performance
    const categoryStats = await Post.aggregate([
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

    // Tags performance
    const tagStats = await Post.aggregate([
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

  } catch (error) {
    console.error('Content performance error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching content performance'
    });
  }
};

// Traffic Analytics
export const getTrafficAnalytics = async (req: AuthRequest, res: Response) => {
  try {
    const { period = '30' } = req.query;
    const days = parseInt(period as string);
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Daily views trend
    const dailyViews = await Post.aggregate([
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

    // Fill in missing dates with zero values
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

    // Popular content by views
    const popularContent = await Post.find({ 
      status: 'published',
      publishedAt: { $gte: startDate }
    })
    .select('title slug views publishedAt')
    .sort({ views: -1 })
    .limit(5);

    // Traffic sources from real analytics data
    const trafficSourcesRaw = await AnalyticsEvent.aggregate([
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

  } catch (error) {
    console.error('Traffic analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching traffic analytics'
    });
  }
};

// User Analytics
export const getUserAnalytics = async (req: AuthRequest, res: Response) => {
  try {
    const { period = '30' } = req.query;
    const days = parseInt(period as string);
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // User registrations over time
    const userRegistrations = await User.aggregate([
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

    // User roles distribution
    const userRoles = await User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 }
        }
      }
    ]);

    // Active users (users who have created content)
    const activeUsers = await User.aggregate([
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

  } catch (error) {
    console.error('User analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching user analytics'
    });
  }
};

// Media Analytics
export const getMediaAnalytics = async (req: AuthRequest, res: Response) => {
  try {
    const { period = '30' } = req.query;
    const days = parseInt(period as string);
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Media uploads over time
    const mediaUploads = await Media.aggregate([
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

    // Media types distribution
    const mediaTypes = await Media.aggregate([
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          totalSize: { $sum: '$size' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Storage usage
    const storageStats = await Media.aggregate([
      {
        $group: {
          _id: null,
          totalFiles: { $sum: 1 },
          totalSize: { $sum: '$size' },
          avgSize: { $avg: '$size' }
        }
      }
    ]);

    // Popular media (by usage in posts)
    const popularMedia = await Media.find({
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

  } catch (error) {
    console.error('Media analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching media analytics'
    });
  }
};

// Search Analytics
export const getSearchAnalytics = async (req: AuthRequest, res: Response) => {
  try {
    const { period = '30' } = req.query;
    const days = parseInt(period as string);
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const previousPeriodStart = new Date(startDate.getTime() - days * 24 * 60 * 60 * 1000);

    // Most searched terms from real analytics data
    const searchTermsRaw = await AnalyticsEvent.aggregate([
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

    // Get previous period data to calculate trends
    const previousSearchTerms = await AnalyticsEvent.aggregate([
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

    // Calculate trends
    const previousSearchMap = new Map(previousSearchTerms.map(item => [item._id, item.count]));
    const searchTerms = searchTermsRaw.map(term => {
      const previousCount = previousSearchMap.get(term._id) || 0;
      let trend = 'stable';
      
      if (previousCount === 0 && term.count > 0) {
        trend = 'up';
      } else if (previousCount > 0) {
        const change = ((term.count - previousCount) / previousCount) * 100;
        if (change > 10) trend = 'up';
        else if (change < -10) trend = 'down';
      }

      return {
        term: term._id,
        count: term.count,
        trend
      };
    });

    // Search results performance
    const searchResults = await Post.aggregate([
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

  } catch (error) {
    console.error('Search analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching search analytics'
    });
  }
};

// Export Analytics (comprehensive report)
export const exportAnalytics = async (req: AuthRequest, res: Response) => {
  try {
    const { period = '30', format = 'json' } = req.query;
    const days = parseInt(period as string);
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Gather all analytics data
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
      // Convert to CSV format (simplified)
      const csvData = convertToCSV(report);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="analytics-report-${Date.now()}.csv"`);
      return res.send(csvData);
    }

    res.json({
      success: true,
      data: report
    });

  } catch (error) {
    console.error('Export analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error exporting analytics'
    });
  }
};

// Helper functions for export
async function getDashboardOverviewData(startDate: Date) {
  const [totalPosts, publishedPosts, totalViews, totalLikes] = await Promise.all([
    Post.countDocuments(),
    Post.countDocuments({ status: 'published' }),
    Post.aggregate([{ $group: { _id: null, totalViews: { $sum: '$views' } } }]),
    Post.aggregate([{ $group: { _id: null, totalLikes: { $sum: { $size: '$likes' } } } }])
  ]);

  return {
    totalPosts,
    publishedPosts,
    totalViews: totalViews[0]?.totalViews || 0,
    totalLikes: totalLikes[0]?.totalLikes || 0
  };
}

async function getContentPerformanceData(startDate: Date) {
  const topPosts = await Post.find({ 
    status: 'published',
    publishedAt: { $gte: startDate }
  })
  .select('title views likes')
  .sort({ views: -1 })
  .limit(5);

  return { topPosts };
}

async function getTrafficAnalyticsData(startDate: Date) {
  const totalViews = await Post.aggregate([
    { $match: { status: 'published', publishedAt: { $gte: startDate } } },
    { $group: { _id: null, totalViews: { $sum: '$views' } } }
  ]);

  return {
    totalViews: totalViews[0]?.totalViews || 0
  };
}

async function getUserAnalyticsData(startDate: Date) {
  const totalUsers = await User.countDocuments();
  const newUsers = await User.countDocuments({ createdAt: { $gte: startDate } });

  return { totalUsers, newUsers };
}

async function getMediaAnalyticsData(startDate: Date) {
  const totalMedia = await Media.countDocuments();
  const storageUsed = await Media.aggregate([
    { $group: { _id: null, totalSize: { $sum: '$size' } } }
  ]);

  return {
    totalMedia,
    storageUsed: storageUsed[0]?.totalSize || 0
  };
}

function convertToCSV(data: any): string {
  // Simple CSV conversion - would expand for production
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