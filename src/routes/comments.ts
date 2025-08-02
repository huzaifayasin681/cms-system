import { Router } from 'express';
import {
  getComments,
  createComment,
  toggleCommentLike,
  deleteComment
} from '../controllers/commentController';
import { authenticate } from '../middleware/auth';
import { generalLimiter } from '../middleware/rateLimiter';
import { body } from 'express-validator';

const router = Router();

// Validation for creating comments
const validateComment = [
  body('content')
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Comment must be between 1 and 1000 characters'),
  body('parentComment')
    .optional()
    .isMongoId()
    .withMessage('Invalid parent comment ID')
];

// Public routes
router.get('/:postId', generalLimiter, getComments);

// Protected routes (require authentication)
router.post('/:postId', authenticate, generalLimiter, validateComment, createComment);
router.post('/:commentId/like', authenticate, generalLimiter, toggleCommentLike);
router.delete('/:commentId', authenticate, generalLimiter, deleteComment);

export default router;