import { Response } from 'express';
import { validationResult } from 'express-validator';
import { Types } from 'mongoose';
import Comment from '../models/Comment';
import Post from '../models/Post';
import { AuthRequest } from '../middleware/auth';
import { logActivity } from './activityController';

// Helper function to validate MongoDB ObjectId
const isValidObjectId = (id: string): boolean => {
  return Boolean(id && id !== 'undefined' && id !== 'null' && Types.ObjectId.isValid(id));
};

// Get comments for a post
export const getComments = async (req: AuthRequest, res: Response) => {
  try {
    const { postId } = req.params;
    const { page = 1, limit = 20, sort = 'newest' } = req.query;

    // Validate post ID
    if (!isValidObjectId(postId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid post ID provided'
      });
    }

    // Validate post exists
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    const sortOptions: Record<string, any> = {
      newest: { createdAt: -1 },
      oldest: { createdAt: 1 },
      popular: { likes: -1, createdAt: -1 }
    };

    const skip = (Number(page) - 1) * Number(limit);
    
    // Get parent comments (not replies)
    const comments = await Comment.find({
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
    .sort(sortOptions[sort as string] || sortOptions.newest)
    .skip(skip)
    .limit(Number(limit));

    const total = await Comment.countDocuments({
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

  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch comments'
    });
  }
};

// Create a new comment
export const createComment = async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { postId } = req.params;
    const { content, parentComment } = req.body;

    // Validate post ID
    if (!isValidObjectId(postId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid post ID provided'
      });
    }

    // Validate post exists
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    // Validate parent comment if provided
    if (parentComment) {
      const parent = await Comment.findById(parentComment);
      if (!parent || parent.post.toString() !== postId) {
        return res.status(400).json({
          success: false,
          message: 'Invalid parent comment'
        });
      }
    }

    // Create comment
    const comment = new Comment({
      content,
      author: req.user._id,
      post: postId,
      parentComment: parentComment || undefined,
      status: 'approved' // Auto-approve for registered users
    });

    await comment.save();

    // If it's a reply, add to parent's replies array
    if (parentComment) {
      await Comment.findByIdAndUpdate(parentComment, {
        $push: { replies: comment._id }
      });
    }

    // Populate author info
    await comment.populate('author', 'username avatar');

    // Log activity
    await logActivity({
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

  } catch (error) {
    console.error('Create comment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create comment'
    });
  }
};

// Toggle comment like
export const toggleCommentLike = async (req: AuthRequest, res: Response) => {
  try {
    const { commentId } = req.params;

    // Validate comment ID
    if (!isValidObjectId(commentId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid comment ID provided'
      });
    }

    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }

    const userId = req.user._id;
    const hasLiked = comment.likes.includes(userId);

    if (hasLiked) {
      // Remove like
      comment.likes = comment.likes.filter(id => !id.equals(userId));
    } else {
      // Add like
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

  } catch (error) {
    console.error('Toggle comment like error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle comment like'
    });
  }
};

// Delete comment (author or admin only)
export const deleteComment = async (req: AuthRequest, res: Response) => {
  try {
    const { commentId } = req.params;

    // Validate comment ID
    if (!isValidObjectId(commentId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid comment ID provided'
      });
    }

    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }

    // Check if user can delete (author or admin)
    const canDelete = comment.author.equals(req.user._id) || req.user.role === 'admin' || req.user.role === 'superadmin';
    if (!canDelete) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this comment'
      });
    }

    // Remove from parent's replies if it's a reply
    if (comment.parentComment) {
      await Comment.findByIdAndUpdate(comment.parentComment, {
        $pull: { replies: comment._id }
      });
    }

    // Delete all replies to this comment
    await Comment.deleteMany({ parentComment: commentId });

    // Delete the comment
    await Comment.findByIdAndDelete(commentId);

    res.json({
      success: true,
      message: 'Comment deleted successfully'
    });

  } catch (error) {
    console.error('Delete comment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete comment'
    });
  }
};