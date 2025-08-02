import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
interface AnalyticsRequest extends AuthRequest {
    analytics?: {
        eventType: string;
        resourceType: string;
        resourceId?: string;
        metadata?: any;
    };
}
export declare const trackEvent: (eventType: string, resourceType: string) => (req: AnalyticsRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const saveAnalyticsEvent: (req: AnalyticsRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const trackPostView: (req: AnalyticsRequest, res: Response, next: NextFunction) => void;
export declare const trackPageView: (req: AnalyticsRequest, res: Response, next: NextFunction) => void;
export declare const trackSearch: (req: AnalyticsRequest, res: Response, next: NextFunction) => void;
export declare const trackLike: (req: AnalyticsRequest, res: Response, next: NextFunction) => void;
export declare const trackMediaAccess: (req: AnalyticsRequest, res: Response, next: NextFunction) => void;
export declare class AnalyticsBatch {
    private static instance;
    private batch;
    private batchSize;
    private flushInterval;
    constructor();
    static getInstance(): AnalyticsBatch;
    add(eventData: any): void;
    flush(): Promise<void>;
}
export {};
//# sourceMappingURL=analytics.d.ts.map