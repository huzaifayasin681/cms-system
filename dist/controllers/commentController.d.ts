import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
export declare const getComments: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const createComment: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const toggleCommentLike: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const deleteComment: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=commentController.d.ts.map