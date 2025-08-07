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
const pageSchema = new mongoose_1.Schema({
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
        type: String
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
    template: {
        type: String,
        enum: ['default', 'full-width', 'minimal', 'landing', 'contact', 'about', 'visual-builder'],
        default: 'default'
    },
    icon: {
        type: String,
        maxlength: 50
    },
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
    categories: [{
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'Category'
        }],
    tags: [{
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'Tag'
        }],
    isHomePage: {
        type: Boolean,
        default: false
    },
    parentPage: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Page'
    },
    menuOrder: {
        type: Number,
        default: 0
    },
    showInMenu: {
        type: Boolean,
        default: true
    },
    customCss: {
        type: String
    },
    customJs: {
        type: String
    },
    views: {
        type: Number,
        default: 0
    },
    publishedAt: {
        type: Date
    },
    scheduledAt: {
        type: Date
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
    },
    ctaText: {
        type: String
    },
    phone: {
        type: String
    },
    email: {
        type: String
    },
    address: {
        type: String
    },
    yearsExperience: {
        type: String
    },
    customers: {
        type: String
    },
    projects: {
        type: String
    },
    teamSize: {
        type: String
    },
    builderData: {
        blocks: [{
                id: { type: String, required: true },
                type: { type: String, required: true },
                component: { type: String, required: true },
                props: { type: mongoose_1.Schema.Types.Mixed, default: {} },
                styles: {
                    desktop: { type: mongoose_1.Schema.Types.Mixed, default: {} },
                    tablet: { type: mongoose_1.Schema.Types.Mixed, default: {} },
                    mobile: { type: mongoose_1.Schema.Types.Mixed, default: {} }
                },
                children: [{ type: String }],
                parentId: { type: String },
                order: { type: Number, default: 0 }
            }],
        globalStyles: {
            desktop: { type: mongoose_1.Schema.Types.Mixed, default: {} },
            tablet: { type: mongoose_1.Schema.Types.Mixed, default: {} },
            mobile: { type: mongoose_1.Schema.Types.Mixed, default: {} }
        },
        settings: {
            containerWidth: { type: String, default: '1200px' },
            spacing: { type: String, default: 'normal' },
            typography: { type: mongoose_1.Schema.Types.Mixed, default: {} },
            colors: { type: mongoose_1.Schema.Types.Mixed, default: {} }
        }
    },
    isVisualBuilder: {
        type: Boolean,
        default: false
    },
    contentHistory: [{
            content: { type: String, required: true },
            builderData: { type: mongoose_1.Schema.Types.Mixed },
            savedAt: { type: Date, default: Date.now },
            savedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true }
        }]
}, {
    timestamps: true
});
pageSchema.pre('save', function (next) {
    if (this.isModified('content') || this.isModified('title')) {
        const cleanContent = this.content.replace(/<[^>]*>/g, ' ');
        this.searchableContent = `${this.title} ${cleanContent} ${this.excerpt || ''}`.toLowerCase();
    }
    if (this.isModified('status') && this.status === 'published' && !this.publishedAt) {
        this.publishedAt = new Date();
    }
    if (this.isModified('content') && !this.isNew) {
        this.version += 1;
    }
    if (!this.icon && this.template) {
        const defaultIcons = {
            'landing': 'rocket',
            'contact': 'mail',
            'about': 'info',
            'default': 'file-text',
            'full-width': 'maximize',
            'minimal': 'minimize',
            'visual-builder': 'layout'
        };
        this.icon = defaultIcons[this.template] || 'file-text';
    }
    next();
});
pageSchema.index({ slug: 1 });
pageSchema.index({ author: 1 });
pageSchema.index({ status: 1 });
pageSchema.index({ isHomePage: 1 });
pageSchema.index({ showInMenu: 1 });
pageSchema.index({ menuOrder: 1 });
pageSchema.index({ version: -1 });
pageSchema.index({ 'workflowStatus.currentWorkflow': 1 });
pageSchema.index({ 'collaborators.userId': 1 });
pageSchema.index({ searchableContent: 'text' });
pageSchema.index({ seoKeywords: 1 });
pageSchema.index({ categories: 1 });
pageSchema.index({ tags: 1 });
pageSchema.index({
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
exports.default = mongoose_1.default.model('Page', pageSchema);
