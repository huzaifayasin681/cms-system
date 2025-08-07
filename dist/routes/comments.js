"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const commentController_1 = require("../controllers/commentController");
const auth_1 = require("../middleware/auth");
const rateLimiter_1 = require("../middleware/rateLimiter");
const express_validator_1 = require("express-validator");
const router = (0, express_1.Router)();
const validateComment = [
    (0, express_validator_1.body)('content')
        .trim()
        .isLength({ min: 1, max: 1000 })
        .withMessage('Comment must be between 1 and 1000 characters'),
    (0, express_validator_1.body)('parentComment')
        .optional()
        .isMongoId()
        .withMessage('Invalid parent comment ID')
];
router.get('/:postId', rateLimiter_1.generalLimiter, commentController_1.getComments);
router.post('/:postId', auth_1.authenticate, rateLimiter_1.generalLimiter, validateComment, commentController_1.createComment);
router.post('/:commentId/like', auth_1.authenticate, rateLimiter_1.generalLimiter, commentController_1.toggleCommentLike);
router.delete('/:commentId', auth_1.authenticate, rateLimiter_1.generalLimiter, commentController_1.deleteComment);
exports.default = router;
