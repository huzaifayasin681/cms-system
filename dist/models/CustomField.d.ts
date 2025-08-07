import mongoose, { Document } from 'mongoose';
export interface ICustomFieldSchema {
    name: string;
    key: string;
    type: 'text' | 'textarea' | 'number' | 'boolean' | 'date' | 'select' | 'multiselect' | 'file' | 'url' | 'email' | 'json';
    required: boolean;
    defaultValue?: any;
    options?: string[];
    validation?: {
        min?: number;
        max?: number;
        pattern?: string;
        message?: string;
    };
    description?: string;
    placeholder?: string;
    helpText?: string;
}
export interface ICustomField extends Document {
    name: string;
    slug: string;
    description?: string;
    contentTypes: ('post' | 'page')[];
    fields: ICustomFieldSchema[];
    isActive: boolean;
    sortOrder: number;
    createdBy: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}
declare const _default: mongoose.Model<ICustomField, {}, {}, {}, mongoose.Document<unknown, {}, ICustomField, {}> & ICustomField & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=CustomField.d.ts.map