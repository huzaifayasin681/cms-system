import mongoose, { Document, Types } from 'mongoose';
export interface IPage extends Document {
    title: string;
    slug: string;
    content: string;
    excerpt?: string;
    featuredImage?: string;
    author: Types.ObjectId;
    status: 'draft' | 'published' | 'archived';
    template: 'default' | 'full-width' | 'minimal' | 'landing' | 'contact' | 'about' | 'visual-builder';
    icon?: string;
    seoTitle?: string;
    seoDescription?: string;
    isHomePage: boolean;
    parentPage?: Types.ObjectId;
    menuOrder: number;
    showInMenu: boolean;
    customCss?: string;
    customJs?: string;
    views: number;
    publishedAt?: Date;
    ctaText?: string;
    phone?: string;
    email?: string;
    address?: string;
    yearsExperience?: string;
    customers?: string;
    projects?: string;
    teamSize?: string;
    builderData?: {
        blocks: Array<{
            id: string;
            type: string;
            component: string;
            props: Record<string, any>;
            styles: {
                desktop: Record<string, any>;
                tablet: Record<string, any>;
                mobile: Record<string, any>;
            };
            children?: string[];
            parentId?: string;
            order: number;
        }>;
        globalStyles: {
            desktop: Record<string, any>;
            tablet: Record<string, any>;
            mobile: Record<string, any>;
        };
        settings: {
            containerWidth: string;
            spacing: string;
            typography: Record<string, any>;
            colors: Record<string, any>;
        };
    };
    isVisualBuilder: boolean;
    contentHistory: {
        content: string;
        builderData?: any;
        savedAt: Date;
        savedBy: Types.ObjectId;
    }[];
    createdAt: Date;
    updatedAt: Date;
}
declare const _default: mongoose.Model<IPage, {}, {}, {}, mongoose.Document<unknown, {}, IPage, {}> & IPage & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=Page.d.ts.map