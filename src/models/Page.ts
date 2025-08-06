import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IPage extends Document {
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  featuredImage?: string;
  author: Types.ObjectId;
  status: 'draft' | 'published' | 'archived' | 'scheduled' | 'pending_review';
  template: 'default' | 'full-width' | 'minimal' | 'landing' | 'contact' | 'about' | 'visual-builder';
  icon?: string;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string[];
  categories?: Types.ObjectId[];
  tags?: Types.ObjectId[];
  isHomePage: boolean;
  parentPage?: Types.ObjectId;
  menuOrder: number;
  showInMenu: boolean;
  customCss?: string;
  customJs?: string;
  views: number;
  publishedAt?: Date;
  scheduledAt?: Date;
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
  // Template-specific fields
  ctaText?: string;
  phone?: string;
  email?: string;
  address?: string;
  yearsExperience?: string;
  customers?: string;
  projects?: string;
  teamSize?: string;
  // Visual Builder fields
  builderData?: {
    blocks: Array<{
      id: string;
      type: string;
      component: string;
      props: Record<string, any>;
      styles: {
        desktop: Record<string, any>;
        tablet: Record<string, any>;
        mobile: Record<string, any>;
      };
      children?: string[];
      parentId?: string;
      order: number;
    }>;
    globalStyles: {
      desktop: Record<string, any>;
      tablet: Record<string, any>;
      mobile: Record<string, any>;
    };
    settings: {
      containerWidth: string;
      spacing: string;
      typography: Record<string, any>;
      colors: Record<string, any>;
    };
  };
  isVisualBuilder: boolean;
  contentHistory: {
    content: string;
    builderData?: any;
    savedAt: Date;
    savedBy: Types.ObjectId;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

const pageSchema = new Schema<IPage>({
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
    type: String
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
  template: {
    type: String,
    enum: ['default', 'full-width', 'minimal', 'landing', 'contact', 'about', 'visual-builder'],
    default: 'default'
  },
  icon: {
    type: String,
    maxlength: 50
  },
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
  categories: [{
    type: Schema.Types.ObjectId,
    ref: 'Category'
  }],
  tags: [{
    type: Schema.Types.ObjectId,
    ref: 'Tag'
  }],
  isHomePage: {
    type: Boolean,
    default: false
  },
  parentPage: {
    type: Schema.Types.ObjectId,
    ref: 'Page'
  },
  menuOrder: {
    type: Number,
    default: 0
  },
  showInMenu: {
    type: Boolean,
    default: true
  },
  customCss: {
    type: String
  },
  customJs: {
    type: String
  },
  views: {
    type: Number,
    default: 0
  },
  publishedAt: {
    type: Date
  },
  scheduledAt: {
    type: Date
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
  },
  // Template-specific fields
  ctaText: {
    type: String
  },
  phone: {
    type: String
  },
  email: {
    type: String
  },
  address: {
    type: String
  },
  yearsExperience: {
    type: String
  },
  customers: {
    type: String
  },
  projects: {
    type: String
  },
  teamSize: {
    type: String
  },
  // Visual Builder fields
  builderData: {
    blocks: [{
      id: { type: String, required: true },
      type: { type: String, required: true },
      component: { type: String, required: true },
      props: { type: Schema.Types.Mixed, default: {} },
      styles: {
        desktop: { type: Schema.Types.Mixed, default: {} },
        tablet: { type: Schema.Types.Mixed, default: {} },
        mobile: { type: Schema.Types.Mixed, default: {} }
      },
      children: [{ type: String }],
      parentId: { type: String },
      order: { type: Number, default: 0 }
    }],
    globalStyles: {
      desktop: { type: Schema.Types.Mixed, default: {} },
      tablet: { type: Schema.Types.Mixed, default: {} },
      mobile: { type: Schema.Types.Mixed, default: {} }
    },
    settings: {
      containerWidth: { type: String, default: '1200px' },
      spacing: { type: String, default: 'normal' },
      typography: { type: Schema.Types.Mixed, default: {} },
      colors: { type: Schema.Types.Mixed, default: {} }
    }
  },
  isVisualBuilder: {
    type: Boolean,
    default: false
  },
  contentHistory: [{
    content: { type: String, required: true },
    builderData: { type: Schema.Types.Mixed },
    savedAt: { type: Date, default: Date.now },
    savedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }
  }]
}, {
  timestamps: true
});

pageSchema.pre('save', function(next) {
  if (this.isModified('content') || this.isModified('title')) {
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
  
  // Set default icons based on template if no icon is provided
  if (!this.icon && this.template) {
    const defaultIcons = {
      'landing': 'rocket',
      'contact': 'mail',
      'about': 'info',
      'default': 'file-text',
      'full-width': 'maximize',
      'minimal': 'minimize',
      'visual-builder': 'layout'
    };
    this.icon = defaultIcons[this.template] || 'file-text';
  }
  
  next();
});

// Indexes
pageSchema.index({ slug: 1 });
pageSchema.index({ author: 1 });
pageSchema.index({ status: 1 });
pageSchema.index({ isHomePage: 1 });
pageSchema.index({ showInMenu: 1 });
pageSchema.index({ menuOrder: 1 });
pageSchema.index({ version: -1 });
pageSchema.index({ 'workflowStatus.currentWorkflow': 1 });
pageSchema.index({ 'collaborators.userId': 1 });
pageSchema.index({ searchableContent: 'text' });
pageSchema.index({ seoKeywords: 1 });
pageSchema.index({ categories: 1 });
pageSchema.index({ tags: 1 });

// Text index for search
pageSchema.index({
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

export default mongoose.model<IPage>('Page', pageSchema);