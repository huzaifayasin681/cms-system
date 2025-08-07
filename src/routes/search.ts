import express from 'express';
import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { authenticate } from '../middleware/auth';
import SearchService from '../services/searchService';

const router = express.Router();

// Public search endpoint
router.get('/', async (req: Request, res: Response) => {
  try {
    const filters = {
      query: req.query.q as string,
      contentType: req.query.type as 'post' | 'page' | 'both',
      status: req.query.status ? (req.query.status as string).split(',') : ['published'],
      categories: req.query.categories ? (req.query.categories as string).split(',').map(id => new mongoose.Types.ObjectId(id.trim())) : [],
      tags: req.query.tags ? (req.query.tags as string).split(',').map(id => new mongoose.Types.ObjectId(id.trim())) : [],
      authors: req.query.authors ? (req.query.authors as string).split(',').map(id => new mongoose.Types.ObjectId(id.trim())) : [],
      dateRange: req.query.dateFrom || req.query.dateTo ? {
        from: req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined,
        to: req.query.dateTo ? new Date(req.query.dateTo as string) : undefined,
        field: (req.query.dateField as 'createdAt' | 'updatedAt' | 'publishedAt') || 'createdAt'
      } : undefined,
      sortBy: (req.query.sortBy as 'relevance' | 'date' | 'title' | 'views') || 'relevance',
      sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'desc',
      limit: parseInt(req.query.limit as string) || 20,
      offset: parseInt(req.query.offset as string) || 0
    };

    const results = await SearchService.search(filters);
    res.json(results);
  } catch (error) {
    res.status(500).json({ message: 'Search failed', error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Get popular searches
router.get('/popular', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const searches = await SearchService.getPopularSearches(limit);
    res.json(searches);
  } catch (error) {
    res.status(500).json({ message: 'Failed to get popular searches', error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Get related content (public)
router.get('/related/:contentType/:contentId', async (req: Request, res: Response) => {
  try {
    const { contentType, contentId } = req.params;
    const limit = parseInt(req.query.limit as string) || 5;

    if (contentType !== 'post' && contentType !== 'page') {
      return res.status(400).json({ message: 'Invalid content type' });
    }

    const related = await SearchService.getRelatedContent(
      contentId as any,
      contentType,
      limit
    );

    res.json(related);
  } catch (error) {
    res.status(500).json({ message: 'Failed to get related content', error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Protected routes (for admin searches including drafts, etc.)
router.use('/admin', authenticate);

router.get('/admin', async (req: Request, res: Response) => {
  try {
    const filters = {
      query: req.query.q as string,
      contentType: req.query.type as 'post' | 'page' | 'both',
      status: req.query.status ? (req.query.status as string).split(',') : undefined, // No default status filter for admin
      categories: req.query.categories ? (req.query.categories as string).split(',').map(id => new mongoose.Types.ObjectId(id.trim())) : [],
      tags: req.query.tags ? (req.query.tags as string).split(',').map(id => new mongoose.Types.ObjectId(id.trim())) : [],
      authors: req.query.authors ? (req.query.authors as string).split(',').map(id => new mongoose.Types.ObjectId(id.trim())) : [],
      dateRange: req.query.dateFrom || req.query.dateTo ? {
        from: req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined,
        to: req.query.dateTo ? new Date(req.query.dateTo as string) : undefined,
        field: (req.query.dateField as 'createdAt' | 'updatedAt' | 'publishedAt') || 'createdAt'
      } : undefined,
      sortBy: (req.query.sortBy as 'relevance' | 'date' | 'title' | 'views') || 'relevance',
      sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'desc',
      limit: parseInt(req.query.limit as string) || 20,
      offset: parseInt(req.query.offset as string) || 0
    };

    const results = await SearchService.search(filters);
    res.json(results);
  } catch (error) {
    res.status(500).json({ message: 'Admin search failed', error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

export default router;