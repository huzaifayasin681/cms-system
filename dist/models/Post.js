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
const postSchema = new mongoose_1.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200
    },
    slug: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    content: {
        type: String,
        required: true
    },
    excerpt: {
        type: String,
        maxlength: 500
    },
    featuredImage: {
        type: String
    },
    author: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    status: {
        type: String,
        enum: ['draft', 'published', 'archived', 'scheduled', 'pending_review'],
        default: 'draft'
    },
    tags: [{
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'Tag'
        }],
    categories: [{
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'Category'
        }],
    seoTitle: {
        type: String,
        maxlength: 70
    },
    seoDescription: {
        type: String,
        maxlength: 160
    },
    seoKeywords: [{
            type: String,
            trim: true,
            maxlength: 50
        }],
    views: {
        type: Number,
        default: 0
    },
    likes: [{
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'User'
        }],
    publishedAt: {
        type: Date
    },
    scheduledAt: {
        type: Date
    },
    contentHistory: [{
            content: { type: String, required: true },
            savedAt: { type: Date, default: Date.now },
            savedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true }
        }],
    readingTime: {
        type: Number,
        default: 0
    },
    wordCount: {
        type: Number,
        default: 0
    },
    version: {
        type: Number,
        default: 1,
        min: 1
    },
    customFields: {
        type: mongoose_1.Schema.Types.Mixed,
        default: {}
    },
    workflowStatus: {
        currentWorkflow: {
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'Workflow'
        },
        currentStep: {
            type: String
        },
        submittedAt: {
            type: Date
        },
        submittedBy: {
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'User'
        }
    },
    collaborators: [{
            userId: {
                type: mongoose_1.Schema.Types.ObjectId,
                ref: 'User',
                required: true
            },
            permission: {
                type: String,
                enum: ['read', 'edit', 'admin'],
                default: 'edit'
            },
            addedAt: {
                type: Date,
                default: Date.now
            },
            addedBy: {
                type: mongoose_1.Schema.Types.ObjectId,
                ref: 'User',
                required: true
            }
        }],
    searchableContent: {
        type: String,
        index: 'text'
    }
}, {
    timestamps: true
});
postSchema.pre('save', function (next) {
    if (this.isModified('content') || this.isModified('title')) {
        const words = this.content.split(/\s+/).length;
        this.wordCount = words;
        this.readingTime = Math.ceil(words / 200);
        if (!this.excerpt && this.content) {
            this.excerpt = this.content.replace(/<[^>]*>/g, '').substring(0, 150) + '...';
        }
        const cleanContent = this.content.replace(/<[^>]*>/g, ' ');
        this.searchableContent = `${this.title} ${cleanContent} ${this.excerpt || ''}`.toLowerCase();
    }
    if (this.isModified('status') && this.status === 'published' && !this.publishedAt) {
        this.publishedAt = new Date();
    }
    if (this.isModified('content') && !this.isNew) {
        this.version += 1;
    }
    next();
});
postSchema.index({ slug: 1 });
postSchema.index({ author: 1 });
postSchema.index({ status: 1 });
postSchema.index({ tags: 1 });
postSchema.index({ categories: 1 });
postSchema.index({ publishedAt: -1 });
postSchema.index({ createdAt: -1 });
postSchema.index({ version: -1 });
postSchema.index({ 'workflowStatus.currentWorkflow': 1 });
postSchema.index({ 'collaborators.userId': 1 });
postSchema.index({ searchableContent: 'text' });
postSchema.index({ seoKeywords: 1 });
postSchema.index({
    title: 'text',
    searchableContent: 'text',
    'seoKeywords': 'text'
}, {
    weights: {
        title: 10,
        searchableContent: 5,
        seoKeywords: 3
    }
});
exports.default = mongoose_1.default.model('Post', postSchema);
