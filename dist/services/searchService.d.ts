import mongoose from 'mongoose';
export interface ISearchFilters {
    query?: string;
    contentType?: 'post' | 'page' | 'both';
    status?: string[];
    categories?: mongoose.Types.ObjectId[];
    tags?: mongoose.Types.ObjectId[];
    authors?: mongoose.Types.ObjectId[];
    dateRange?: {
        from?: Date;
        to?: Date;
        field?: 'createdAt' | 'updatedAt' | 'publishedAt';
    };
    sortBy?: 'relevance' | 'date' | 'title' | 'views';
    sortOrder?: 'asc' | 'desc';
    limit?: number;
    offset?: number;
}
export interface ISearchResult {
    _id: mongoose.Types.ObjectId;
    title: string;
    slug: string;
    excerpt?: string;
    featuredImage?: string;
    contentType: 'post' | 'page';
    status: string;
    author: {
        _id: mongoose.Types.ObjectId;
        username: string;
        firstName?: string;
        lastName?: string;
    };
    categories: any[];
    tags: any[];
    views: number;
    score?: number;
    createdAt: Date;
    updatedAt: Date;
    publishedAt?: Date;
    highlightedContent?: string;
}
export interface ISearchResponse {
    results: ISearchResult[];
    total: number;
    hasMore: boolean;
    facets: {
        categories: Array<{
            _id: mongoose.Types.ObjectId;
            name: string;
            count: number;
        }>;
        tags: Array<{
            _id: mongoose.Types.ObjectId;
            name: string;
            count: number;
        }>;
        authors: Array<{
            _id: mongoose.Types.ObjectId;
            username: string;
            count: number;
        }>;
        contentTypes: Array<{
            type: string;
            count: number;
        }>;
        statuses: Array<{
            status: string;
            count: number;
        }>;
    };
    suggestions?: string[];
}
export declare class SearchService {
    static search(filters: ISearchFilters): Promise<ISearchResponse>;
    private static searchCollection;
    private static buildSearchPipeline;
    private static getSortStage;
    private static getSortComparator;
    private static getFacets;
    private static getCategoriesFacet;
    private static getTagsFacet;
    private static getAuthorsFacet;
    private static getContentTypesFacet;
    private static getStatusesFacet;
    private static mergeFacetResults;
    private static getSuggestions;
    static getPopularSearches(limit?: number): Promise<string[]>;
    static getRelatedContent(contentId: mongoose.Types.ObjectId, contentType: 'post' | 'page', limit?: number): Promise<any>;
}
export default SearchService;
//# sourceMappingURL=searchService.d.ts.map