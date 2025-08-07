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
exports.WorkflowInstance = exports.Workflow = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const workflowStepSchema = new mongoose_1.Schema({
    id: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100
    },
    description: {
        type: String,
        trim: true,
        maxlength: 300
    },
    requiredRole: {
        type: String,
        required: true,
        enum: ['editor', 'admin', 'superadmin']
    },
    assignedUsers: [{
            type: mongoose_1.default.Schema.Types.ObjectId,
            ref: 'User'
        }],
    autoApprove: {
        type: Boolean,
        default: false
    },
    emailNotification: {
        type: Boolean,
        default: true
    },
    dueInHours: {
        type: Number,
        min: 1,
        max: 168
    },
    order: {
        type: Number,
        required: true,
        min: 1
    }
}, { _id: false });
const workflowSchema = new mongoose_1.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100
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
    steps: [workflowStepSchema],
    isActive: {
        type: Boolean,
        default: true
    },
    isDefault: {
        type: Boolean,
        default: false
    },
    createdBy: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true
});
const workflowInstanceSchema = new mongoose_1.Schema({
    workflowId: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: 'Workflow',
        required: true
    },
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
    currentStepId: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'in_progress', 'approved', 'rejected', 'cancelled'],
        default: 'pending'
    },
    steps: [{
            stepId: {
                type: String,
                required: true
            },
            status: {
                type: String,
                enum: ['pending', 'approved', 'rejected', 'skipped'],
                default: 'pending'
            },
            assignedTo: {
                type: mongoose_1.default.Schema.Types.ObjectId,
                ref: 'User'
            },
            approvedBy: {
                type: mongoose_1.default.Schema.Types.ObjectId,
                ref: 'User'
            },
            rejectedBy: {
                type: mongoose_1.default.Schema.Types.ObjectId,
                ref: 'User'
            },
            comments: {
                type: String,
                trim: true,
                maxlength: 1000
            },
            processedAt: {
                type: Date
            },
            dueAt: {
                type: Date
            }
        }],
    submittedBy: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    submittedAt: {
        type: Date,
        default: Date.now
    },
    completedAt: {
        type: Date
    }
}, {
    timestamps: true
});
workflowSchema.index({ contentTypes: 1, isActive: 1 });
workflowSchema.index({ isDefault: 1 });
workflowSchema.index({ createdBy: 1 });
workflowInstanceSchema.index({ workflowId: 1 });
workflowInstanceSchema.index({ contentId: 1, contentType: 1 });
workflowInstanceSchema.index({ status: 1 });
workflowInstanceSchema.index({ submittedBy: 1 });
workflowInstanceSchema.index({ 'steps.assignedTo': 1, 'steps.status': 1 });
workflowInstanceSchema.index({ createdAt: -1 });
workflowSchema.pre('save', function (next) {
    const stepIds = this.steps.map(step => step.id);
    const uniqueIds = new Set(stepIds);
    if (stepIds.length !== uniqueIds.size) {
        return next(new Error('Step IDs must be unique within the workflow'));
    }
    next();
});
workflowSchema.pre('save', async function (next) {
    if (this.isDefault) {
        await mongoose_1.default.model('Workflow').updateMany({
            contentTypes: { $in: this.contentTypes },
            _id: { $ne: this._id }
        }, { isDefault: false });
    }
    next();
});
workflowSchema.statics.getDefaultWorkflow = function (contentType) {
    return this.findOne({
        contentTypes: contentType,
        isDefault: true,
        isActive: true
    });
};
workflowInstanceSchema.methods.approveStep = function (stepId, userId, comments) {
    const step = this.steps.find((s) => s.stepId === stepId);
    if (step) {
        step.status = 'approved';
        step.approvedBy = userId;
        step.processedAt = new Date();
        if (comments)
            step.comments = comments;
        const currentStepIndex = this.steps.findIndex((s) => s.stepId === stepId);
        if (currentStepIndex < this.steps.length - 1) {
            this.currentStepId = this.steps[currentStepIndex + 1].stepId;
            this.status = 'in_progress';
        }
        else {
            this.status = 'approved';
            this.completedAt = new Date();
        }
    }
    return this.save();
};
workflowInstanceSchema.methods.rejectStep = function (stepId, userId, comments) {
    const step = this.steps.find((s) => s.stepId === stepId);
    if (step) {
        step.status = 'rejected';
        step.rejectedBy = userId;
        step.processedAt = new Date();
        step.comments = comments;
        this.status = 'rejected';
        this.completedAt = new Date();
    }
    return this.save();
};
exports.Workflow = mongoose_1.default.model('Workflow', workflowSchema);
exports.WorkflowInstance = mongoose_1.default.model('WorkflowInstance', workflowInstanceSchema);
