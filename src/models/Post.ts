import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IPost extends Document {
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  featuredImage?: string;
  author: Types.ObjectId;
  status: 'draft' | 'published' | 'archived';
  tags: string[];
  categories: string[];
  seoTitle?: string;
  seoDescription?: string;
  views: number;
  likes: Types.ObjectId[];
  publishedAt?: Date;
  scheduledAt?: Date;
  contentHistory: {
    content: string;
    savedAt: Date;
    savedBy: Types.ObjectId;
  }[];
  readingTime: number;
  wordCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const postSchema = new Schema<IPost>({
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
    type: String,
    maxlength: 500
  },
  featuredImage: {
    type: String
  },
  author: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'draft'
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  categories: [{
    type: String,
    trim: true
  }],
  seoTitle: {
    type: String,
    maxlength: 70
  },
  seoDescription: {
    type: String,
    maxlength: 160
  },
  views: {
    type: Number,
    default: 0
  },
  likes: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  publishedAt: {
    type: Date
  },
  scheduledAt: {
    type: Date
  },
  contentHistory: [{
    content: { type: String, required: true },
    savedAt: { type: Date, default: Date.now },
    savedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }
  }],
  readingTime: {
    type: Number,
    default: 0
  },
  wordCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

postSchema.pre('save', function(next) {
  if (this.isModified('content')) {
    const words = this.content.split(/\s+/).length;
    this.wordCount = words;
    this.readingTime = Math.ceil(words / 200); // Average reading speed: 200 words per minute
    
    if (!this.excerpt && this.content) {
      this.excerpt = this.content.replace(/<[^>]*>/g, '').substring(0, 150) + '...';
    }
  }
  
  if (this.isModified('status') && this.status === 'published' && !this.publishedAt) {
    this.publishedAt = new Date();
  }
  
  next();
});

postSchema.index({ slug: 1 });
postSchema.index({ author: 1 });
postSchema.index({ status: 1 });
postSchema.index({ tags: 1 });
postSchema.index({ categories: 1 });
postSchema.index({ publishedAt: -1 });
postSchema.index({ createdAt: -1 });

export default mongoose.model<IPost>('Post', postSchema);