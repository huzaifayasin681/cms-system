import mongoose, { Document } from 'mongoose';
export interface IContentSchedule extends Document {
    contentId: mongoose.Types.ObjectId;
    contentType: 'post' | 'page';
    action: 'publish' | 'unpublish' | 'archive' | 'delete';
    scheduledAt: Date;
    status: 'pending' | 'executed' | 'failed' | 'cancelled';
    executedAt?: Date;
    failureReason?: string;
    retryCount: number;
    maxRetries: number;
    metadata: {
        originalStatus?: string;
        targetStatus: string;
        notifyUsers: mongoose.Types.ObjectId[];
        emailNotification: boolean;
        socialMediaPost: boolean;
    };
    createdBy: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}
declare const _default: mongoose.Model<IContentSchedule, {}, {}, {}, mongoose.Document<unknown, {}, IContentSchedule, {}> & IContentSchedule & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=ContentSchedule.d.ts.map