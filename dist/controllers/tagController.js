"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateTagUsageCounts = exports.suggestTags = exports.getTagStats = exports.mergeTags = exports.bulkDeleteTags = exports.bulkCreateTags = exports.deleteTag = exports.updateTag = exports.createTag = exports.getTagBySlug = exports.getTag = exports.getPopularTags = exports.getTags = void 0;
const Tag_1 = __importDefault(require("../models/Tag"));
const Post_1 = __importDefault(require("../models/Post"));
const Page_1 = __importDefault(require("../models/Page"));
const getTags = async (req, res) => {
    try {
        const { page = 1, limit = 50, search = '', isActive, sortBy = 'name', sortOrder = 'asc' } = req.query;
        const filter = {};
        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }
        if (isActive !== undefined) {
            filter.isActive = isActive === 'true';
        }
        const sortOptions = {};
        if (sortBy === 'usage') {
            sortOptions.postCount = sortOrder === 'desc' ? -1 : 1;
        }
        else {
            sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;
        }
        const tags = await Tag_1.default.find(filter)
            .populate('createdBy', 'username email firstName lastName')
            .sort(sortOptions)
            .limit(parseInt(limit))
            .skip((parseInt(page) - 1) * parseInt(limit));
        const total = await Tag_1.default.countDocuments(filter);
        res.json({
            tags,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                totalPages: Math.ceil(total / parseInt(limit))
            }
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching tags', error: error instanceof Error ? error.message : 'Unknown error' });
    }
};
exports.getTags = getTags;
const getPopularTags = async (req, res) => {
    try {
        const { limit = 20 } = req.query;
        const tags = await Tag_1.default.find({ isActive: true })
            .sort({ postCount: -1, pageCount: -1 })
            .limit(parseInt(limit))
            .select('name slug color postCount pageCount');
        res.json(tags);
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching popular tags', error: error instanceof Error ? error.message : 'Unknown error' });
    }
};
exports.getPopularTags = getPopularTags;
const getTag = async (req, res) => {
    try {
        const tag = await Tag_1.default.findById(req.params.id)
            .populate('createdBy', 'username email firstName lastName');
        if (!tag) {
            return res.status(404).json({ message: 'Tag not found' });
        }
        res.json(tag);
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching tag', error: error instanceof Error ? error.message : 'Unknown error' });
    }
};
exports.getTag = getTag;
const getTagBySlug = async (req, res) => {
    try {
        const tag = await Tag_1.default.findOne({ slug: req.params.slug })
            .populate('createdBy', 'username email firstName lastName');
        if (!tag) {
            return res.status(404).json({ message: 'Tag not found' });
        }
        res.json(tag);
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching tag', error: error instanceof Error ? error.message : 'Unknown error' });
    }
};
exports.getTagBySlug = getTagBySlug;
const createTag = async (req, res) => {
    try {
        const { name, description, color } = req.body;
        const userId = req.user.id;
        const existingTag = await Tag_1.default.findOne({
            name: { $regex: new RegExp(`^${name}$`, 'i') }
        });
        if (existingTag) {
            return res.status(400).json({ message: 'Tag with this name already exists' });
        }
        const tag = new Tag_1.default({
            name,
            description,
            color,
            createdBy: userId
        });
        await tag.save();
        await tag.populate('createdBy', 'username email firstName lastName');
        res.status(201).json(tag);
    }
    catch (error) {
        res.status(500).json({ message: 'Error creating tag', error: error instanceof Error ? error.message : 'Unknown error' });
    }
};
exports.createTag = createTag;
const updateTag = async (req, res) => {
    try {
        const { name, description, color, isActive } = req.body;
        if (name) {
            const existingTag = await Tag_1.default.findOne({
                name: { $regex: new RegExp(`^${name}$`, 'i') },
                _id: { $ne: req.params.id }
            });
            if (existingTag) {
                return res.status(400).json({ message: 'Tag with this name already exists' });
            }
        }
        const tag = await Tag_1.default.findByIdAndUpdate(req.params.id, { name, description, color, isActive }, { new: true, runValidators: true }).populate('createdBy', 'username email firstName lastName');
        if (!tag) {
            return res.status(404).json({ message: 'Tag not found' });
        }
        res.json(tag);
    }
    catch (error) {
        res.status(500).json({ message: 'Error updating tag', error: error instanceof Error ? error.message : 'Unknown error' });
    }
};
exports.updateTag = updateTag;
const deleteTag = async (req, res) => {
    try {
        const tag = await Tag_1.default.findById(req.params.id);
        if (!tag) {
            return res.status(404).json({ message: 'Tag not found' });
        }
        const [postsCount, pagesCount] = await Promise.all([
            Post_1.default.countDocuments({ tags: req.params.id }),
            Page_1.default.countDocuments({ tags: req.params.id })
        ]);
        if (postsCount > 0 || pagesCount > 0) {
            return res.status(400).json({
                message: `Cannot delete tag. It is used by ${postsCount} posts and ${pagesCount} pages.`
            });
        }
        await Tag_1.default.findByIdAndDelete(req.params.id);
        res.json({ message: 'Tag deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ message: 'Error deleting tag', error: error instanceof Error ? error.message : 'Unknown error' });
    }
};
exports.deleteTag = deleteTag;
const bulkCreateTags = async (req, res) => {
    try {
        const { tags } = req.body;
        const userId = req.user.id;
        if (!tags || !Array.isArray(tags) || tags.length === 0) {
            return res.status(400).json({ message: 'Tags array is required' });
        }
        const createdTags = [];
        const errors = [];
        for (const tagData of tags) {
            try {
                const { name, description, color } = tagData;
                const existingTag = await Tag_1.default.findOne({
                    name: { $regex: new RegExp(`^${name}$`, 'i') }
                });
                if (existingTag) {
                    errors.push(`Tag "${name}" already exists`);
                    continue;
                }
                const tag = new Tag_1.default({
                    name,
                    description,
                    color,
                    createdBy: userId
                });
                await tag.save();
                createdTags.push(tag);
            }
            catch (error) {
                errors.push(`Error creating tag "${tagData.name}": ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        }
        res.status(201).json({
            message: `${createdTags.length} tags created successfully`,
            createdTags,
            errors: errors.length > 0 ? errors : undefined
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Error creating tags', error: error instanceof Error ? error.message : 'Unknown error' });
    }
};
exports.bulkCreateTags = bulkCreateTags;
const bulkDeleteTags = async (req, res) => {
    try {
        const { tagIds } = req.body;
        if (!tagIds || !Array.isArray(tagIds) || tagIds.length === 0) {
            return res.status(400).json({ message: 'Tag IDs are required' });
        }
        const [postsCount, pagesCount] = await Promise.all([
            Post_1.default.countDocuments({ tags: { $in: tagIds } }),
            Page_1.default.countDocuments({ tags: { $in: tagIds } })
        ]);
        if (postsCount > 0 || pagesCount > 0) {
            return res.status(400).json({
                message: `Cannot delete tags. They are used by ${postsCount} posts and ${pagesCount} pages.`
            });
        }
        const result = await Tag_1.default.deleteMany({ _id: { $in: tagIds } });
        res.json({
            message: `${result.deletedCount} tags deleted successfully`,
            deletedCount: result.deletedCount
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Error deleting tags', error: error instanceof Error ? error.message : 'Unknown error' });
    }
};
exports.bulkDeleteTags = bulkDeleteTags;
const mergeTags = async (req, res) => {
    try {
        const { sourceTagIds, targetTagId } = req.body;
        if (!sourceTagIds || !Array.isArray(sourceTagIds) || !targetTagId) {
            return res.status(400).json({ message: 'Source tag IDs and target tag ID are required' });
        }
        const targetTag = await Tag_1.default.findById(targetTagId);
        if (!targetTag) {
            return res.status(404).json({ message: 'Target tag not found' });
        }
        await Promise.all([
            Post_1.default.updateMany({ tags: { $in: sourceTagIds } }, {
                $pull: { tags: { $in: sourceTagIds } },
                $addToSet: { tags: targetTagId }
            }),
            Page_1.default.updateMany({ tags: { $in: sourceTagIds } }, {
                $pull: { tags: { $in: sourceTagIds } },
                $addToSet: { tags: targetTagId }
            })
        ]);
        const deleteResult = await Tag_1.default.deleteMany({ _id: { $in: sourceTagIds } });
        const [newPostCount, newPageCount] = await Promise.all([
            Post_1.default.countDocuments({ tags: targetTagId }),
            Page_1.default.countDocuments({ tags: targetTagId })
        ]);
        await Tag_1.default.findByIdAndUpdate(targetTagId, {
            postCount: newPostCount,
            pageCount: newPageCount
        });
        res.json({
            message: `Successfully merged ${deleteResult.deletedCount} tags into "${targetTag.name}"`,
            mergedCount: deleteResult.deletedCount,
            targetTag: targetTag.name
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Error merging tags', error: error instanceof Error ? error.message : 'Unknown error' });
    }
};
exports.mergeTags = mergeTags;
const getTagStats = async (req, res) => {
    try {
        const tagId = req.params.id;
        const [postsCount, pagesCount] = await Promise.all([
            Post_1.default.countDocuments({ tags: tagId }),
            Page_1.default.countDocuments({ tags: tagId })
        ]);
        await Tag_1.default.findByIdAndUpdate(tagId, {
            postCount: postsCount,
            pageCount: pagesCount
        });
        res.json({
            postsCount,
            pagesCount,
            totalContent: postsCount + pagesCount
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching tag stats', error: error instanceof Error ? error.message : 'Unknown error' });
    }
};
exports.getTagStats = getTagStats;
const suggestTags = async (req, res) => {
    try {
        const { content, title } = req.body;
        if (!content && !title) {
            return res.status(400).json({ message: 'Content or title is required' });
        }
        const text = `${title || ''} ${content || ''}`.toLowerCase();
        const words = text.match(/\b\w{3,}\b/g) || [];
        const wordFreq = words.reduce((acc, word) => {
            acc[word] = (acc[word] || 0) + 1;
            return acc;
        }, {});
        const frequentWords = Object.keys(wordFreq)
            .sort((a, b) => wordFreq[b] - wordFreq[a])
            .slice(0, 20);
        const matchingTags = await Tag_1.default.find({
            name: { $in: frequentWords },
            isActive: true
        }).select('name slug color postCount').sort({ postCount: -1 });
        const existingTagNames = matchingTags.map(tag => tag.name.toLowerCase());
        const suggestedNewTags = frequentWords
            .filter(word => !existingTagNames.includes(word) &&
            word.length >= 3 &&
            wordFreq[word] >= 2)
            .slice(0, 5);
        res.json({
            existingTags: matchingTags,
            suggestedNewTags
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Error suggesting tags', error: error instanceof Error ? error.message : 'Unknown error' });
    }
};
exports.suggestTags = suggestTags;
const updateTagUsageCounts = async (req, res) => {
    try {
        const tags = await Tag_1.default.find();
        let updatedCount = 0;
        for (const tag of tags) {
            const [postsCount, pagesCount] = await Promise.all([
                Post_1.default.countDocuments({ tags: tag._id }),
                Page_1.default.countDocuments({ tags: tag._id })
            ]);
            if (tag.postCount !== postsCount || tag.pageCount !== pagesCount) {
                await Tag_1.default.findByIdAndUpdate(tag._id, {
                    postCount: postsCount,
                    pageCount: pagesCount
                });
                updatedCount++;
            }
        }
        res.json({
            message: `Updated usage counts for ${updatedCount} tags`,
            totalTags: tags.length,
            updatedCount
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Error updating tag counts', error: error instanceof Error ? error.message : 'Unknown error' });
    }
};
exports.updateTagUsageCounts = updateTagUsageCounts;
