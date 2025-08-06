import mongoose, { Document, Schema } from 'mongoose';

export interface IContentVersion extends Document {
  contentId: mongoose.Types.ObjectId;
  contentType: 'post' | 'page';
  version: number;
  title: string;
  content: string;
  excerpt?: string;
  slug: string;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string[];
  featuredImage?: string;
  categories?: mongoose.Types.ObjectId[];
  tags?: mongoose.Types.ObjectId[];
  customFields?: Record<string, any>;
  status: 'draft' | 'published' | 'archived';
  metadata: {
    changeType: 'create' | 'update' | 'revert';
    changeDescription?: string;
    previousVersion?: number;
    changedFields: string[];
    wordCount: number;
    readingTime: number;
  };
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
}

const contentVersionSchema = new Schema<IContentVersion>({
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
  version: {
    type: Number,
    required: true,
    min: 1
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  content: {
    type: String,
    required: true
  },
  excerpt: {
    type: String,
    trim: true,
    maxlength: 500
  },
  slug: {
    type: String,
    required: true,
    trim: true
  },
  seoTitle: {
    type: String,
    trim: true,
    maxlength: 60
  },
  seoDescription: {
    type: String,
    trim: true,
    maxlength: 160
  },
  seoKeywords: [{
    type: String,
    trim: true,
    maxlength: 50
  }],
  featuredImage: {
    type: String
  },
  categories: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category'
  }],
  tags: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tag'
  }],
  customFields: {
    type: Schema.Types.Mixed,
    default: {}
  },
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'draft'
  },
  metadata: {
    changeType: {
      type: String,
      enum: ['create', 'update', 'revert'],
      required: true
    },
    changeDescription: {
      type: String,
      trim: true,
      maxlength: 500
    },
    previousVersion: {
      type: Number
    },
    changedFields: [{
      type: String
    }],
    wordCount: {
      type: Number,
      default: 0
    },
    readingTime: {
      type: Number,
      default: 0
    }
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: { createdAt: true, updatedAt: false }
});

// Indexes
contentVersionSchema.index({ contentId: 1, version: -1 });
contentVersionSchema.index({ contentType: 1 });
contentVersionSchema.index({ createdAt: -1 });
contentVersionSchema.index({ createdBy: 1 });
contentVersionSchema.index({ 'metadata.changeType': 1 });

// Compound index for finding latest version
contentVersionSchema.index({ contentId: 1, contentType: 1, version: -1 });

// Static method to get latest version
contentVersionSchema.statics.getLatestVersion = function(contentId: mongoose.Types.ObjectId, contentType: string) {
  return this.findOne({ contentId, contentType }).sort({ version: -1 });
};

// Static method to get version diff
contentVersionSchema.statics.getVersionDiff = function(
  contentId: mongoose.Types.ObjectId,
  contentType: string,
  fromVersion: number,
  toVersion: number
) {
  return this.find({
    contentId,
    contentType,
    version: { $in: [fromVersion, toVersion] }
  }).sort({ version: 1 });
};

export default mongoose.model<IContentVersion>('ContentVersion', contentVersionSchema);