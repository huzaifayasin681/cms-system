"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsBatch = exports.trackMediaAccess = exports.trackLike = exports.trackSearch = exports.trackPageView = exports.trackPostView = exports.saveAnalyticsEvent = exports.trackEvent = void 0;
const Analytics_1 = __importDefault(require("../models/Analytics"));
const trackEvent = (eventType, resourceType) => {
    return async (req, res, next) => {
        req.analytics = {
            eventType,
            resourceType,
            resourceId: req.params.id || req.params.slug,
            metadata: {}
        };
        next();
    };
};
exports.trackEvent = trackEvent;
const saveAnalyticsEvent = async (req, res, next) => {
    try {
        if (req.analytics) {
            const { eventType, resourceType, resourceId, metadata = {} } = req.analytics;
            const userAgent = req.get('user-agent') || '';
            const referer = req.get('referer') || req.get('referrer') || '';
            const ipAddress = req.ip || req.connection.remoteAddress || '';
            const deviceInfo = parseUserAgent(userAgent);
            const analyticsData = {
                eventType,
                resourceType,
                resourceId: resourceId || undefined,
                userId: req.user?._id || undefined,
                sessionId: generateSessionId(req),
                ipAddress,
                userAgent,
                referrer: referer,
                metadata: {
                    ...metadata,
                    ...deviceInfo,
                    timestamp: new Date().toISOString()
                },
                timestamp: new Date()
            };
            setImmediate(async () => {
                try {
                    await new Analytics_1.default(analyticsData).save();
                }
                catch (error) {
                    console.error('Analytics tracking error:', error);
                }
            });
        }
        next();
    }
    catch (error) {
        console.error('Analytics middleware error:', error);
        next();
    }
};
exports.saveAnalyticsEvent = saveAnalyticsEvent;
const trackPostView = (req, res, next) => {
    req.analytics = {
        eventType: 'post_view',
        resourceType: 'post',
        resourceId: req.params.id || req.params.slug,
        metadata: {
            source: req.query.source || 'direct',
            campaign: req.query.utm_campaign || null,
            medium: req.query.utm_medium || null
        }
    };
    next();
};
exports.trackPostView = trackPostView;
const trackPageView = (req, res, next) => {
    req.analytics = {
        eventType: 'page_view',
        resourceType: 'page',
        resourceId: req.params.id || req.params.slug,
        metadata: {
            source: req.query.source || 'direct',
            campaign: req.query.utm_campaign || null,
            medium: req.query.utm_medium || null
        }
    };
    next();
};
exports.trackPageView = trackPageView;
const trackSearch = (req, res, next) => {
    if (req.query.search || req.query.q) {
        req.analytics = {
            eventType: 'search',
            resourceType: 'search',
            metadata: {
                searchTerm: req.query.search || req.query.q,
                filters: {
                    category: req.query.category,
                    tags: req.query.tags,
                    author: req.query.author,
                    status: req.query.status
                },
                resultsPage: req.query.page || 1,
                sortBy: req.query.sortBy || 'createdAt'
            }
        };
    }
    next();
};
exports.trackSearch = trackSearch;
const trackLike = (req, res, next) => {
    req.analytics = {
        eventType: 'like',
        resourceType: 'post',
        resourceId: req.params.id,
        metadata: {
            action: 'toggle_like'
        }
    };
    next();
};
exports.trackLike = trackLike;
const trackMediaAccess = (req, res, next) => {
    req.analytics = {
        eventType: 'download',
        resourceType: 'media',
        resourceId: req.params.id,
        metadata: {
            action: 'media_access',
            type: req.query.type || 'view'
        }
    };
    next();
};
exports.trackMediaAccess = trackMediaAccess;
function parseUserAgent(userAgent) {
    const deviceInfo = {
        deviceType: 'desktop',
        browser: 'unknown',
        os: 'unknown'
    };
    const ua = userAgent.toLowerCase();
    if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
        deviceInfo.deviceType = 'mobile';
    }
    else if (ua.includes('tablet') || ua.includes('ipad')) {
        deviceInfo.deviceType = 'tablet';
    }
    if (ua.includes('chrome')) {
        deviceInfo.browser = 'chrome';
    }
    else if (ua.includes('firefox')) {
        deviceInfo.browser = 'firefox';
    }
    else if (ua.includes('safari')) {
        deviceInfo.browser = 'safari';
    }
    else if (ua.includes('edge')) {
        deviceInfo.browser = 'edge';
    }
    else if (ua.includes('opera')) {
        deviceInfo.browser = 'opera';
    }
    if (ua.includes('windows')) {
        deviceInfo.os = 'windows';
    }
    else if (ua.includes('mac')) {
        deviceInfo.os = 'macos';
    }
    else if (ua.includes('linux')) {
        deviceInfo.os = 'linux';
    }
    else if (ua.includes('android')) {
        deviceInfo.os = 'android';
    }
    else if (ua.includes('ios') || ua.includes('iphone') || ua.includes('ipad')) {
        deviceInfo.os = 'ios';
    }
    return deviceInfo;
}
function generateSessionId(req) {
    const ip = req.ip || req.connection.remoteAddress || '';
    const ua = req.get('user-agent') || '';
    const timestamp = Math.floor(Date.now() / (1000 * 60 * 30));
    return Buffer.from(`${ip}-${ua}-${timestamp}`).toString('base64').substring(0, 16);
}
class AnalyticsBatch {
    constructor() {
        this.batch = [];
        this.batchSize = 100;
        this.flushInterval = 5000;
        setInterval(() => {
            this.flush();
        }, this.flushInterval);
    }
    static getInstance() {
        if (!AnalyticsBatch.instance) {
            AnalyticsBatch.instance = new AnalyticsBatch();
        }
        return AnalyticsBatch.instance;
    }
    add(eventData) {
        this.batch.push(eventData);
        if (this.batch.length >= this.batchSize) {
            this.flush();
        }
    }
    async flush() {
        if (this.batch.length === 0)
            return;
        const events = [...this.batch];
        this.batch = [];
        try {
            await Analytics_1.default.insertMany(events);
            console.log(`Flushed ${events.length} analytics events`);
        }
        catch (error) {
            console.error('Error flushing analytics batch:', error);
        }
    }
}
exports.AnalyticsBatch = AnalyticsBatch;
