import mongoose, { Document, Schema } from 'mongoose';

export interface IActivity extends Document {
  type: 'post' | 'page' | 'media' | 'user' | 'comment' | 'login' | 'logout';
  action: string; // 'created', 'updated', 'deleted', 'published', etc.
  entityId?: mongoose.Types.ObjectId; // ID of the entity being acted upon
  entityTitle?: string; // Title/name of the entity for display
  userId: mongoose.Types.ObjectId;
  userDetails: {
    username: string;
    firstName?: string;
    lastName?: string;
  };
  metadata?: {
    oldValues?: any;
    newValues?: any;
    additionalInfo?: any;
  };
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

const ActivitySchema = new Schema<IActivity>({
  type: {
    type: String,
    required: true,
    enum: ['post', 'page', 'media', 'user', 'comment', 'login', 'logout']
  },
  action: {
    type: String,
    required: true,
    maxlength: 50
  },
  entityId: {
    type: Schema.Types.ObjectId,
    default: null
  },
  entityTitle: {
    type: String,
    maxlength: 200
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  userDetails: {
    username: {
      type: String,
      required: true
    },
    firstName: String,
    lastName: String
  },
  metadata: {
    oldValues: Schema.Types.Mixed,
    newValues: Schema.Types.Mixed,
    additionalInfo: Schema.Types.Mixed
  },
  ipAddress: {
    type: String,
    maxlength: 45 // IPv6 max length
  },
  userAgent: {
    type: String,
    maxlength: 500
  }
}, {
  timestamps: { createdAt: true, updatedAt: false }
});

// Index for efficient queries
ActivitySchema.index({ createdAt: -1 });
ActivitySchema.index({ userId: 1, createdAt: -1 });
ActivitySchema.index({ type: 1, createdAt: -1 });

export default mongoose.model<IActivity>('Activity', ActivitySchema);