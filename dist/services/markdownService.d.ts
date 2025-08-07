import mongoose from 'mongoose';
interface IMarkdownFrontMatter {
    title: string;
    slug?: string;
    excerpt?: string;
    author?: string;
    status?: 'draft' | 'published' | 'archived';
    publishedAt?: string;
    featuredImage?: string;
    categories?: string[];
    tags?: string[];
    seoTitle?: string;
    seoDescription?: string;
    seoKeywords?: string[];
    customFields?: Record<string, any>;
    template?: string;
    [key: string]: any;
}
interface IMarkdownContent {
    frontMatter: IMarkdownFrontMatter;
    content: string;
    rawContent: string;
}
interface IImportResult {
    success: number;
    failed: number;
    errors: string[];
    imported: Array<{
        title: string;
        slug: string;
        type: 'post' | 'page';
        id: mongoose.Types.ObjectId;
    }>;
}
export declare class MarkdownService {
    static parseMarkdown(markdownContent: string): IMarkdownContent;
    private static parseFrontMatter;
    static markdownToHtml(markdown: string): string;
    static htmlToMarkdown(html: string): string;
    static generateFrontMatter(content: any, contentType: 'post' | 'page', categories?: any[], tags?: any[]): string;
    static importFromMarkdown(files: Array<{
        filename: string;
        content: string;
    }>, userId: mongoose.Types.ObjectId, options?: {
        contentType?: 'post' | 'page' | 'auto';
        overwrite?: boolean;
        createMissingCategories?: boolean;
        createMissingTags?: boolean;
    }): Promise<IImportResult>;
    static exportToMarkdown(contentIds: mongoose.Types.ObjectId[], contentType: 'post' | 'page' | 'mixed'): Promise<Array<{
        filename: string;
        content: string;
    }>>;
    static exportAllToMarkdown(options?: {
        includePages?: boolean;
        includePosts?: boolean;
        status?: string[];
        authorId?: mongoose.Types.ObjectId;
    }): Promise<{
        filename: string;
        content: string;
        type: string;
    }[]>;
    private static generateSlug;
    private static processCategories;
    private static processTags;
}
export default MarkdownService;
//# sourceMappingURL=markdownService.d.ts.map