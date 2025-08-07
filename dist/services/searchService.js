"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SearchService = void 0;
const Post_1 = __importDefault(require("../models/Post"));
const Page_1 = __importDefault(require("../models/Page"));
const Category_1 = __importDefault(require("../models/Category"));
const Tag_1 = __importDefault(require("../models/Tag"));
const mongooseHelper_1 = require("../utils/mongooseHelper");
class SearchService {
    static async search(filters) {
        try {
            const { query = '', contentType = 'both', status = ['published'], categories = [], tags = [], authors = [], dateRange, sortBy = 'relevance', sortOrder = 'desc', limit = 20, offset = 0 } = filters;
            const pipeline = this.buildSearchPipeline({
                query,
                contentType,
                status,
                categories,
                tags,
                authors,
                dateRange,
                sortBy,
                sortOrder,
                limit,
                offset
            });
            const searchPromises = [];
            if (contentType === 'both' || contentType === 'post') {
                searchPromises.push(this.searchCollection(Post_1.default, 'post', pipeline));
            }
            if (contentType === 'both' || contentType === 'page') {
                searchPromises.push(this.searchCollection(Page_1.default, 'page', pipeline));
            }
            const searchResults = await Promise.all(searchPromises);
            const allResults = searchResults.flat();
            if (contentType === 'both') {
                allResults.sort(this.getSortComparator(sortBy, sortOrder));
            }
            const paginatedResults = allResults.slice(offset, offset + limit);
            const facets = await this.getFacets(filters);
            const suggestions = allResults.length === 0 && query
                ? await this.getSuggestions(query)
                : [];
            return {
                results: paginatedResults,
                total: allResults.length,
                hasMore: (offset + limit) < allResults.length,
                facets,
                suggestions
            };
        }
        catch (error) {
            throw new Error(`Search failed: ${error.message}`);
        }
    }
    static async searchCollection(Model, contentType, basePipeline) {
        const pipeline = [
            ...basePipeline,
            {
                $addFields: {
                    contentType: contentType
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'author',
                    foreignField: '_id',
                    as: 'author'
                }
            },
            {
                $unwind: '$author'
            },
            {
                $lookup: {
                    from: 'categories',
                    localField: 'categories',
                    foreignField: '_id',
                    as: 'categories'
                }
            },
            {
                $lookup: {
                    from: 'tags',
                    localField: 'tags',
                    foreignField: '_id',
                    as: 'tags'
                }
            },
            {
                $project: {
                    title: 1,
                    slug: 1,
                    excerpt: 1,
                    featuredImage: 1,
                    contentType: 1,
                    status: 1,
                    'author._id': 1,
                    'author.username': 1,
                    'author.firstName': 1,
                    'author.lastName': 1,
                    categories: {
                        _id: 1,
                        name: 1,
                        slug: 1,
                        color: 1
                    },
                    tags: {
                        _id: 1,
                        name: 1,
                        slug: 1,
                        color: 1
                    },
                    views: 1,
                    score: { $meta: 'textScore' },
                    createdAt: 1,
                    updatedAt: 1,
                    publishedAt: 1
                }
            }
        ];
        return await Model.aggregate(pipeline);
    }
    static buildSearchPipeline(filters) {
        const pipeline = [];
        if (filters.query) {
            pipeline.push({
                $match: {
                    $text: { $search: filters.query }
                }
            });
        }
        const matchConditions = {};
        if (filters.status.length > 0) {
            matchConditions.status = { $in: filters.status };
        }
        if (filters.categories.length > 0) {
            matchConditions.categories = { $in: filters.categories };
        }
        if (filters.tags.length > 0) {
            matchConditions.tags = { $in: filters.tags };
        }
        if (filters.authors.length > 0) {
            matchConditions.author = { $in: filters.authors };
        }
        if (filters.dateRange) {
            const { from, to, field = 'createdAt' } = filters.dateRange;
            const dateFilter = {};
            if (from)
                dateFilter.$gte = from;
            if (to)
                dateFilter.$lte = to;
            if (Object.keys(dateFilter).length > 0) {
                matchConditions[field] = dateFilter;
            }
        }
        if (Object.keys(matchConditions).length > 0) {
            pipeline.push({ $match: matchConditions });
        }
        const sortStage = this.getSortStage(filters.sortBy, filters.sortOrder);
        if (sortStage) {
            pipeline.push(sortStage);
        }
        return pipeline;
    }
    static getSortStage(sortBy, sortOrder) {
        const direction = sortOrder === 'asc' ? 1 : -1;
        switch (sortBy) {
            case 'relevance':
                return { $sort: { score: { $meta: 'textScore' }, createdAt: -1 } };
            case 'date':
                return { $sort: { createdAt: direction } };
            case 'title':
                return { $sort: { title: direction } };
            case 'views':
                return { $sort: { views: direction, createdAt: -1 } };
            default:
                return { $sort: { createdAt: -1 } };
        }
    }
    static getSortComparator(sortBy, sortOrder) {
        const direction = sortOrder === 'asc' ? 1 : -1;
        return (a, b) => {
            let comparison = 0;
            switch (sortBy) {
                case 'relevance':
                    comparison = (b.score || 0) - (a.score || 0);
                    if (comparison === 0) {
                        comparison = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                    }
                    break;
                case 'date':
                    comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
                    break;
                case 'title':
                    comparison = a.title.localeCompare(b.title);
                    break;
                case 'views':
                    comparison = a.views - b.views;
                    break;
                default:
                    comparison = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            }
            return comparison * direction;
        };
    }
    static async getFacets(filters) {
        try {
            const baseMatch = {};
            if (filters.status && filters.status.length > 0) {
                baseMatch.status = { $in: filters.status };
            }
            const [categoriesData, tagsData, authorsData, contentTypesData, statusesData] = await Promise.all([
                this.getCategoriesFacet(baseMatch, filters),
                this.getTagsFacet(baseMatch, filters),
                this.getAuthorsFacet(baseMatch, filters),
                this.getContentTypesFacet(baseMatch, filters),
                this.getStatusesFacet(baseMatch, filters)
            ]);
            return {
                categories: categoriesData,
                tags: tagsData,
                authors: authorsData,
                contentTypes: contentTypesData,
                statuses: statusesData
            };
        }
        catch (error) {
            console.error('Error getting facets:', error);
            return {
                categories: [],
                tags: [],
                authors: [],
                contentTypes: [],
                statuses: []
            };
        }
    }
    static async getCategoriesFacet(baseMatch, filters) {
        const models = [];
        if (filters.contentType === 'both' || filters.contentType === 'post')
            models.push(Post_1.default);
        if (filters.contentType === 'both' || filters.contentType === 'page')
            models.push(Page_1.default);
        const results = await Promise.all(models.map(Model => Model.aggregate([
            { $match: baseMatch },
            { $unwind: '$categories' },
            { $group: { _id: '$categories', count: { $sum: 1 } } },
            { $lookup: { from: 'categories', localField: '_id', foreignField: '_id', as: 'category' } },
            { $unwind: '$category' },
            { $project: { _id: 1, name: '$category.name', count: 1 } },
            { $sort: { count: -1 } },
            { $limit: 20 }
        ])));
        return this.mergeFacetResults(results.flat());
    }
    static async getTagsFacet(baseMatch, filters) {
        const models = [];
        if (filters.contentType === 'both' || filters.contentType === 'post')
            models.push(Post_1.default);
        if (filters.contentType === 'both' || filters.contentType === 'page')
            models.push(Page_1.default);
        const results = await Promise.all(models.map(Model => Model.aggregate([
            { $match: baseMatch },
            { $unwind: '$tags' },
            { $group: { _id: '$tags', count: { $sum: 1 } } },
            { $lookup: { from: 'tags', localField: '_id', foreignField: '_id', as: 'tag' } },
            { $unwind: '$tag' },
            { $project: { _id: 1, name: '$tag.name', count: 1 } },
            { $sort: { count: -1 } },
            { $limit: 20 }
        ])));
        return this.mergeFacetResults(results.flat());
    }
    static async getAuthorsFacet(baseMatch, filters) {
        const models = [];
        if (filters.contentType === 'both' || filters.contentType === 'post')
            models.push(Post_1.default);
        if (filters.contentType === 'both' || filters.contentType === 'page')
            models.push(Page_1.default);
        const results = await Promise.all(models.map(Model => Model.aggregate([
            { $match: baseMatch },
            { $group: { _id: '$author', count: { $sum: 1 } } },
            { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
            { $unwind: '$user' },
            { $project: { _id: 1, username: '$user.username', count: 1 } },
            { $sort: { count: -1 } },
            { $limit: 20 }
        ])));
        return this.mergeFacetResults(results.flat());
    }
    static async getContentTypesFacet(baseMatch, filters) {
        const results = [];
        if (filters.contentType === 'both' || filters.contentType === 'post') {
            const postCount = await Post_1.default.countDocuments(baseMatch);
            if (postCount > 0)
                results.push({ type: 'post', count: postCount });
        }
        if (filters.contentType === 'both' || filters.contentType === 'page') {
            const pageCount = await Page_1.default.countDocuments(baseMatch);
            if (pageCount > 0)
                results.push({ type: 'page', count: pageCount });
        }
        return results;
    }
    static async getStatusesFacet(baseMatch, filters) {
        const models = [];
        if (filters.contentType === 'both' || filters.contentType === 'post')
            models.push(Post_1.default);
        if (filters.contentType === 'both' || filters.contentType === 'page')
            models.push(Page_1.default);
        const results = await Promise.all(models.map(Model => Model.aggregate([
            { $match: {} },
            { $group: { _id: '$status', count: { $sum: 1 } } },
            { $project: { status: '$_id', count: 1, _id: 0 } },
            { $sort: { count: -1 } }
        ])));
        return this.mergeFacetResults(results.flat(), 'status');
    }
    static mergeFacetResults(results, groupBy = '_id') {
        const merged = new Map();
        results.forEach(item => {
            const key = item[groupBy].toString();
            if (merged.has(key)) {
                merged.get(key).count += item.count;
            }
            else {
                merged.set(key, item);
            }
        });
        return Array.from(merged.values()).sort((a, b) => b.count - a.count);
    }
    static async getSuggestions(query) {
        try {
            const suggestions = new Set();
            const titleSuggestions = await Post_1.default.find({
                title: { $regex: query, $options: 'i' },
                status: 'published'
            })
                .select('title')
                .limit(5);
            titleSuggestions.forEach(post => {
                const words = post.title.toLowerCase().split(/\s+/);
                words.forEach(word => {
                    if (word.includes(query.toLowerCase()) && word !== query.toLowerCase()) {
                        suggestions.add(word);
                    }
                });
            });
            const [categories, tags] = await Promise.all([
                Category_1.default.find({
                    name: { $regex: query, $options: 'i' },
                    isActive: true
                }).select('name').limit(3),
                Tag_1.default.find({
                    name: { $regex: query, $options: 'i' },
                    isActive: true
                }).select('name').limit(3)
            ]);
            categories.forEach(cat => suggestions.add(cat.name));
            tags.forEach(tag => suggestions.add(tag.name));
            return Array.from(suggestions).slice(0, 5);
        }
        catch (error) {
            console.error('Error getting suggestions:', error);
            return [];
        }
    }
    static async getPopularSearches(limit = 10) {
        return [
            'javascript', 'react', 'nodejs', 'tutorial', 'guide',
            'tips', 'best practices', 'development', 'web', 'api'
        ].slice(0, limit);
    }
    static async getRelatedContent(contentId, contentType, limit = 5) {
        try {
            const Model = contentType === 'post' ? Post_1.default : Page_1.default;
            const content = await (0, mongooseHelper_1.safeFindById)(Model, contentId).populate('categories tags');
            if (!content) {
                return [];
            }
            const categoryIds = content.categories.map((c) => c._id);
            const tagIds = content.tags.map((t) => t._id);
            const related = await (0, mongooseHelper_1.safeFind)(Model, {
                _id: { $ne: contentId },
                status: 'published',
                $or: [
                    { categories: { $in: categoryIds } },
                    { tags: { $in: tagIds } }
                ]
            })
                .populate('author', 'username firstName lastName')
                .populate('categories', 'name slug color')
                .populate('tags', 'name slug color')
                .sort({ views: -1, createdAt: -1 })
                .limit(limit);
            return related;
        }
        catch (error) {
            throw new Error(`Failed to get related content: ${error.message}`);
        }
    }
}
exports.SearchService = SearchService;
exports.default = SearchService;
