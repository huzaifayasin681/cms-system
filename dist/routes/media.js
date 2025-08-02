"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const mediaController_1 = require("../controllers/mediaController");
const auth_1 = require("../middleware/auth");
const upload_1 = require("../middleware/upload");
const rateLimiter_1 = require("../middleware/rateLimiter");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.post('/upload', rateLimiter_1.uploadLimiter, upload_1.uploadSingle, upload_1.handleMulterError, mediaController_1.uploadMedia);
router.get('/', mediaController_1.getMedia);
router.get('/stats', mediaController_1.getMediaStats);
router.get('/:id', mediaController_1.getMediaById);
router.put('/:id', mediaController_1.updateMedia);
router.delete('/:id', mediaController_1.deleteMedia);
router.post('/bulk-delete', (0, auth_1.authorize)(['superadmin', 'admin']), mediaController_1.bulkDeleteMedia);
exports.default = router;
//# sourceMappingURL=media.js.map