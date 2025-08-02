import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
export declare const createPost: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getPosts: (req: Request, res: Response) => Promise<void>;
export declare const getPost: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const updatePost: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const deletePost: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const toggleLike: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const savePostDraft: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=postController.d.ts.map