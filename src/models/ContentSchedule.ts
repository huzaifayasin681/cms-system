import mongoose, { Document, Schema } from 'mongoose';

export interface IContentSchedule extends Document {
  contentId: mongoose.Types.ObjectId;
  contentType: 'post' | 'page';
  action: 'publish' | 'unpublish' | 'archive' | 'delete';
  scheduledAt: Date;
  status: 'pending' | 'executed' | 'failed' | 'cancelled';
  executedAt?: Date;
  failureReason?: string;
  retryCount: number;
  maxRetries: number;
  metadata: {
    originalStatus?: string;
    targetStatus: string;
    notifyUsers: mongoose.Types.ObjectId[];
    emailNotification: boolean;
    socialMediaPost: boolean;
  };
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const contentScheduleSchema = new Schema<IContentSchedule>({
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
  action: {
    type: String,
    required: true,
    enum: ['publish', 'unpublish', 'archive', 'delete']
  },
  scheduledAt: {
    type: Date,
    required: true,
    validate: {
      validator: function(v: Date) {
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
      type: mongoose.Schema.Types.ObjectId,
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
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Indexes
contentScheduleSchema.index({ scheduledAt: 1, status: 1 });
contentScheduleSchema.index({ contentId: 1, contentType: 1 });
contentScheduleSchema.index({ status: 1 });
contentScheduleSchema.index({ createdBy: 1 });
contentScheduleSchema.index({ createdAt: -1 });

// Index for finding pending schedules to execute
contentScheduleSchema.index({ 
  scheduledAt: 1, 
  status: 1, 
  retryCount: 1 
});

// Static method to find due schedules
contentScheduleSchema.statics.findDueSchedules = function() {
  return this.find({
    status: 'pending',
    scheduledAt: { $lte: new Date() },
    retryCount: { $lt: 3 }
  }).populate('contentId').populate('createdBy');
};

// Static method to find pending schedules for content
contentScheduleSchema.statics.findPendingForContent = function(
  contentId: mongoose.Types.ObjectId,
  contentType: string
) {
  return this.find({
    contentId,
    contentType,
    status: 'pending',
    scheduledAt: { $gt: new Date() }
  }).sort({ scheduledAt: 1 });
};

// Instance method to mark as executed
contentScheduleSchema.methods.markExecuted = function() {
  this.status = 'executed';
  this.executedAt = new Date();
  return this.save();
};

// Instance method to mark as failed
contentScheduleSchema.methods.markFailed = function(reason: string) {
  this.status = 'failed';
  this.failureReason = reason;
  this.retryCount += 1;
  return this.save();
};

// Instance method to cancel schedule
contentScheduleSchema.methods.cancel = function() {
  this.status = 'cancelled';
  return this.save();
};

export default mongoose.model<IContentSchedule>('ContentSchedule', contentScheduleSchema);