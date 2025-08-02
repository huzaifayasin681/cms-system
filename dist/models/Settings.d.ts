import mongoose, { Document } from 'mongoose';
export interface ISettings extends Document {
    siteName: string;
    siteDescription: string;
    siteUrl: string;
    adminEmail: string;
    timezone: string;
    language: string;
    siteLogo?: string;
    postsPerPage: number;
    allowComments: boolean;
    moderateComments: boolean;
    allowRegistration: boolean;
    defaultRole: 'viewer' | 'editor' | 'admin';
    autoSave: boolean;
    contentVersioning: boolean;
    smtpHost?: string;
    smtpPort?: number;
    smtpUser?: string;
    smtpPassword?: string;
    smtpSecure: boolean;
    fromEmail?: string;
    fromName?: string;
    newComments: boolean;
    newUsers: boolean;
    newPosts: boolean;
    systemUpdates: boolean;
    emailDigest: boolean;
    desktopNotifications: boolean;
    enableTwoFactor: boolean;
    sessionTimeout: number;
    maxLoginAttempts: number;
    enableAnalytics: boolean;
    trackingCode?: string;
    updatedAt: Date;
    updatedBy: mongoose.Types.ObjectId;
}
declare const _default: mongoose.Model<ISettings, {}, {}, {}, mongoose.Document<unknown, {}, ISettings, {}> & ISettings & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=Settings.d.ts.map