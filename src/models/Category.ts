import mongoose, { Document, Schema } from 'mongoose';

export interface ICategory extends Document {
  name: string;
  slug: string;
  description?: string;
  color?: string;
  icon?: string;
  parentId?: mongoose.Types.ObjectId;
  level: number;
  isActive: boolean;
  sortOrder: number;
  postCount: number;
  pageCount: number;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const categorySchema = new Schema<ICategory>({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
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
    maxlength: 500
  },
  color: {
    type: String,
    default: '#3b82f6',
    match: /^#[0-9A-F]{6}$/i
  },
  icon: {
    type: String,
    default: 'folder'
  },
  parentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    default: null
  },
  level: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  isActive: {
    type: Boolean,
    default: true
  },
  sortOrder: {
    type: Number,
    default: 0
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
categorySchema.index({ slug: 1 });
categorySchema.index({ parentId: 1 });
categorySchema.index({ level: 1 });
categorySchema.index({ isActive: 1 });
categorySchema.index({ sortOrder: 1 });
categorySchema.index({ createdBy: 1 });

// Virtual for subcategories
categorySchema.virtual('subcategories', {
  ref: 'Category',
  localField: '_id',
  foreignField: 'parentId'
});

// Virtual for parent category
categorySchema.virtual('parent', {
  ref: 'Category',
  localField: 'parentId',
  foreignField: '_id',
  justOne: true
});

// Pre-save middleware to set level based on parent
categorySchema.pre('save', async function(next) {
  if (this.parentId) {
    const parent = await mongoose.model('Category').findById(this.parentId);
    if (parent) {
      this.level = (parent as any).level + 1;
    }
  } else {
    this.level = 0;
  }
  next();
});

// Generate slug from name if not provided
categorySchema.pre('save', function(next) {
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

export default mongoose.model<ICategory>('Category', categorySchema);