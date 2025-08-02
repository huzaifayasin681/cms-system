"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsSummary = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const analyticsEventSchema = new mongoose_1.Schema({
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
        type: mongoose_1.Schema.Types.ObjectId,
        index: true
    },
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
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
analyticsEventSchema.index({ eventType: 1, timestamp: -1 });
analyticsEventSchema.index({ resourceType: 1, resourceId: 1, timestamp: -1 });
analyticsEventSchema.index({ userId: 1, timestamp: -1 });
analyticsEventSchema.index({ timestamp: -1, eventType: 1 });
exports.default = mongoose_1.default.model('AnalyticsEvent', analyticsEventSchema);
const analyticsSummarySchema = new mongoose_1.Schema({
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
                postId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Post' },
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
analyticsSummarySchema.index({ date: 1, type: 1 }, { unique: true });
exports.AnalyticsSummary = mongoose_1.default.model('AnalyticsSummary', analyticsSummarySchema);
//# sourceMappingURL=Analytics.js.map