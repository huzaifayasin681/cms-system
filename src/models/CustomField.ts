import mongoose, { Document, Schema } from 'mongoose';

export interface ICustomFieldSchema {
  name: string;
  key: string;
  type: 'text' | 'textarea' | 'number' | 'boolean' | 'date' | 'select' | 'multiselect' | 'file' | 'url' | 'email' | 'json';
  required: boolean;
  defaultValue?: any;
  options?: string[]; // For select/multiselect
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
  };
  description?: string;
  placeholder?: string;
  helpText?: string;
}

export interface ICustomField extends Document {
  name: string;
  slug: string;
  description?: string;
  contentTypes: ('post' | 'page')[];
  fields: ICustomFieldSchema[];
  isActive: boolean;
  sortOrder: number;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const customFieldSchemaSchema = new Schema<ICustomFieldSchema>({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  key: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    match: /^[a-z0-9_]+$/
  },
  type: {
    type: String,
    required: true,
    enum: ['text', 'textarea', 'number', 'boolean', 'date', 'select', 'multiselect', 'file', 'url', 'email', 'json']
  },
  required: {
    type: Boolean,
    default: false
  },
  defaultValue: {
    type: Schema.Types.Mixed
  },
  options: [{
    type: String,
    trim: true
  }],
  validation: {
    min: Number,
    max: Number,
    pattern: String,
    message: String
  },
  description: {
    type: String,
    trim: true,
    maxlength: 200
  },
  placeholder: {
    type: String,
    trim: true,
    maxlength: 100
  },
  helpText: {
    type: String,
    trim: true,
    maxlength: 300
  }
}, { _id: false });

const customFieldSchema = new Schema<ICustomField>({
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
  contentTypes: [{
    type: String,
    enum: ['post', 'page'],
    required: true
  }],
  fields: [customFieldSchemaSchema],
  isActive: {
    type: Boolean,
    default: true
  },
  sortOrder: {
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
customFieldSchema.index({ slug: 1 });
customFieldSchema.index({ contentTypes: 1 });
customFieldSchema.index({ isActive: 1 });
customFieldSchema.index({ sortOrder: 1 });
customFieldSchema.index({ createdBy: 1 });

// Generate slug from name if not provided
customFieldSchema.pre('save', function(next) {
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

// Validate field keys are unique within the same custom field
customFieldSchema.pre('save', function(next) {
  const keys = this.fields.map(field => field.key);
  const uniqueKeys = new Set(keys);
  
  if (keys.length !== uniqueKeys.size) {
    return next(new Error('Field keys must be unique within the same custom field'));
  }
  
  next();
});

// Static method to get fields for content type
customFieldSchema.statics.getFieldsForContentType = function(contentType: string) {
  return this.find({
    contentTypes: contentType,
    isActive: true
  }).sort({ sortOrder: 1 });
};

export default mongoose.model<ICustomField>('CustomField', customFieldSchema);