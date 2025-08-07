import mongoose from 'mongoose';
export interface ISEOAnalysis {
    score: number;
    issues: Array<{
        type: 'error' | 'warning' | 'suggestion';
        message: string;
        field: string;
    }>;
    suggestions: string[];
    keywordDensity: Record<string, number>;
    readabilityScore: number;
}
export interface ISEOSettings {
    siteName: string;
    siteDescription: string;
    defaultMetaDescription: string;
    twitterHandle?: string;
    facebookAppId?: string;
    googleAnalyticsId?: string;
    googleSearchConsoleId?: string;
    robotsContent: string;
    sitemapEnabled: boolean;
    breadcrumbsEnabled: boolean;
}
export interface ISitemapEntry {
    url: string;
    lastmod: string;
    changefreq: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
    priority: number;
}
export declare class SEOService {
    private static readonly DEFAULT_ROBOTS_CONTENT;
    private static readonly SEO_LIMITS;
    static analyzeSEO(content: any, contentType: 'post' | 'page'): ISEOAnalysis;
    static generateMetaTags(content: any, contentType: 'post' | 'page', siteSettings?: Partial<ISEOSettings>): Record<string, string>;
    static generateSitemap(siteUrl?: string): Promise<string>;
    static generateRobotsTxt(siteUrl?: string): string;
    static getSEORecommendations(contentId: mongoose.Types.ObjectId, contentType: 'post' | 'page'): Promise<{
        analysis: ISEOAnalysis;
        recommendations: any[];
        metaTags: Record<string, string>;
    }>;
    private static analyzeTitle;
    private static analyzeDescription;
    private static analyzeContent;
    private static analyzeURL;
    private static analyzeImages;
    private static analyzeKeywords;
    private static calculateKeywordDensity;
    private static calculateReadabilityScore;
    private static countSyllables;
}
export default SEOService;
//# sourceMappingURL=seoService.d.ts.map