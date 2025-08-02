import mongoose, { Document } from 'mongoose';
export interface IUser extends Document {
    username: string;
    email: string;
    password: string;
    role: 'superadmin' | 'admin' | 'editor' | 'viewer';
    avatar?: string;
    firstName?: string;
    lastName?: string;
    bio?: string;
    website?: string;
    location?: string;
    phone?: string;
    isActive: boolean;
    emailVerified: boolean;
    status: 'active' | 'pending' | 'rejected';
    approvedBy?: mongoose.Types.ObjectId;
    approvedAt?: Date;
    emailVerificationToken?: string;
    emailVerificationExpires?: Date;
    passwordResetToken?: string;
    passwordResetExpires?: Date;
    lastLogin?: Date;
    createdAt: Date;
    updatedAt: Date;
    comparePassword(candidatePassword: string): Promise<boolean>;
    generateEmailVerificationToken(): string;
    generatePasswordResetToken(): string;
}
declare const _default: mongoose.Model<IUser, {}, {}, {}, mongoose.Document<unknown, {}, IUser, {}> & IUser & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=User.d.ts.map