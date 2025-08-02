import mongoose, { Document, Types } from 'mongoose';
export interface IPost extends Document {
    title: string;
    slug: string;
    content: string;
    excerpt?: string;
    featuredImage?: string;
    author: Types.ObjectId;
    status: 'draft' | 'published' | 'archived';
    tags: string[];
    categories: string[];
    seoTitle?: string;
    seoDescription?: string;
    views: number;
    likes: Types.ObjectId[];
    publishedAt?: Date;
    scheduledAt?: Date;
    contentHistory: {
        content: string;
        savedAt: Date;
        savedBy: Types.ObjectId;
    }[];
    readingTime: number;
    wordCount: number;
    createdAt: Date;
    updatedAt: Date;
}
declare const _default: mongoose.Model<IPost, {}, {}, {}, mongoose.Document<unknown, {}, IPost, {}> & IPost & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=Post.d.ts.map