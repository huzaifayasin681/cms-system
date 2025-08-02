"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const pageController_1 = require("../controllers/pageController");
const auth_1 = require("../middleware/auth");
const validation_1 = require("../middleware/validation");
const rateLimiter_1 = require("../middleware/rateLimiter");
const analytics_1 = require("../middleware/analytics");
const router = (0, express_1.Router)();
router.get('/', rateLimiter_1.generalLimiter, pageController_1.getPages);
router.get('/menu', rateLimiter_1.generalLimiter, pageController_1.getMenuPages);
router.get('/homepage', rateLimiter_1.generalLimiter, pageController_1.getHomePage);
router.get('/:id', rateLimiter_1.generalLimiter, auth_1.optionalAuth, analytics_1.trackPageView, pageController_1.getPage, analytics_1.saveAnalyticsEvent);
router.post('/', auth_1.authenticate, (0, auth_1.authorize)(['superadmin', 'admin', 'editor']), validation_1.validatePage, pageController_1.createPage);
router.put('/:id', auth_1.authenticate, (0, auth_1.authorize)(['superadmin', 'admin', 'editor']), validation_1.validatePage, pageController_1.updatePage);
router.delete('/:id', auth_1.authenticate, (0, auth_1.authorize)(['superadmin', 'admin', 'editor']), pageController_1.deletePage);
exports.default = router;
//# sourceMappingURL=pages.js.map