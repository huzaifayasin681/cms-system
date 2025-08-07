import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
export declare const getDashboardOverview: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getContentPerformance: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getTrafficAnalytics: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getUserAnalytics: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getMediaAnalytics: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getSearchAnalytics: (req: AuthRequest, res: Response) => Promise<void>;
export declare const exportAnalytics: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=analyticsController.d.ts.map