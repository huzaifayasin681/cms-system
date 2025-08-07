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
const SettingsSchema = new mongoose_1.Schema({
    siteName: {
        type: String,
        required: true,
        default: 'Content Hub',
        maxlength: 100
    },
    siteDescription: {
        type: String,
        required: true,
        default: 'A powerful content management system',
        maxlength: 500
    },
    siteUrl: {
        type: String,
        required: true,
        default: 'https://yourdomain.com',
        maxlength: 200
    },
    adminEmail: {
        type: String,
        required: true,
        default: 'admin@yourdomain.com',
        maxlength: 100
    },
    timezone: {
        type: String,
        required: true,
        default: 'America/New_York',
        maxlength: 50
    },
    language: {
        type: String,
        required: true,
        default: 'en',
        maxlength: 10
    },
    siteLogo: {
        type: String,
        maxlength: 500
    },
    postsPerPage: {
        type: Number,
        required: true,
        default: 10,
        min: 1,
        max: 100
    },
    allowComments: {
        type: Boolean,
        default: true
    },
    moderateComments: {
        type: Boolean,
        default: true
    },
    allowRegistration: {
        type: Boolean,
        default: false
    },
    defaultRole: {
        type: String,
        enum: ['viewer', 'editor', 'admin'],
        default: 'viewer'
    },
    autoSave: {
        type: Boolean,
        default: true
    },
    contentVersioning: {
        type: Boolean,
        default: true
    },
    smtpHost: {
        type: String,
        maxlength: 100
    },
    smtpPort: {
        type: Number,
        min: 1,
        max: 65535,
        default: 587
    },
    smtpUser: {
        type: String,
        maxlength: 100
    },
    smtpPassword: {
        type: String,
        maxlength: 200
    },
    smtpSecure: {
        type: Boolean,
        default: false
    },
    fromEmail: {
        type: String,
        maxlength: 100
    },
    fromName: {
        type: String,
        maxlength: 100
    },
    newComments: {
        type: Boolean,
        default: true
    },
    newUsers: {
        type: Boolean,
        default: true
    },
    newPosts: {
        type: Boolean,
        default: false
    },
    systemUpdates: {
        type: Boolean,
        default: true
    },
    emailDigest: {
        type: Boolean,
        default: false
    },
    desktopNotifications: {
        type: Boolean,
        default: true
    },
    enableTwoFactor: {
        type: Boolean,
        default: false
    },
    sessionTimeout: {
        type: Number,
        default: 24,
        min: 1,
        max: 168
    },
    maxLoginAttempts: {
        type: Number,
        default: 5,
        min: 1,
        max: 20
    },
    enableAnalytics: {
        type: Boolean,
        default: true
    },
    trackingCode: {
        type: String,
        maxlength: 500
    },
    updatedBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: { createdAt: false, updatedAt: true }
});
SettingsSchema.index({}, { unique: true });
exports.default = mongoose_1.default.model('Settings', SettingsSchema);
