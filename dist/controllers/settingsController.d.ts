import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
export declare const getSettings: (req: AuthRequest, res: Response) => Promise<void>;
export declare const updateSettings: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const resetSettings: (req: AuthRequest, res: Response) => Promise<void>;
export declare const uploadLogo: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const testEmailConfig: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=settingsController.d.ts.map