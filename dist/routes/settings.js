"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const settingsController_1 = require("../controllers/settingsController");
const auth_1 = require("../middleware/auth");
const rateLimiter_1 = require("../middleware/rateLimiter");
const upload_1 = require("../middleware/upload");
const validation_1 = require("../middleware/validation");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.use((0, auth_1.authorize)(['superadmin', 'admin']));
router.get('/', rateLimiter_1.generalLimiter, settingsController_1.getSettings);
router.put('/', rateLimiter_1.generalLimiter, validation_1.validateSettings, settingsController_1.updateSettings);
router.post('/reset', rateLimiter_1.generalLimiter, settingsController_1.resetSettings);
router.post('/logo', rateLimiter_1.generalLimiter, upload_1.uploadSingle, settingsController_1.uploadLogo);
router.post('/test-email', rateLimiter_1.generalLimiter, settingsController_1.testEmailConfig);
exports.default = router;
//# sourceMappingURL=settings.js.map