import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IPost extends Document {
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  featuredImage?: string;
  author: Types.ObjectId;
  status: 'draft' | 'published' | 'archived' | 'scheduled' | 'pending_review';
  tags: Types.ObjectId[];
  categories: Types.ObjectId[];
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string[];
  views: number;
  likes: Types.ObjectId[];
  publishedAt?: Date;
  scheduledAt?: Date;
  contentHistory: {
    content: string;
    savedAt: Date;
    savedBy: Types.ObjectId;
  }[];
  // New enhanced fields
  version: number;
  customFields?: Record<string, any>;
  workflowStatus?: {
    currentWorkflow?: Types.ObjectId;
    currentStep?: string;
    submittedAt?: Date;
    submittedBy?: Types.ObjectId;
  };
  collaborators: {
    userId: Types.ObjectId;
    permission: 'read' | 'edit' | 'admin';
    addedAt: Date;
    addedBy: Types.ObjectId;
  }[];
  searchableContent: string;
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
    enum: ['draft', 'published', 'archived', 'scheduled', 'pending_review'],
    default: 'draft'
  },
  tags: [{
    type: Schema.Types.ObjectId,
    ref: 'Tag'
  }],
  categories: [{
    type: Schema.Types.ObjectId,
    ref: 'Category'
  }],
  seoTitle: {
    type: String,
    maxlength: 70
  },
  seoDescription: {
    type: String,
    maxlength: 160
  },
  seoKeywords: [{
    type: String,
    trim: true,
    maxlength: 50
  }],
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
  },
  // New enhanced fields
  version: {
    type: Number,
    default: 1,
    min: 1
  },
  customFields: {
    type: Schema.Types.Mixed,
    default: {}
  },
  workflowStatus: {
    currentWorkflow: {
      type: Schema.Types.ObjectId,
      ref: 'Workflow'
    },
    currentStep: {
      type: String
    },
    submittedAt: {
      type: Date
    },
    submittedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  collaborators: [{
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    permission: {
      type: String,
      enum: ['read', 'edit', 'admin'],
      default: 'edit'
    },
    addedAt: {
      type: Date,
      default: Date.now
    },
    addedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  }],
  searchableContent: {
    type: String,
    index: 'text'
  }
}, {
  timestamps: true
});

postSchema.pre('save', function(next) {
  if (this.isModified('content') || this.isModified('title')) {
    const words = this.content.split(/\s+/).length;
    this.wordCount = words;
    this.readingTime = Math.ceil(words / 200); // Average reading speed: 200 words per minute
    
    if (!this.excerpt && this.content) {
      this.excerpt = this.content.replace(/<[^>]*>/g, '').substring(0, 150) + '...';
    }
    
    // Update searchable content for full-text search
    const cleanContent = this.content.replace(/<[^>]*>/g, ' ');
    this.searchableContent = `${this.title} ${cleanContent} ${this.excerpt || ''}`.toLowerCase();
  }
  
  if (this.isModified('status') && this.status === 'published' && !this.publishedAt) {
    this.publishedAt = new Date();
  }
  
  // Increment version on content changes
  if (this.isModified('content') && !this.isNew) {
    this.version += 1;
  }
  
  next();
});

// Indexes
postSchema.index({ slug: 1 });
postSchema.index({ author: 1 });
postSchema.index({ status: 1 });
postSchema.index({ tags: 1 });
postSchema.index({ categories: 1 });
postSchema.index({ publishedAt: -1 });
postSchema.index({ createdAt: -1 });
postSchema.index({ version: -1 });
postSchema.index({ 'workflowStatus.currentWorkflow': 1 });
postSchema.index({ 'collaborators.userId': 1 });
postSchema.index({ searchableContent: 'text' });
postSchema.index({ seoKeywords: 1 });

// Text index for search
postSchema.index({
  title: 'text',
  searchableContent: 'text',
  'seoKeywords': 'text'
}, {
  weights: {
    title: 10,
    searchableContent: 5,
    seoKeywords: 3
  }
});

export default mongoose.model<IPost>('Post', postSchema);