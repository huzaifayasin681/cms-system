import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { Types } from 'mongoose';
import Post from '../models/Post';
import { AuthRequest } from '../middleware/auth';
import { logActivity } from './activityController';

// Helper function to validate MongoDB ObjectId
const isValidObjectId = (id: string): boolean => {
  return Boolean(id && id !== 'undefined' && id !== 'null' && Types.ObjectId.isValid(id));
};

export const createPost = async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
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

    const post = new Post(postData);
    await post.save();
    await post.populate('author', 'username email firstName lastName avatar');

    res.status(201).json({
      success: true,
      message: 'Post created successfully',
      post
    });

  } catch (error: any) {
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

export const getPosts = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;
    
    const { status, author, tags, categories, search, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    
    // Build filter object
    const filter: any = {};
    
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
    
    // Build sort object
    const sort: any = {};
    sort[sortBy as string] = sortOrder === 'desc' ? -1 : 1;
    
    const [posts, total] = await Promise.all([
      Post.find(filter)
        .populate('author', 'username email firstName lastName avatar')
        .sort(sort)
        .skip(skip)
        .limit(limit),
      Post.countDocuments(filter)
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

  } catch (error) {
    console.error('Get posts error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching posts'
    });
  }
};

export const getPost = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Validate post ID
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid post ID provided'
      });
    }
    
    const post = await Post.findOne({
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
    
    // Increment views
    post.views += 1;
    await post.save();
    
    res.json({
      success: true,
      post
    });

  } catch (error) {
    console.error('Get post error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching post'
    });
  }
};

export const updatePost = async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    
    // Validate post ID
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid post ID provided'
      });
    }
    
    const post = await Post.findById(id);
    
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }
    
    // Check permissions
    if (post.author.toString() !== req.user._id.toString() && req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this post'
      });
    }
    
    // Save content history if content changed
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

  } catch (error: any) {
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

export const deletePost = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    // Validate post ID
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid post ID provided'
      });
    }
    
    const post = await Post.findById(id);
    
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }
    
    // Check permissions
    if (post.author.toString() !== req.user._id.toString() && req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this post'
      });
    }
    
    await Post.findByIdAndDelete(id);
    
    res.json({
      success: true,
      message: 'Post deleted successfully'
    });

  } catch (error) {
    console.error('Delete post error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting post'
    });
  }
};

export const toggleLike = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    // Validate post ID
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid post ID provided'
      });
    }
    
    const post = await Post.findById(id);
    
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }
    
    const likeIndex = post.likes.indexOf(req.user._id);
    
    if (likeIndex > -1) {
      // Remove like
      post.likes.splice(likeIndex, 1);
    } else {
      // Add like
      post.likes.push(req.user._id);
    }
    
    await post.save();
    
    res.json({
      success: true,
      message: likeIndex > -1 ? 'Post unliked' : 'Post liked',
      likesCount: post.likes.length,
      isLiked: likeIndex === -1
    });

  } catch (error) {
    console.error('Toggle like error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error toggling like'
    });
  }
};

export const savePostDraft = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    
    // Validate post ID
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
    
    const post = await Post.findById(id);
    
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }
    
    // Check permissions
    if (post.author.toString() !== req.user._id.toString() && req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to save draft for this post'
      });
    }
    
    // Save to content history for auto-save
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

  } catch (error) {
    console.error('Save draft error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error saving draft'
    });
  }
};