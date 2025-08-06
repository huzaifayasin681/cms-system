"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const notificationSchema = new mongoose_1.Schema({
    recipient: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    sender: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: 'User'
    },
    type: {
        type: String,
        enum: ['info', 'success', 'warning', 'error', 'system'],
        required: true,
        default: 'info'
    },
    category: {
        type: String,
        enum: ['user_action', 'system_update', 'content_change', 'security', 'approval', 'media', 'comment', 'general'],
        required: true,
        default: 'general'
    },
    title: {
        type: String,
        required: true,
        maxlength: 100
    },
    message: {
        type: String,
        required: true,
        maxlength: 500
    },
    data: {
        type: mongoose_1.default.Schema.Types.Mixed,
        default: {}
    },
    read: {
        type: Boolean,
        default: false,
        index: true
    },
    emailSent: {
        type: Boolean,
        default: false,
        index: true
    },
    emailSentAt: {
        type: Date
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'urgent'],
        default: 'medium',
        index: true
    },
    expiresAt: {
        type: Date,
        index: { expireAfterSeconds: 0 }
    },
    actionUrl: {
        type: String
    },
    actionText: {
        type: String,
        maxlength: 50
    }
}, {
    timestamps: true
});
notificationSchema.index({ recipient: 1, read: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, type: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, category: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, priority: 1, createdAt: -1 });
notificationSchema.index({ emailSent: 1, priority: 1, createdAt: 1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
exports.default = mongoose_1.default.model('Notification', notificationSchema);
//# sourceMappingURL=Notification.js.map