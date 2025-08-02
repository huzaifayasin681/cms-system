import mongoose, { Document, Types } from 'mongoose';
export interface IMedia extends Document {
    fileName: string;
    originalName: string;
    mimeType: string;
    size: number;
    url: string;
    cloudinaryId?: string;
    alt?: string;
    caption?: string;
    uploadedBy: Types.ObjectId;
    folder: string;
    width?: number;
    height?: number;
    tags: string[];
    isUsed: boolean;
    usageCount: number;
    createdAt: Date;
    updatedAt: Date;
}
declare const _default: mongoose.Model<IMedia, {}, {}, {}, mongoose.Document<unknown, {}, IMedia, {}> & IMedia & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=Media.d.ts.map