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
const customFieldSchemaSchema = new mongoose_1.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100
    },
    key: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
        match: /^[a-z0-9_]+$/
    },
    type: {
        type: String,
        required: true,
        enum: ['text', 'textarea', 'number', 'boolean', 'date', 'select', 'multiselect', 'file', 'url', 'email', 'json']
    },
    required: {
        type: Boolean,
        default: false
    },
    defaultValue: {
        type: mongoose_1.Schema.Types.Mixed
    },
    options: [{
            type: String,
            trim: true
        }],
    validation: {
        min: Number,
        max: Number,
        pattern: String,
        message: String
    },
    description: {
        type: String,
        trim: true,
        maxlength: 200
    },
    placeholder: {
        type: String,
        trim: true,
        maxlength: 100
    },
    helpText: {
        type: String,
        trim: true,
        maxlength: 300
    }
}, { _id: false });
const customFieldSchema = new mongoose_1.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100
    },
    slug: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    description: {
        type: String,
        trim: true,
        maxlength: 500
    },
    contentTypes: [{
            type: String,
            enum: ['post', 'page'],
            required: true
        }],
    fields: [customFieldSchemaSchema],
    isActive: {
        type: Boolean,
        default: true
    },
    sortOrder: {
        type: Number,
        default: 0
    },
    createdBy: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true
});
customFieldSchema.index({ slug: 1 });
customFieldSchema.index({ contentTypes: 1 });
customFieldSchema.index({ isActive: 1 });
customFieldSchema.index({ sortOrder: 1 });
customFieldSchema.index({ createdBy: 1 });
customFieldSchema.pre('save', function (next) {
    if (!this.slug && this.name) {
        this.slug = this.name
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim();
    }
    next();
});
customFieldSchema.pre('save', function (next) {
    const keys = this.fields.map(field => field.key);
    const uniqueKeys = new Set(keys);
    if (keys.length !== uniqueKeys.size) {
        return next(new Error('Field keys must be unique within the same custom field'));
    }
    next();
});
customFieldSchema.statics.getFieldsForContentType = function (contentType) {
    return this.find({
        contentTypes: contentType,
        isActive: true
    }).sort({ sortOrder: 1 });
};
exports.default = mongoose_1.default.model('CustomField', customFieldSchema);
