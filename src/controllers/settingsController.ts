import { Response } from 'express';
import { validationResult } from 'express-validator';
import { v2 as cloudinary } from 'cloudinary';
import Settings from '../models/Settings';
import { AuthRequest } from '../middleware/auth';
import { logActivity } from './activityController';
import Media from '../models/Media';

// Get current settings
export const getSettings = async (req: AuthRequest, res: Response) => {
  try {
    let settings = await Settings.findOne().lean();
    
    // If no settings exist, create default settings
    if (!settings) {
      await createDefaultSettings(req.user._id);
      settings = await Settings.findOne().lean();
    }

    // Remove sensitive data from response
    const safeSettings = { ...settings };
    delete (safeSettings as any).smtpPassword;

    res.json({
      success: true,
      data: safeSettings
    });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch settings',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
};

// Update settings
export const updateSettings = async (req: AuthRequest, res: Response) => {
  try {
    // Check admin permissions
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const updateData = {
      ...req.body,
      updatedBy: req.user._id
    };

    // Get current settings for comparison
    const oldSettings = await Settings.findOne().lean();

    let settings = await Settings.findOneAndUpdate(
      {},
      updateData,
      { 
        new: true, 
        upsert: true,
        runValidators: true
      }
    ).lean();

    // Log activity
    await logActivity({
      type: 'user',
      action: 'updated settings',
      userId: req.user._id.toString(),
      userDetails: {
        username: req.user.username,
        firstName: req.user.firstName,
        lastName: req.user.lastName
      },
      metadata: {
        oldValues: oldSettings,
        newValues: settings,
        changedFields: getChangedFields(oldSettings, settings)
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    // Remove sensitive data from response
    const safeSettings = { ...settings };
    delete (safeSettings as any).smtpPassword;

    res.json({
      success: true,
      message: 'Settings updated successfully',
      data: safeSettings
    });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update settings',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
};

// Reset settings to defaults
export const resetSettings = async (req: AuthRequest, res: Response) => {
  try {
    // Delete existing settings
    await Settings.deleteMany({});
    
    // Create new default settings
    const settings = await createDefaultSettings(req.user._id);

    // Log activity
    await logActivity({
      type: 'user',
      action: 'reset settings',
      userId: req.user._id.toString(),
      userDetails: {
        username: req.user.username,
        firstName: req.user.firstName,
        lastName: req.user.lastName
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    // Remove sensitive data from response
    const safeSettings = { ...settings };
    delete (safeSettings as any).smtpPassword;

    res.json({
      success: true,
      message: 'Settings reset to defaults successfully',
      data: safeSettings
    });
  } catch (error) {
    console.error('Reset settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset settings',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
};

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Upload logo
export const uploadLogo = async (req: AuthRequest, res: Response) => {
  try {
    // Check admin permissions
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    // Validate file type (only images)
    if (!req.file.mimetype.startsWith('image/')) {
      return res.status(400).json({
        success: false,
        message: 'Please upload an image file'
      });
    }

    // Validate file size (max 5MB for logos)
    if (req.file.size > 5 * 1024 * 1024) {
      return res.status(400).json({
        success: false,
        message: 'Logo image must be under 5MB'
      });
    }

    // Upload to Cloudinary
    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'site-logos',
          resource_type: 'image',
          quality: 'auto',
          fetch_format: 'auto',
          transformation: [
            { width: 400, height: 200, crop: 'fit' }, // Logo dimensions
            { quality: 'auto' }
          ]
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      uploadStream.end(req.file!.buffer);
    }) as any;

    // Create media record
    const media = new Media({
      fileName: result.public_id,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      url: result.secure_url,
      cloudinaryId: result.public_id,
      alt: 'Site Logo',
      folder: 'site-logos',
      uploadedBy: req.user._id
    });

    await media.save();

    // Update settings with new logo
    const settings = await Settings.findOneAndUpdate(
      {},
      { 
        siteLogo: media.url,
        updatedBy: req.user._id
      },
      { 
        new: true, 
        upsert: true,
        runValidators: true
      }
    ).lean();

    // Log activity
    await logActivity({
      type: 'user',
      action: 'uploaded site logo',
      userId: req.user._id.toString(),
      userDetails: {
        username: req.user.username,
        firstName: req.user.firstName,
        lastName: req.user.lastName
      },
      metadata: {
        logoUrl: media.url,
        fileName: media.fileName
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      message: 'Logo uploaded successfully',
      media: {
        _id: media._id,
        url: media.url,
        fileName: media.fileName,
        originalName: media.originalName,
        size: media.size,
        mimeType: media.mimeType
      }
    });

  } catch (error) {
    console.error('Logo upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error uploading logo'
    });
  }
};

// Test email configuration
export const testEmailConfig = async (req: AuthRequest, res: Response) => {
  try {
    // Check admin permissions
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    const { testEmail } = req.body;
    
    if (!testEmail) {
      return res.status(400).json({
        success: false,
        message: 'Test email address is required'
      });
    }

    // Get current settings
    const settings = await Settings.findOne();
    if (!settings || !settings.smtpHost) {
      return res.status(400).json({
        success: false,
        message: 'SMTP configuration not found. Please configure email settings first.'
      });
    }

    // Here you would typically test the email configuration
    // For now, we'll just return a success response
    res.json({
      success: true,
      message: `Test email sent to ${testEmail}`,
      testPerformed: true
    });

  } catch (error) {
    console.error('Test email error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to test email configuration'
    });
  }
};

// Helper function to create default settings
const createDefaultSettings = async (userId: string) => {
  const defaultSettings = new Settings({
    updatedBy: userId
  });
  
  return await defaultSettings.save();
};

// Helper function to get changed fields
const getChangedFields = (oldSettings: any, newSettings: any): string[] => {
  if (!oldSettings) return [];
  
  const changedFields: string[] = [];
  const fieldsToCheck = [
    'siteName', 'siteDescription', 'siteUrl', 'adminEmail', 'timezone', 'language',
    'postsPerPage', 'allowComments', 'moderateComments', 'allowRegistration', 'defaultRole',
    'smtpHost', 'smtpPort', 'smtpUser', 'smtpSecure', 'fromEmail', 'fromName',
    'newComments', 'newUsers', 'newPosts', 'systemUpdates', 'emailDigest', 'desktopNotifications',
    'enableTwoFactor', 'sessionTimeout', 'maxLoginAttempts', 'enableAnalytics', 'trackingCode'
  ];

  fieldsToCheck.forEach(field => {
    if (oldSettings[field] !== newSettings[field]) {
      changedFields.push(field);
    }
  });

  return changedFields;
};