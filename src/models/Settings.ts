import mongoose, { Document, Schema } from 'mongoose';

export interface ISettings extends Document {
  // General Settings
  siteName: string;
  siteDescription: string;
  siteUrl: string;
  adminEmail: string;
  timezone: string;
  language: string;
  siteLogo?: string;
  
  // Content Settings
  postsPerPage: number;
  allowComments: boolean;
  moderateComments: boolean;
  allowRegistration: boolean;
  defaultRole: 'viewer' | 'editor' | 'admin';
  autoSave: boolean;
  contentVersioning: boolean;
  
  // Email Settings
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPassword?: string;
  smtpSecure: boolean;
  fromEmail?: string;
  fromName?: string;
  
  // Notification Settings
  newComments: boolean;
  newUsers: boolean;
  newPosts: boolean;
  systemUpdates: boolean;
  emailDigest: boolean;
  desktopNotifications: boolean;
  
  // Security Settings
  enableTwoFactor: boolean;
  sessionTimeout: number;
  maxLoginAttempts: number;
  
  // Analytics Settings
  enableAnalytics: boolean;
  trackingCode?: string;
  
  updatedAt: Date;
  updatedBy: mongoose.Types.ObjectId;
}

const SettingsSchema = new Schema<ISettings>({
  // General Settings
  siteName: {
    type: String,
    required: true,
    default: 'Content Hub',
    maxlength: 100
  },
  siteDescription: {
    type: String,
    required: true,
    default: 'A powerful content management system',
    maxlength: 500
  },
  siteUrl: {
    type: String,
    required: true,
    default: 'https://yourdomain.com',
    maxlength: 200
  },
  adminEmail: {
    type: String,
    required: true,
    default: 'admin@yourdomain.com',
    maxlength: 100
  },
  timezone: {
    type: String,
    required: true,
    default: 'America/New_York',
    maxlength: 50
  },
  language: {
    type: String,
    required: true,
    default: 'en',
    maxlength: 10
  },
  siteLogo: {
    type: String,
    maxlength: 500
  },
  
  // Content Settings
  postsPerPage: {
    type: Number,
    required: true,
    default: 10,
    min: 1,
    max: 100
  },
  allowComments: {
    type: Boolean,
    default: true
  },
  moderateComments: {
    type: Boolean,
    default: true
  },
  allowRegistration: {
    type: Boolean,
    default: false
  },
  defaultRole: {
    type: String,
    enum: ['viewer', 'editor', 'admin'],
    default: 'viewer'
  },
  autoSave: {
    type: Boolean,
    default: true
  },
  contentVersioning: {
    type: Boolean,
    default: true
  },
  
  // Email Settings
  smtpHost: {
    type: String,
    maxlength: 100
  },
  smtpPort: {
    type: Number,
    min: 1,
    max: 65535,
    default: 587
  },
  smtpUser: {
    type: String,
    maxlength: 100
  },
  smtpPassword: {
    type: String,
    maxlength: 200
  },
  smtpSecure: {
    type: Boolean,
    default: false
  },
  fromEmail: {
    type: String,
    maxlength: 100
  },
  fromName: {
    type: String,
    maxlength: 100
  },
  
  // Notification Settings
  newComments: {
    type: Boolean,
    default: true
  },
  newUsers: {
    type: Boolean,
    default: true
  },
  newPosts: {
    type: Boolean,
    default: false
  },
  systemUpdates: {
    type: Boolean,
    default: true
  },
  emailDigest: {
    type: Boolean,
    default: false
  },
  desktopNotifications: {
    type: Boolean,
    default: true
  },
  
  // Security Settings
  enableTwoFactor: {
    type: Boolean,
    default: false
  },
  sessionTimeout: {
    type: Number,
    default: 24, // hours
    min: 1,
    max: 168 // 1 week max
  },
  maxLoginAttempts: {
    type: Number,
    default: 5,
    min: 1,
    max: 20
  },
  
  // Analytics Settings
  enableAnalytics: {
    type: Boolean,
    default: true
  },
  trackingCode: {
    type: String,
    maxlength: 500
  },
  
  updatedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: { createdAt: false, updatedAt: true }
});

// Ensure only one settings document exists
SettingsSchema.index({}, { unique: true });

export default mongoose.model<ISettings>('Settings', SettingsSchema);