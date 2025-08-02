import mongoose, { Document, Types } from 'mongoose';
export interface IComment extends Document {
    content: string;
    author: Types.ObjectId;
    post: Types.ObjectId;
    parentComment?: Types.ObjectId;
    status: 'pending' | 'approved' | 'rejected' | 'spam';
    isAnonymous: boolean;
    authorName?: string;
    authorEmail?: string;
    authorWebsite?: string;
    ipAddress?: string;
    userAgent?: string;
    likes: Types.ObjectId[];
    replies: Types.ObjectId[];
    createdAt: Date;
    updatedAt: Date;
}
declare const _default: mongoose.Model<IComment, {}, {}, {}, mongoose.Document<unknown, {}, IComment, {}> & IComment & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=Comment.d.ts.map