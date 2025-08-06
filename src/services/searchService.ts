import mongoose from 'mongoose';
import Post from '../models/Post';
import Page from '../models/Page';
import Category from '../models/Category';
import Tag from '../models/Tag';
import User from '../models/User';

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
    categories: Array<{ _id: mongoose.Types.ObjectId; name: string; count: number }>;
    tags: Array<{ _id: mongoose.Types.ObjectId; name: string; count: number }>;
    authors: Array<{ _id: mongoose.Types.ObjectId; username: string; count: number }>;
    contentTypes: Array<{ type: string; count: number }>;
    statuses: Array<{ status: string; count: number }>;
  };
  suggestions?: string[];
}

export class SearchService {
  /**
   * Perform advanced content search
   */
  static async search(filters: ISearchFilters): Promise<ISearchResponse> {
    try {
      const {
        query = '',
        contentType = 'both',
        status = ['published'],
        categories = [],
        tags = [],
        authors = [],
        dateRange,
        sortBy = 'relevance',
        sortOrder = 'desc',
        limit = 20,
        offset = 0
      } = filters;

      // Build search pipeline
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

      // Execute search for posts and pages
      const searchPromises = [];
      
      if (contentType === 'both' || contentType === 'post') {
        searchPromises.push(this.searchCollection(Post, 'post', pipeline));
      }
      
      if (contentType === 'both' || contentType === 'page') {
        searchPromises.push(this.searchCollection(Page, 'page', pipeline));
      }

      const searchResults = await Promise.all(searchPromises);
      const allResults = searchResults.flat();

      // Sort combined results if needed
      if (contentType === 'both') {
        allResults.sort(this.getSortComparator(sortBy, sortOrder));
      }

      // Apply pagination to combined results
      const paginatedResults = allResults.slice(offset, offset + limit);

      // Get facets
      const facets = await this.getFacets(filters);

      // Get suggestions for empty results
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
    } catch (error) {
      throw new Error(`Search failed: ${error.message}`);
    }
  }

  /**
   * Search within a specific collection
   */
  private static async searchCollection(
    Model: any,
    contentType: 'post' | 'page',
    basePipeline: any[]
  ): Promise<ISearchResult[]> {
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

  /**
   * Build search pipeline
   */
  private static buildSearchPipeline(filters: any): any[] {
    const pipeline: any[] = [];

    // Text search
    if (filters.query) {
      pipeline.push({
        $match: {
          $text: { $search: filters.query }
        }
      });
    }

    // Build match conditions
    const matchConditions: any = {};

    // Status filter
    if (filters.status.length > 0) {
      matchConditions.status = { $in: filters.status };
    }

    // Categories filter
    if (filters.categories.length > 0) {
      matchConditions.categories = { $in: filters.categories };
    }

    // Tags filter
    if (filters.tags.length > 0) {
      matchConditions.tags = { $in: filters.tags };
    }

    // Authors filter
    if (filters.authors.length > 0) {
      matchConditions.author = { $in: filters.authors };
    }

    // Date range filter
    if (filters.dateRange) {
      const { from, to, field = 'createdAt' } = filters.dateRange;
      const dateFilter: any = {};
      
      if (from) dateFilter.$gte = from;
      if (to) dateFilter.$lte = to;
      
      if (Object.keys(dateFilter).length > 0) {
        matchConditions[field] = dateFilter;
      }
    }

    // Add match stage if there are conditions
    if (Object.keys(matchConditions).length > 0) {
      pipeline.push({ $match: matchConditions });
    }

    // Sorting
    const sortStage = this.getSortStage(filters.sortBy, filters.sortOrder);
    if (sortStage) {
      pipeline.push(sortStage);
    }

    return pipeline;
  }

  /**
   * Get sort stage for aggregation
   */
  private static getSortStage(sortBy: string, sortOrder: string): any {
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

  /**
   * Get sort comparator for in-memory sorting
   */
  private static getSortComparator(sortBy: string, sortOrder: string) {
    const direction = sortOrder === 'asc' ? 1 : -1;

    return (a: any, b: any) => {
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

  /**
   * Get search facets
   */
  private static async getFacets(filters: ISearchFilters) {
    try {
      const baseMatch: any = {};
      
      if (filters.status && filters.status.length > 0) {
        baseMatch.status = { $in: filters.status };
      }

      const [categoriesData, tagsData, authorsData, contentTypesData, statusesData] = await Promise.all([
        // Categories facet
        this.getCategoriesFacet(baseMatch, filters),
        // Tags facet
        this.getTagsFacet(baseMatch, filters),
        // Authors facet
        this.getAuthorsFacet(baseMatch, filters),
        // Content types facet
        this.getContentTypesFacet(baseMatch, filters),
        // Statuses facet
        this.getStatusesFacet(baseMatch, filters)
      ]);

      return {
        categories: categoriesData,
        tags: tagsData,
        authors: authorsData,
        contentTypes: contentTypesData,
        statuses: statusesData
      };
    } catch (error) {
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

  private static async getCategoriesFacet(baseMatch: any, filters: ISearchFilters) {
    const models = [];
    if (filters.contentType === 'both' || filters.contentType === 'post') models.push(Post);
    if (filters.contentType === 'both' || filters.contentType === 'page') models.push(Page);

    const results = await Promise.all(
      models.map(Model => 
        Model.aggregate([
          { $match: baseMatch },
          { $unwind: '$categories' },
          { $group: { _id: '$categories', count: { $sum: 1 } } },
          { $lookup: { from: 'categories', localField: '_id', foreignField: '_id', as: 'category' } },
          { $unwind: '$category' },
          { $project: { _id: 1, name: '$category.name', count: 1 } },
          { $sort: { count: -1 } },
          { $limit: 20 }
        ])
      )
    );

    return this.mergeFacetResults(results.flat());
  }

  private static async getTagsFacet(baseMatch: any, filters: ISearchFilters) {
    const models = [];
    if (filters.contentType === 'both' || filters.contentType === 'post') models.push(Post);
    if (filters.contentType === 'both' || filters.contentType === 'page') models.push(Page);

    const results = await Promise.all(
      models.map(Model => 
        Model.aggregate([
          { $match: baseMatch },
          { $unwind: '$tags' },
          { $group: { _id: '$tags', count: { $sum: 1 } } },
          { $lookup: { from: 'tags', localField: '_id', foreignField: '_id', as: 'tag' } },
          { $unwind: '$tag' },
          { $project: { _id: 1, name: '$tag.name', count: 1 } },
          { $sort: { count: -1 } },
          { $limit: 20 }
        ])
      )
    );

    return this.mergeFacetResults(results.flat());
  }

  private static async getAuthorsFacet(baseMatch: any, filters: ISearchFilters) {
    const models = [];
    if (filters.contentType === 'both' || filters.contentType === 'post') models.push(Post);
    if (filters.contentType === 'both' || filters.contentType === 'page') models.push(Page);

    const results = await Promise.all(
      models.map(Model => 
        Model.aggregate([
          { $match: baseMatch },
          { $group: { _id: '$author', count: { $sum: 1 } } },
          { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
          { $unwind: '$user' },
          { $project: { _id: 1, username: '$user.username', count: 1 } },
          { $sort: { count: -1 } },
          { $limit: 20 }
        ])
      )
    );

    return this.mergeFacetResults(results.flat());
  }

  private static async getContentTypesFacet(baseMatch: any, filters: ISearchFilters) {
    const results = [];
    
    if (filters.contentType === 'both' || filters.contentType === 'post') {
      const postCount = await Post.countDocuments(baseMatch);
      if (postCount > 0) results.push({ type: 'post', count: postCount });
    }
    
    if (filters.contentType === 'both' || filters.contentType === 'page') {
      const pageCount = await Page.countDocuments(baseMatch);
      if (pageCount > 0) results.push({ type: 'page', count: pageCount });
    }

    return results;
  }

  private static async getStatusesFacet(baseMatch: any, filters: ISearchFilters) {
    const models = [];
    if (filters.contentType === 'both' || filters.contentType === 'post') models.push(Post);
    if (filters.contentType === 'both' || filters.contentType === 'page') models.push(Page);

    const results = await Promise.all(
      models.map(Model => 
        Model.aggregate([
          { $match: {} }, // Remove status filter for status facet
          { $group: { _id: '$status', count: { $sum: 1 } } },
          { $project: { status: '$_id', count: 1, _id: 0 } },
          { $sort: { count: -1 } }
        ])
      )
    );

    return this.mergeFacetResults(results.flat(), 'status');
  }

  /**
   * Merge facet results from multiple collections
   */
  private static mergeFacetResults(results: any[], groupBy = '_id') {
    const merged = new Map();
    
    results.forEach(item => {
      const key = item[groupBy].toString();
      if (merged.has(key)) {
        merged.get(key).count += item.count;
      } else {
        merged.set(key, item);
      }
    });

    return Array.from(merged.values()).sort((a, b) => b.count - a.count);
  }

  /**
   * Get search suggestions
   */
  private static async getSuggestions(query: string): Promise<string[]> {
    try {
      // Simple implementation - you can enhance this with more sophisticated algorithms
      const suggestions = new Set<string>();

      // Get suggestions from titles
      const titleSuggestions = await Post.find({
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

      // Get suggestions from categories and tags
      const [categories, tags] = await Promise.all([
        Category.find({
          name: { $regex: query, $options: 'i' },
          isActive: true
        }).select('name').limit(3),
        Tag.find({
          name: { $regex: query, $options: 'i' },
          isActive: true
        }).select('name').limit(3)
      ]);

      categories.forEach(cat => suggestions.add(cat.name));
      tags.forEach(tag => suggestions.add(tag.name));

      return Array.from(suggestions).slice(0, 5);
    } catch (error) {
      console.error('Error getting suggestions:', error);
      return [];
    }
  }

  /**
   * Get popular searches
   */
  static async getPopularSearches(limit: number = 10) {
    // This would require storing search queries - implement based on your analytics needs
    // For now, return some common terms
    return [
      'javascript', 'react', 'nodejs', 'tutorial', 'guide',
      'tips', 'best practices', 'development', 'web', 'api'
    ].slice(0, limit);
  }

  /**
   * Get related content
   */
  static async getRelatedContent(
    contentId: mongoose.Types.ObjectId,
    contentType: 'post' | 'page',
    limit: number = 5
  ) {
    try {
      const Model = contentType === 'post' ? Post : Page;
      const content = await Model.findById(contentId).populate('categories tags');

      if (!content) {
        return [];
      }

      const categoryIds = content.categories.map((c: any) => c._id);
      const tagIds = content.tags.map((t: any) => t._id);

      const related = await Model.find({
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
    } catch (error) {
      throw new Error(`Failed to get related content: ${error.message}`);
    }
  }
}

export default SearchService;