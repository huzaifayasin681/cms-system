"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.savePostDraft = exports.toggleLike = exports.deletePost = exports.updatePost = exports.getPost = exports.getPosts = exports.createPost = void 0;
const express_validator_1 = require("express-validator");
const mongoose_1 = require("mongoose");
const Post_1 = __importDefault(require("../models/Post"));
const isValidObjectId = (id) => {
    return Boolean(id && id !== 'undefined' && id !== 'null' && mongoose_1.Types.ObjectId.isValid(id));
};
const createPost = async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation errors',
                errors: errors.array()
            });
        }
        const postData = {
            ...req.body,
            author: req.user._id
        };
        const post = new Post_1.default(postData);
        await post.save();
        await post.populate('author', 'username email firstName lastName avatar');
        res.status(201).json({
            success: true,
            message: 'Post created successfully',
            post
        });
    }
    catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'Post with this slug already exists'
            });
        }
        console.error('Create post error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error creating post'
        });
    }
};
exports.createPost = createPost;
const getPosts = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const { status, author, tags, categories, search, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
        const filter = {};
        if (status) {
            filter.status = status;
        }
        if (author) {
            filter.author = author;
        }
        if (tags) {
            filter.tags = { $in: Array.isArray(tags) ? tags : [tags] };
        }
        if (categories) {
            filter.categories = { $in: Array.isArray(categories) ? categories : [categories] };
        }
        if (search) {
            filter.$or = [
                { title: { $regex: search, $options: 'i' } },
                { content: { $regex: search, $options: 'i' } },
                { excerpt: { $regex: search, $options: 'i' } }
            ];
        }
        const sort = {};
        sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
        const [posts, total] = await Promise.all([
            Post_1.default.find(filter)
                .populate('author', 'username email firstName lastName avatar')
                .sort(sort)
                .skip(skip)
                .limit(limit),
            Post_1.default.countDocuments(filter)
        ]);
        const totalPages = Math.ceil(total / limit);
        res.json({
            success: true,
            posts,
            pagination: {
                currentPage: page,
                totalPages,
                totalPosts: total,
                hasNext: page < totalPages,
                hasPrev: page > 1
            }
        });
    }
    catch (error) {
        console.error('Get posts error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching posts'
        });
    }
};
exports.getPosts = getPosts;
const getPost = async (req, res) => {
    try {
        const { id } = req.params;
        if (!isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid post ID provided'
            });
        }
        const post = await Post_1.default.findOne({
            $or: [
                { _id: id },
                { slug: id }
            ]
        })
            .populate('author', 'username email firstName lastName avatar')
            .populate('likes', 'username');
        if (!post) {
            return res.status(404).json({
                success: false,
                message: 'Post not found'
            });
        }
        post.views += 1;
        await post.save();
        res.json({
            success: true,
            post
        });
    }
    catch (error) {
        console.error('Get post error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching post'
        });
    }
};
exports.getPost = getPost;
const updatePost = async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation errors',
                errors: errors.array()
            });
        }
        const { id } = req.params;
        if (!isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid post ID provided'
            });
        }
        const post = await Post_1.default.findById(id);
        if (!post) {
            return res.status(404).json({
                success: false,
                message: 'Post not found'
            });
        }
        if (post.author.toString() !== req.user._id.toString() && req.user.role !== 'admin' && req.user.role !== 'superadmin') {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to update this post'
            });
        }
        if (req.body.content && req.body.content !== post.content) {
            post.contentHistory.push({
                content: post.content,
                savedAt: new Date(),
                savedBy: req.user._id
            });
        }
        Object.assign(post, req.body);
        await post.save();
        await post.populate('author', 'username email firstName lastName avatar');
        res.json({
            success: true,
            message: 'Post updated successfully',
            post
        });
    }
    catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'Post with this slug already exists'
            });
        }
        console.error('Update post error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error updating post'
        });
    }
};
exports.updatePost = updatePost;
const deletePost = async (req, res) => {
    try {
        const { id } = req.params;
        if (!isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid post ID provided'
            });
        }
        const post = await Post_1.default.findById(id);
        if (!post) {
            return res.status(404).json({
                success: false,
                message: 'Post not found'
            });
        }
        if (post.author.toString() !== req.user._id.toString() && req.user.role !== 'admin' && req.user.role !== 'superadmin') {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to delete this post'
            });
        }
        await Post_1.default.findByIdAndDelete(id);
        res.json({
            success: true,
            message: 'Post deleted successfully'
        });
    }
    catch (error) {
        console.error('Delete post error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error deleting post'
        });
    }
};
exports.deletePost = deletePost;
const toggleLike = async (req, res) => {
    try {
        const { id } = req.params;
        if (!isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid post ID provided'
            });
        }
        const post = await Post_1.default.findById(id);
        if (!post) {
            return res.status(404).json({
                success: false,
                message: 'Post not found'
            });
        }
        const likeIndex = post.likes.indexOf(req.user._id);
        if (likeIndex > -1) {
            post.likes.splice(likeIndex, 1);
        }
        else {
            post.likes.push(req.user._id);
        }
        await post.save();
        res.json({
            success: true,
            message: likeIndex > -1 ? 'Post unliked' : 'Post liked',
            likesCount: post.likes.length,
            isLiked: likeIndex === -1
        });
    }
    catch (error) {
        console.error('Toggle like error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error toggling like'
        });
    }
};
exports.toggleLike = toggleLike;
const savePostDraft = async (req, res) => {
    try {
        const { id } = req.params;
        const { content } = req.body;
        if (!isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid post ID provided'
            });
        }
        if (!content) {
            return res.status(400).json({
                success: false,
                message: 'Content is required'
            });
        }
        const post = await Post_1.default.findById(id);
        if (!post) {
            return res.status(404).json({
                success: false,
                message: 'Post not found'
            });
        }
        if (post.author.toString() !== req.user._id.toString() && req.user.role !== 'admin' && req.user.role !== 'superadmin') {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to save draft for this post'
            });
        }
        post.contentHistory.push({
            content,
            savedAt: new Date(),
            savedBy: req.user._id
        });
        await post.save();
        res.json({
            success: true,
            message: 'Draft saved successfully'
        });
    }
    catch (error) {
        console.error('Save draft error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error saving draft'
        });
    }
};
exports.savePostDraft = savePostDraft;
//# sourceMappingURL=postController.js.map