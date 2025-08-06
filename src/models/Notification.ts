import mongoose, { Document, Schema } from 'mongoose';

export interface INotification extends Document {
  recipient: mongoose.Types.ObjectId;
  sender?: mongoose.Types.ObjectId;
  type: 'info' | 'success' | 'warning' | 'error' | 'system';
  category: 'user_action' | 'system_update' | 'content_change' | 'security' | 'approval' | 'media' | 'comment' | 'general';
  title: string;
  message: string;
  data?: any; // Additional context data
  read: boolean;
  emailSent: boolean;
  emailSentAt?: Date;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  expiresAt?: Date;
  actionUrl?: string;
  actionText?: string;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  type: {
    type: String,
    enum: ['info', 'success', 'warning', 'error', 'system'],
    required: true,
    default: 'info'
  },
  category: {
    type: String,
    enum: ['user_action', 'system_update', 'content_change', 'security', 'approval', 'media', 'comment', 'general'],
    required: true,
    default: 'general'
  },
  title: {
    type: String,
    required: true,
    maxlength: 100
  },
  message: {
    type: String,
    required: true,
    maxlength: 500
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  read: {
    type: Boolean,
    default: false,
    index: true
  },
  emailSent: {
    type: Boolean,
    default: false,
    index: true
  },
  emailSentAt: {
    type: Date
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium',
    index: true
  },
  expiresAt: {
    type: Date,
    index: { expireAfterSeconds: 0 }
  },
  actionUrl: {
    type: String
  },
  actionText: {
    type: String,
    maxlength: 50
  }
}, {
  timestamps: true
});

// Compound indexes for efficient queries
notificationSchema.index({ recipient: 1, read: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, type: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, category: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, priority: 1, createdAt: -1 });
notificationSchema.index({ emailSent: 1, priority: 1, createdAt: 1 });

// Auto-expire notifications based on expiresAt field
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model<INotification>('Notification', notificationSchema);