"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const mongoose_1 = __importDefault(require("mongoose"));
const auth_1 = require("../middleware/auth");
const searchService_1 = __importDefault(require("../services/searchService"));
const router = express_1.default.Router();
router.get('/', async (req, res) => {
    try {
        const filters = {
            query: req.query.q,
            contentType: req.query.type,
            status: req.query.status ? req.query.status.split(',') : ['published'],
            categories: req.query.categories ? req.query.categories.split(',').map(id => new mongoose_1.default.Types.ObjectId(id.trim())) : [],
            tags: req.query.tags ? req.query.tags.split(',').map(id => new mongoose_1.default.Types.ObjectId(id.trim())) : [],
            authors: req.query.authors ? req.query.authors.split(',').map(id => new mongoose_1.default.Types.ObjectId(id.trim())) : [],
            dateRange: req.query.dateFrom || req.query.dateTo ? {
                from: req.query.dateFrom ? new Date(req.query.dateFrom) : undefined,
                to: req.query.dateTo ? new Date(req.query.dateTo) : undefined,
                field: req.query.dateField || 'createdAt'
            } : undefined,
            sortBy: req.query.sortBy || 'relevance',
            sortOrder: req.query.sortOrder || 'desc',
            limit: parseInt(req.query.limit) || 20,
            offset: parseInt(req.query.offset) || 0
        };
        const results = await searchService_1.default.search(filters);
        res.json(results);
    }
    catch (error) {
        res.status(500).json({ message: 'Search failed', error: error instanceof Error ? error.message : 'Unknown error' });
    }
});
router.get('/popular', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const searches = await searchService_1.default.getPopularSearches(limit);
        res.json(searches);
    }
    catch (error) {
        res.status(500).json({ message: 'Failed to get popular searches', error: error instanceof Error ? error.message : 'Unknown error' });
    }
});
router.get('/related/:contentType/:contentId', async (req, res) => {
    try {
        const { contentType, contentId } = req.params;
        const limit = parseInt(req.query.limit) || 5;
        if (contentType !== 'post' && contentType !== 'page') {
            return res.status(400).json({ message: 'Invalid content type' });
        }
        const related = await searchService_1.default.getRelatedContent(contentId, contentType, limit);
        res.json(related);
    }
    catch (error) {
        res.status(500).json({ message: 'Failed to get related content', error: error instanceof Error ? error.message : 'Unknown error' });
    }
});
router.use('/admin', auth_1.authenticate);
router.get('/admin', async (req, res) => {
    try {
        const filters = {
            query: req.query.q,
            contentType: req.query.type,
            status: req.query.status ? req.query.status.split(',') : undefined,
            categories: req.query.categories ? req.query.categories.split(',').map(id => new mongoose_1.default.Types.ObjectId(id.trim())) : [],
            tags: req.query.tags ? req.query.tags.split(',').map(id => new mongoose_1.default.Types.ObjectId(id.trim())) : [],
            authors: req.query.authors ? req.query.authors.split(',').map(id => new mongoose_1.default.Types.ObjectId(id.trim())) : [],
            dateRange: req.query.dateFrom || req.query.dateTo ? {
                from: req.query.dateFrom ? new Date(req.query.dateFrom) : undefined,
                to: req.query.dateTo ? new Date(req.query.dateTo) : undefined,
                field: req.query.dateField || 'createdAt'
            } : undefined,
            sortBy: req.query.sortBy || 'relevance',
            sortOrder: req.query.sortOrder || 'desc',
            limit: parseInt(req.query.limit) || 20,
            offset: parseInt(req.query.offset) || 0
        };
        const results = await searchService_1.default.search(filters);
        res.json(results);
    }
    catch (error) {
        res.status(500).json({ message: 'Admin search failed', error: error instanceof Error ? error.message : 'Unknown error' });
    }
});
exports.default = router;
