import mongoose, { Document } from 'mongoose';
export interface IActivity extends Document {
    type: 'post' | 'page' | 'media' | 'user' | 'comment' | 'login' | 'logout';
    action: string;
    entityId?: mongoose.Types.ObjectId;
    entityTitle?: string;
    userId: mongoose.Types.ObjectId;
    userDetails: {
        username: string;
        firstName?: string;
        lastName?: string;
    };
    metadata?: {
        oldValues?: any;
        newValues?: any;
        additionalInfo?: any;
    };
    ipAddress?: string;
    userAgent?: string;
    createdAt: Date;
}
declare const _default: mongoose.Model<IActivity, {}, {}, {}, mongoose.Document<unknown, {}, IActivity, {}> & IActivity & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=Activity.d.ts.map