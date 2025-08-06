import mongoose, { Document } from 'mongoose';
export interface INotification extends Document {
    recipient: mongoose.Types.ObjectId;
    sender?: mongoose.Types.ObjectId;
    type: 'info' | 'success' | 'warning' | 'error' | 'system';
    category: 'user_action' | 'system_update' | 'content_change' | 'security' | 'approval' | 'media' | 'comment' | 'general';
    title: string;
    message: string;
    data?: any;
    read: boolean;
    emailSent: boolean;
    emailSentAt?: Date;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    expiresAt?: Date;
    actionUrl?: string;
    actionText?: string;
    createdAt: Date;
    updatedAt: Date;
}
declare const _default: mongoose.Model<INotification, {}, {}, {}, mongoose.Document<unknown, {}, INotification, {}> & INotification & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=Notification.d.ts.map