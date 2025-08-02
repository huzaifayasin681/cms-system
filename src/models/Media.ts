import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IMedia extends Document {
  fileName: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  cloudinaryId?: string;
  alt?: string;
  caption?: string;
  uploadedBy: Types.ObjectId;
  folder: string;
  width?: number;
  height?: number;
  tags: string[];
  isUsed: boolean;
  usageCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const mediaSchema = new Schema<IMedia>({
  fileName: {
    type: String,
    required: true
  },
  originalName: {
    type: String,
    required: true
  },
  mimeType: {
    type: String,
    required: true
  },
  size: {
    type: Number,
    required: true
  },
  url: {
    type: String,
    required: true
  },
  cloudinaryId: {
    type: String
  },
  alt: {
    type: String,
    maxlength: 200
  },
  caption: {
    type: String,
    maxlength: 500
  },
  uploadedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  folder: {
    type: String,
    default: 'uploads'
  },
  width: {
    type: Number
  },
  height: {
    type: Number
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  isUsed: {
    type: Boolean,
    default: false
  },
  usageCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

mediaSchema.index({ uploadedBy: 1 });
mediaSchema.index({ mimeType: 1 });
mediaSchema.index({ folder: 1 });
mediaSchema.index({ tags: 1 });
mediaSchema.index({ createdAt: -1 });

export default mongoose.model<IMedia>('Media', mediaSchema);