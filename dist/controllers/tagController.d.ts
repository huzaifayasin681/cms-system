import { Request, Response } from 'express';
export declare const getTags: (req: Request, res: Response) => Promise<void>;
export declare const getPopularTags: (req: Request, res: Response) => Promise<void>;
export declare const getTag: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getTagBySlug: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const createTag: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const updateTag: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const deleteTag: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const bulkCreateTags: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const bulkDeleteTags: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const mergeTags: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getTagStats: (req: Request, res: Response) => Promise<void>;
export declare const suggestTags: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const updateTagUsageCounts: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=tagController.d.ts.map