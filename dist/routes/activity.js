"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const activityController_1 = require("../controllers/activityController");
const auth_1 = require("../middleware/auth");
const rateLimiter_1 = require("../middleware/rateLimiter");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.get('/', rateLimiter_1.generalLimiter, (0, auth_1.authorize)(['superadmin', 'admin', 'editor']), activityController_1.getRecentActivities);
router.get('/stats', rateLimiter_1.generalLimiter, (0, auth_1.authorize)(['superadmin', 'admin', 'editor']), activityController_1.getActivityStats);
exports.default = router;
//# sourceMappingURL=activity.js.map