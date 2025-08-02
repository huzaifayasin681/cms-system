import mongoose, { Document, Types } from 'mongoose';
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
declare const _default: mongoose.Model<IAnalyticsEvent, {}, {}, {}, mongoose.Document<unknown, {}, IAnalyticsEvent, {}> & IAnalyticsEvent & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
export default _default;
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
export declare const AnalyticsSummary: mongoose.Model<IAnalyticsSummary, {}, {}, {}, mongoose.Document<unknown, {}, IAnalyticsSummary, {}> & IAnalyticsSummary & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=Analytics.d.ts.map