import mongoose, { Document } from 'mongoose';
export interface ITag extends Document {
    name: string;
    slug: string;
    description?: string;
    color?: string;
    isActive: boolean;
    postCount: number;
    pageCount: number;
    createdBy: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}
declare const _default: mongoose.Model<ITag, {}, {}, {}, mongoose.Document<unknown, {}, ITag, {}> & ITag & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=Tag.d.ts.map