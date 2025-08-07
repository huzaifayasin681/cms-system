import mongoose, { Document } from 'mongoose';
export interface IContentVersion extends Document {
    contentId: mongoose.Types.ObjectId;
    contentType: 'post' | 'page';
    version: number;
    title: string;
    content: string;
    excerpt?: string;
    slug: string;
    seoTitle?: string;
    seoDescription?: string;
    seoKeywords?: string[];
    featuredImage?: string;
    categories?: mongoose.Types.ObjectId[];
    tags?: mongoose.Types.ObjectId[];
    customFields?: Record<string, any>;
    status: 'draft' | 'published' | 'archived';
    metadata: {
        changeType: 'create' | 'update' | 'revert';
        changeDescription?: string;
        previousVersion?: number;
        changedFields: string[];
        wordCount: number;
        readingTime: number;
    };
    createdBy: mongoose.Types.ObjectId;
    createdAt: Date;
}
declare const _default: mongoose.Model<IContentVersion, {}, {}, {}, mongoose.Document<unknown, {}, IContentVersion, {}> & IContentVersion & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=ContentVersion.d.ts.map