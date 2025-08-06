import mongoose, { Document, Schema } from 'mongoose';

export interface IWorkflowStep {
  id: string;
  name: string;
  description?: string;
  requiredRole: 'editor' | 'admin' | 'superadmin';
  assignedUsers?: mongoose.Types.ObjectId[];
  autoApprove: boolean;
  emailNotification: boolean;
  dueInHours?: number;
  order: number;
}

export interface IWorkflow extends Document {
  name: string;
  description?: string;
  contentTypes: ('post' | 'page')[];
  steps: IWorkflowStep[];
  isActive: boolean;
  isDefault: boolean;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface IWorkflowInstance extends Document {
  workflowId: mongoose.Types.ObjectId;
  contentId: mongoose.Types.ObjectId;
  contentType: 'post' | 'page';
  currentStepId: string;
  status: 'pending' | 'in_progress' | 'approved' | 'rejected' | 'cancelled';
  steps: {
    stepId: string;
    status: 'pending' | 'approved' | 'rejected' | 'skipped';
    assignedTo?: mongoose.Types.ObjectId;
    approvedBy?: mongoose.Types.ObjectId;
    rejectedBy?: mongoose.Types.ObjectId;
    comments?: string;
    processedAt?: Date;
    dueAt?: Date;
  }[];
  submittedBy: mongoose.Types.ObjectId;
  submittedAt: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const workflowStepSchema = new Schema<IWorkflowStep>({
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
    type: mongoose.Schema.Types.ObjectId,
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
    max: 168 // 1 week
  },
  order: {
    type: Number,
    required: true,
    min: 1
  }
}, { _id: false });

const workflowSchema = new Schema<IWorkflow>({
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
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

const workflowInstanceSchema = new Schema<IWorkflowInstance>({
  workflowId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workflow',
    required: true
  },
  contentId: {
    type: mongoose.Schema.Types.ObjectId,
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
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    rejectedBy: {
      type: mongoose.Schema.Types.ObjectId,
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
    type: mongoose.Schema.Types.ObjectId,
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

// Indexes for Workflow
workflowSchema.index({ contentTypes: 1, isActive: 1 });
workflowSchema.index({ isDefault: 1 });
workflowSchema.index({ createdBy: 1 });

// Indexes for WorkflowInstance
workflowInstanceSchema.index({ workflowId: 1 });
workflowInstanceSchema.index({ contentId: 1, contentType: 1 });
workflowInstanceSchema.index({ status: 1 });
workflowInstanceSchema.index({ submittedBy: 1 });
workflowInstanceSchema.index({ 'steps.assignedTo': 1, 'steps.status': 1 });
workflowInstanceSchema.index({ createdAt: -1 });

// Validate step IDs are unique within workflow
workflowSchema.pre('save', function(next) {
  const stepIds = this.steps.map(step => step.id);
  const uniqueIds = new Set(stepIds);
  
  if (stepIds.length !== uniqueIds.size) {
    return next(new Error('Step IDs must be unique within the workflow'));
  }
  
  next();
});

// Ensure only one default workflow per content type
workflowSchema.pre('save', async function(next) {
  if (this.isDefault) {
    await mongoose.model('Workflow').updateMany(
      { 
        contentTypes: { $in: this.contentTypes },
        _id: { $ne: this._id }
      },
      { isDefault: false }
    );
  }
  next();
});

// Static method to get default workflow for content type
workflowSchema.statics.getDefaultWorkflow = function(contentType: string) {
  return this.findOne({
    contentTypes: contentType,
    isDefault: true,
    isActive: true
  });
};

// Instance methods for WorkflowInstance
workflowInstanceSchema.methods.approveStep = function(stepId: string, userId: mongoose.Types.ObjectId, comments?: string) {
  const step = this.steps.find(s => s.stepId === stepId);
  if (step) {
    step.status = 'approved';
    step.approvedBy = userId;
    step.processedAt = new Date();
    if (comments) step.comments = comments;
    
    // Move to next step or complete
    const currentStepIndex = this.steps.findIndex(s => s.stepId === stepId);
    if (currentStepIndex < this.steps.length - 1) {
      this.currentStepId = this.steps[currentStepIndex + 1].stepId;
      this.status = 'in_progress';
    } else {
      this.status = 'approved';
      this.completedAt = new Date();
    }
  }
  return this.save();
};

workflowInstanceSchema.methods.rejectStep = function(stepId: string, userId: mongoose.Types.ObjectId, comments: string) {
  const step = this.steps.find(s => s.stepId === stepId);
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

export const Workflow = mongoose.model<IWorkflow>('Workflow', workflowSchema);
export const WorkflowInstance = mongoose.model<IWorkflowInstance>('WorkflowInstance', workflowInstanceSchema);