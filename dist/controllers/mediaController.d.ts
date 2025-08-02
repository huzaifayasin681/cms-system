import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
export declare const uploadMedia: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getMedia: (req: Request, res: Response) => Promise<void>;
export declare const getMediaById: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const updateMedia: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const deleteMedia: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const bulkDeleteMedia: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getMediaStats: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=mediaController.d.ts.map