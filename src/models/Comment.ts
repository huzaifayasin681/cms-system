import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IComment extends Document {
  content: string;
  author: Types.ObjectId;
  post: Types.ObjectId;
  parentComment?: Types.ObjectId;
  status: 'pending' | 'approved' | 'rejected' | 'spam';
  isAnonymous: boolean;
  authorName?: string;
  authorEmail?: string;
  authorWebsite?: string;
  ipAddress?: string;
  userAgent?: string;
  likes: Types.ObjectId[];
  replies: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const commentSchema = new Schema<IComment>({
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },
  author: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  post: {
    type: Schema.Types.ObjectId,
    ref: 'Post',
    required: true
  },
  parentComment: {
    type: Schema.Types.ObjectId,
    ref: 'Comment'
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'spam'],
    default: 'pending'
  },
  isAnonymous: {
    type: Boolean,
    default: false
  },
  authorName: {
    type: String,
    trim: true,
    maxlength: 100
  },
  authorEmail: {
    type: String,
    trim: true,
    lowercase: true
  },
  authorWebsite: {
    type: String,
    trim: true
  },
  ipAddress: {
    type: String
  },
  userAgent: {
    type: String
  },
  likes: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  replies: [{
    type: Schema.Types.ObjectId,
    ref: 'Comment'
  }]
}, {
  timestamps: true
});

commentSchema.index({ post: 1, status: 1 });
commentSchema.index({ author: 1 });
commentSchema.index({ parentComment: 1 });
commentSchema.index({ createdAt: -1 });

export default mongoose.model<IComment>('Comment', commentSchema);