import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
export declare const createPage: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getPages: (req: Request, res: Response) => Promise<void>;
export declare const getPage: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const updatePage: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const deletePage: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getMenuPages: (req: Request, res: Response) => Promise<void>;
export declare const getHomePage: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=pageController.d.ts.map