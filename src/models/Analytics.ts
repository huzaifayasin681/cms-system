import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IAnalyticsEvent extends Document {
  eventType: 'page_view' | 'post_view' | 'like' | 'search' | 'download' | 'share' | 'comment';
  resourceType: 'post' | 'page' | 'media' | 'user' | 'search';
  resourceId?: Types.ObjectId;
  userId?: Types.ObjectId;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  referrer?: string;
  metadata?: {
    searchTerm?: string;
    shareDestination?: string;
    downloadType?: string;
    deviceType?: string;
    browser?: string;
    os?: string;
    country?: string;
    city?: string;
    [key: string]: any;
  };
  timestamp: Date;
  createdAt: Date;
}

const analyticsEventSchema = new Schema<IAnalyticsEvent>({
  eventType: {
    type: String,
    enum: ['page_view', 'post_view', 'like', 'search', 'download', 'share', 'comment'],
    required: true,
    index: true
  },
  resourceType: {
    type: String,
    enum: ['post', 'page', 'media', 'user', 'search'],
    required: true,
    index: true
  },
  resourceId: {
    type: Schema.Types.ObjectId,
    index: true
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  sessionId: {
    type: String,
    index: true
  },
  ipAddress: {
    type: String,
    index: true
  },
  userAgent: String,
  referrer: String,
  metadata: {
    searchTerm: String,
    shareDestination: String,
    downloadType: String,
    deviceType: String,
    browser: String,
    os: String,
    country: String,
    city: String
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
});

// Compound indexes for common queries
analyticsEventSchema.index({ eventType: 1, timestamp: -1 });
analyticsEventSchema.index({ resourceType: 1, resourceId: 1, timestamp: -1 });
analyticsEventSchema.index({ userId: 1, timestamp: -1 });
analyticsEventSchema.index({ timestamp: -1, eventType: 1 });

// TTL index to automatically delete old analytics events (optional)
// Uncomment to keep only 1 year of data
// analyticsEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 });

export default mongoose.model<IAnalyticsEvent>('AnalyticsEvent', analyticsEventSchema);

// Analytics Summary Schema for pre-aggregated data
export interface IAnalyticsSummary extends Document {
  date: Date;
  type: 'daily' | 'weekly' | 'monthly';
  metrics: {
    totalViews: number;
    uniqueViews: number;
    totalUsers: number;
    newUsers: number;
    totalPosts: number;
    publishedPosts: number;
    totalLikes: number;
    totalShares: number;
    totalSearches: number;
    bounceRate: number;
    avgSessionDuration: number;
    topPosts: Array<{
      postId: Types.ObjectId;
      title: string;
      views: number;
      likes: number;
    }>;
    topSearchTerms: Array<{
      term: string;
      count: number;
    }>;
    trafficSources: Array<{
      source: string;
      visits: number;
      percentage: number;
    }>;
    deviceBreakdown: {
      desktop: number;
      mobile: number;
      tablet: number;
    };
    browserBreakdown: Array<{
      browser: string;
      count: number;
      percentage: number;
    }>;
  };
  createdAt: Date;
  updatedAt: Date;
}

const analyticsSummarySchema = new Schema<IAnalyticsSummary>({
  date: {
    type: Date,
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['daily', 'weekly', 'monthly'],
    required: true,
    index: true
  },
  metrics: {
    totalViews: { type: Number, default: 0 },
    uniqueViews: { type: Number, default: 0 },
    totalUsers: { type: Number, default: 0 },
    newUsers: { type: Number, default: 0 },
    totalPosts: { type: Number, default: 0 },
    publishedPosts: { type: Number, default: 0 },
    totalLikes: { type: Number, default: 0 },
    totalShares: { type: Number, default: 0 },
    totalSearches: { type: Number, default: 0 },
    bounceRate: { type: Number, default: 0 },
    avgSessionDuration: { type: Number, default: 0 },
    topPosts: [{
      postId: { type: Schema.Types.ObjectId, ref: 'Post' },
      title: String,
      views: Number,
      likes: Number
    }],
    topSearchTerms: [{
      term: String,
      count: Number
    }],
    trafficSources: [{
      source: String,
      visits: Number,
      percentage: Number
    }],
    deviceBreakdown: {
      desktop: { type: Number, default: 0 },
      mobile: { type: Number, default: 0 },
      tablet: { type: Number, default: 0 }
    },
    browserBreakdown: [{
      browser: String,
      count: Number,
      percentage: Number
    }]
  }
}, {
  timestamps: true
});

// Unique compound index for date and type
analyticsSummarySchema.index({ date: 1, type: 1 }, { unique: true });

export const AnalyticsSummary = mongoose.model<IAnalyticsSummary>('AnalyticsSummary', analyticsSummarySchema);