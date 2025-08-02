"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const postController_1 = require("../controllers/postController");
const auth_1 = require("../middleware/auth");
const validation_1 = require("../middleware/validation");
const rateLimiter_1 = require("../middleware/rateLimiter");
const analytics_1 = require("../middleware/analytics");
const router = (0, express_1.Router)();
router.get('/', rateLimiter_1.generalLimiter, analytics_1.trackSearch, postController_1.getPosts, analytics_1.saveAnalyticsEvent);
router.get('/:id', rateLimiter_1.generalLimiter, auth_1.optionalAuth, analytics_1.trackPostView, postController_1.getPost, analytics_1.saveAnalyticsEvent);
router.post('/', auth_1.authenticate, (0, auth_1.authorize)(['superadmin', 'admin', 'editor']), validation_1.validatePost, postController_1.createPost);
router.put('/:id', auth_1.authenticate, (0, auth_1.authorize)(['superadmin', 'admin', 'editor']), validation_1.validatePost, postController_1.updatePost);
router.delete('/:id', auth_1.authenticate, (0, auth_1.authorize)(['superadmin', 'admin', 'editor']), postController_1.deletePost);
router.post('/:id/like', auth_1.authenticate, analytics_1.trackLike, postController_1.toggleLike, analytics_1.saveAnalyticsEvent);
router.post('/:id/save-draft', auth_1.authenticate, (0, auth_1.authorize)(['superadmin', 'admin', 'editor']), postController_1.savePostDraft);
exports.default = router;
//# sourceMappingURL=posts.js.map