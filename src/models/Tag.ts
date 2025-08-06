import mongoose, { Document, Schema } from 'mongoose';

export interface ITag extends Document {
  name: string;
  slug: string;
  description?: string;
  color?: string;
  isActive: boolean;
  postCount: number;
  pageCount: number;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const tagSchema = new Schema<ITag>({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  description: {
    type: String,
    trim: true,
    maxlength: 200
  },
  color: {
    type: String,
    default: '#10b981',
    match: /^#[0-9A-F]{6}$/i
  },
  isActive: {
    type: Boolean,
    default: true
  },
  postCount: {
    type: Number,
    default: 0
  },
  pageCount: {
    type: Number,
    default: 0
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
tagSchema.index({ slug: 1 });
tagSchema.index({ name: 'text' });
tagSchema.index({ isActive: 1 });
tagSchema.index({ postCount: -1 });
tagSchema.index({ createdBy: 1 });

// Generate slug from name if not provided
tagSchema.pre('save', function(next) {
  if (!this.slug && this.name) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }
  next();
});

export default mongoose.model<ITag>('Tag', tagSchema);