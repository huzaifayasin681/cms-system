"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteComment = exports.toggleCommentLike = exports.createComment = exports.getComments = void 0;
const express_validator_1 = require("express-validator");
const mongoose_1 = require("mongoose");
const Comment_1 = __importDefault(require("../models/Comment"));
const Post_1 = __importDefault(require("../models/Post"));
const activityController_1 = require("./activityController");
const isValidObjectId = (id) => {
    return Boolean(id && id !== 'undefined' && id !== 'null' && mongoose_1.Types.ObjectId.isValid(id));
};
const getComments = async (req, res) => {
    try {
        const { postId } = req.params;
        const { page = 1, limit = 20, sort = 'newest' } = req.query;
        if (!isValidObjectId(postId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid post ID provided'
            });
        }
        const post = await Post_1.default.findById(postId);
        if (!post) {
            return res.status(404).json({
                success: false,
                message: 'Post not found'
            });
        }
        const sortOptions = {
            newest: { createdAt: -1 },
            oldest: { createdAt: 1 },
            popular: { likes: -1, createdAt: -1 }
        };
        const skip = (Number(page) - 1) * Number(limit);
        const comments = await Comment_1.default.find({
            post: postId,
            parentComment: { $exists: false },
            status: 'approved'
        })
            .populate('author', 'username avatar')
            .populate({
            path: 'replies',
            populate: {
                path: 'author',
                select: 'username avatar'
            },
            match: { status: 'approved' },
            options: { sort: { createdAt: 1 } }
        })
            .sort(sortOptions[sort] || sortOptions.newest)
            .skip(skip)
            .limit(Number(limit));
        const total = await Comment_1.default.countDocuments({
            post: postId,
            parentComment: { $exists: false },
            status: 'approved'
        });
        res.json({
            success: true,
            data: {
                comments,
                pagination: {
                    page: Number(page),
                    limit: Number(limit),
                    total,
                    pages: Math.ceil(total / Number(limit))
                }
            }
        });
    }
    catch (error) {
        console.error('Get comments error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch comments'
        });
    }
};
exports.getComments = getComments;
const createComment = async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation errors',
                errors: errors.array()
            });
        }
        const { postId } = req.params;
        const { content, parentComment } = req.body;
        if (!isValidObjectId(postId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid post ID provided'
            });
        }
        const post = await Post_1.default.findById(postId);
        if (!post) {
            return res.status(404).json({
                success: false,
                message: 'Post not found'
            });
        }
        if (parentComment) {
            const parent = await Comment_1.default.findById(parentComment);
            if (!parent || parent.post.toString() !== postId) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid parent comment'
                });
            }
        }
        const comment = new Comment_1.default({
            content,
            author: req.user._id,
            post: postId,
            parentComment: parentComment || undefined,
            status: 'approved'
        });
        await comment.save();
        if (parentComment) {
            await Comment_1.default.findByIdAndUpdate(parentComment, {
                $push: { replies: comment._id }
            });
        }
        await comment.populate('author', 'username avatar');
        await (0, activityController_1.logActivity)({
            type: 'user',
            action: `commented on post "${post.title}"`,
            userId: req.user._id.toString(),
            userDetails: {
                username: req.user.username,
                firstName: req.user.firstName,
                lastName: req.user.lastName
            },
            metadata: {
                postId: post._id,
                postTitle: post.title,
                commentId: comment._id,
                isReply: !!parentComment
            },
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        });
        res.status(201).json({
            success: true,
            message: 'Comment created successfully',
            data: comment
        });
    }
    catch (error) {
        console.error('Create comment error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create comment'
        });
    }
};
exports.createComment = createComment;
const toggleCommentLike = async (req, res) => {
    try {
        const { commentId } = req.params;
        if (!isValidObjectId(commentId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid comment ID provided'
            });
        }
        const comment = await Comment_1.default.findById(commentId);
        if (!comment) {
            return res.status(404).json({
                success: false,
                message: 'Comment not found'
            });
        }
        const userId = req.user._id;
        const hasLiked = comment.likes.includes(userId);
        if (hasLiked) {
            comment.likes = comment.likes.filter(id => !id.equals(userId));
        }
        else {
            comment.likes.push(userId);
        }
        await comment.save();
        res.json({
            success: true,
            data: {
                liked: !hasLiked,
                likesCount: comment.likes.length
            }
        });
    }
    catch (error) {
        console.error('Toggle comment like error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to toggle comment like'
        });
    }
};
exports.toggleCommentLike = toggleCommentLike;
const deleteComment = async (req, res) => {
    try {
        const { commentId } = req.params;
        if (!isValidObjectId(commentId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid comment ID provided'
            });
        }
        const comment = await Comment_1.default.findById(commentId);
        if (!comment) {
            return res.status(404).json({
                success: false,
                message: 'Comment not found'
            });
        }
        const canDelete = comment.author.equals(req.user._id) || req.user.role === 'admin' || req.user.role === 'superadmin';
        if (!canDelete) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to delete this comment'
            });
        }
        if (comment.parentComment) {
            await Comment_1.default.findByIdAndUpdate(comment.parentComment, {
                $pull: { replies: comment._id }
            });
        }
        await Comment_1.default.deleteMany({ parentComment: commentId });
        await Comment_1.default.findByIdAndDelete(commentId);
        res.json({
            success: true,
            message: 'Comment deleted successfully'
        });
    }
    catch (error) {
        console.error('Delete comment error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete comment'
        });
    }
};
exports.deleteComment = deleteComment;
