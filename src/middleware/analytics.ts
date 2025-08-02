import { Request, Response, NextFunction } from 'express';
import AnalyticsEvent from '../models/Analytics';
import { AuthRequest } from './auth';

// Enhanced request interface for analytics
interface AnalyticsRequest extends AuthRequest {
  analytics?: {
    eventType: string;
    resourceType: string;
    resourceId?: string;
    metadata?: any;
  };
}

// Track analytics events
export const trackEvent = (eventType: string, resourceType: string) => {
  return async (req: AnalyticsRequest, res: Response, next: NextFunction) => {
    // Store analytics info in request for later processing
    req.analytics = {
      eventType,
      resourceType,
      resourceId: req.params.id || req.params.slug,
      metadata: {}
    };
    
    next();
  };
};

// Process and save analytics event (use this after the main route handler)
export const saveAnalyticsEvent = async (req: AnalyticsRequest, res: Response, next: NextFunction) => {
  try {
    if (req.analytics) {
      const {
        eventType,
        resourceType,
        resourceId,
        metadata = {}
      } = req.analytics;

      // Extract additional metadata from request
      const userAgent = req.get('user-agent') || '';
      const referer = req.get('referer') || req.get('referrer') || '';
      const ipAddress = req.ip || req.connection.remoteAddress || '';

      // Parse user agent for device/browser info
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

      // Save analytics event asynchronously (don't block response)
      setImmediate(async () => {
        try {
          await new AnalyticsEvent(analyticsData).save();
        } catch (error) {
          console.error('Analytics tracking error:', error);
        }
      });
    }

    next();
  } catch (error) {
    console.error('Analytics middleware error:', error);
    next(); // Don't block the request if analytics fails
  }
};

// Track post views specifically
export const trackPostView = (req: AnalyticsRequest, res: Response, next: NextFunction) => {
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

// Track page views specifically
export const trackPageView = (req: AnalyticsRequest, res: Response, next: NextFunction) => {
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

// Track search queries
export const trackSearch = (req: AnalyticsRequest, res: Response, next: NextFunction) => {
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

// Track like events
export const trackLike = (req: AnalyticsRequest, res: Response, next: NextFunction) => {
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

// Track media downloads/views
export const trackMediaAccess = (req: AnalyticsRequest, res: Response, next: NextFunction) => {
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

// Helper functions

function parseUserAgent(userAgent: string) {
  const deviceInfo: any = {
    deviceType: 'desktop',
    browser: 'unknown',
    os: 'unknown'
  };

  // Simple user agent parsing (for production, consider using a library like 'ua-parser-js')
  const ua = userAgent.toLowerCase();

  // Device type detection
  if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
    deviceInfo.deviceType = 'mobile';
  } else if (ua.includes('tablet') || ua.includes('ipad')) {
    deviceInfo.deviceType = 'tablet';
  }

  // Browser detection
  if (ua.includes('chrome')) {
    deviceInfo.browser = 'chrome';
  } else if (ua.includes('firefox')) {
    deviceInfo.browser = 'firefox';
  } else if (ua.includes('safari')) {
    deviceInfo.browser = 'safari';
  } else if (ua.includes('edge')) {
    deviceInfo.browser = 'edge';
  } else if (ua.includes('opera')) {
    deviceInfo.browser = 'opera';
  }

  // OS detection
  if (ua.includes('windows')) {
    deviceInfo.os = 'windows';
  } else if (ua.includes('mac')) {
    deviceInfo.os = 'macos';
  } else if (ua.includes('linux')) {
    deviceInfo.os = 'linux';
  } else if (ua.includes('android')) {
    deviceInfo.os = 'android';
  } else if (ua.includes('ios') || ua.includes('iphone') || ua.includes('ipad')) {
    deviceInfo.os = 'ios';
  }

  return deviceInfo;
}

function generateSessionId(req: Request): string {
  // Simple session ID generation (for production, use proper session management)
  const ip = req.ip || req.connection.remoteAddress || '';
  const ua = req.get('user-agent') || '';
  const timestamp = Math.floor(Date.now() / (1000 * 60 * 30)); // 30-minute sessions
  
  return Buffer.from(`${ip}-${ua}-${timestamp}`).toString('base64').substring(0, 16);
}

// Batch analytics processing (for high-traffic scenarios)
export class AnalyticsBatch {
  private static instance: AnalyticsBatch;
  private batch: any[] = [];
  private batchSize = 100;
  private flushInterval = 5000; // 5 seconds

  constructor() {
    // Flush batch periodically
    setInterval(() => {
      this.flush();
    }, this.flushInterval);
  }

  static getInstance(): AnalyticsBatch {
    if (!AnalyticsBatch.instance) {
      AnalyticsBatch.instance = new AnalyticsBatch();
    }
    return AnalyticsBatch.instance;
  }

  add(eventData: any) {
    this.batch.push(eventData);
    
    if (this.batch.length >= this.batchSize) {
      this.flush();
    }
  }

  async flush() {
    if (this.batch.length === 0) return;

    const events = [...this.batch];
    this.batch = [];

    try {
      await AnalyticsEvent.insertMany(events);
      console.log(`Flushed ${events.length} analytics events`);
    } catch (error) {
      console.error('Error flushing analytics batch:', error);
      // Could implement retry logic here
    }
  }
}