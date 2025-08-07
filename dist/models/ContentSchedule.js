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
const contentScheduleSchema = new mongoose_1.Schema({
    contentId: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        required: true,
        refPath: 'contentType'
    },
    contentType: {
        type: String,
        required: true,
        enum: ['post', 'page']
    },
    action: {
        type: String,
        required: true,
        enum: ['publish', 'unpublish', 'archive', 'delete']
    },
    scheduledAt: {
        type: Date,
        required: true,
        validate: {
            validator: function (v) {
                return v > new Date();
            },
            message: 'Scheduled time must be in the future'
        }
    },
    status: {
        type: String,
        enum: ['pending', 'executed', 'failed', 'cancelled'],
        default: 'pending'
    },
    executedAt: {
        type: Date
    },
    failureReason: {
        type: String,
        trim: true,
        maxlength: 500
    },
    retryCount: {
        type: Number,
        default: 0,
        min: 0
    },
    maxRetries: {
        type: Number,
        default: 3,
        min: 0,
        max: 10
    },
    metadata: {
        originalStatus: {
            type: String
        },
        targetStatus: {
            type: String,
            required: true
        },
        notifyUsers: [{
                type: mongoose_1.default.Schema.Types.ObjectId,
                ref: 'User'
            }],
        emailNotification: {
            type: Boolean,
            default: true
        },
        socialMediaPost: {
            type: Boolean,
            default: false
        }
    },
    createdBy: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true
});
contentScheduleSchema.index({ scheduledAt: 1, status: 1 });
contentScheduleSchema.index({ contentId: 1, contentType: 1 });
contentScheduleSchema.index({ status: 1 });
contentScheduleSchema.index({ createdBy: 1 });
contentScheduleSchema.index({ createdAt: -1 });
contentScheduleSchema.index({
    scheduledAt: 1,
    status: 1,
    retryCount: 1
});
contentScheduleSchema.statics.findDueSchedules = function () {
    return this.find({
        status: 'pending',
        scheduledAt: { $lte: new Date() },
        retryCount: { $lt: 3 }
    }).populate('contentId').populate('createdBy');
};
contentScheduleSchema.statics.findPendingForContent = function (contentId, contentType) {
    return this.find({
        contentId,
        contentType,
        status: 'pending',
        scheduledAt: { $gt: new Date() }
    }).sort({ scheduledAt: 1 });
};
contentScheduleSchema.methods.markExecuted = function () {
    this.status = 'executed';
    this.executedAt = new Date();
    return this.save();
};
contentScheduleSchema.methods.markFailed = function (reason) {
    this.status = 'failed';
    this.failureReason = reason;
    this.retryCount += 1;
    return this.save();
};
contentScheduleSchema.methods.cancel = function () {
    this.status = 'cancelled';
    return this.save();
};
exports.default = mongoose_1.default.model('ContentSchedule', contentScheduleSchema);
