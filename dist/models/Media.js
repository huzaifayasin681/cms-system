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
const mediaSchema = new mongoose_1.Schema({
    fileName: {
        type: String,
        required: true
    },
    originalName: {
        type: String,
        required: true
    },
    mimeType: {
        type: String,
        required: true
    },
    size: {
        type: Number,
        required: true
    },
    url: {
        type: String,
        required: true
    },
    cloudinaryId: {
        type: String
    },
    alt: {
        type: String,
        maxlength: 200
    },
    caption: {
        type: String,
        maxlength: 500
    },
    uploadedBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    folder: {
        type: String,
        default: 'uploads'
    },
    width: {
        type: Number
    },
    height: {
        type: Number
    },
    tags: [{
            type: String,
            trim: true,
            lowercase: true
        }],
    isUsed: {
        type: Boolean,
        default: false
    },
    usageCount: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});
mediaSchema.index({ uploadedBy: 1 });
mediaSchema.index({ mimeType: 1 });
mediaSchema.index({ folder: 1 });
mediaSchema.index({ tags: 1 });
mediaSchema.index({ createdAt: -1 });
exports.default = mongoose_1.default.model('Media', mediaSchema);
//# sourceMappingURL=Media.js.map