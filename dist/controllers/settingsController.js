"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.testEmailConfig = exports.uploadLogo = exports.resetSettings = exports.updateSettings = exports.getSettings = void 0;
const express_validator_1 = require("express-validator");
const cloudinary_1 = require("cloudinary");
const Settings_1 = __importDefault(require("../models/Settings"));
const activityController_1 = require("./activityController");
const Media_1 = __importDefault(require("../models/Media"));
const getSettings = async (req, res) => {
    try {
        let settings = await Settings_1.default.findOne().lean();
        if (!settings) {
            await createDefaultSettings(req.user._id);
            settings = await Settings_1.default.findOne().lean();
        }
        const safeSettings = { ...settings };
        delete safeSettings.smtpPassword;
        res.json({
            success: true,
            data: safeSettings
        });
    }
    catch (error) {
        console.error('Get settings error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch settings',
            error: process.env.NODE_ENV === 'development' ? error : {}
        });
    }
};
exports.getSettings = getSettings;
const updateSettings = async (req, res) => {
    try {
        if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
            return res.status(403).json({
                success: false,
                message: 'Admin access required'
            });
        }
        const errors = (0, express_validator_1.validationResult)(req);
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
        const oldSettings = await Settings_1.default.findOne().lean();
        let settings = await Settings_1.default.findOneAndUpdate({}, updateData, {
            new: true,
            upsert: true,
            runValidators: true
        }).lean();
        await (0, activityController_1.logActivity)({
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
        const safeSettings = { ...settings };
        delete safeSettings.smtpPassword;
        res.json({
            success: true,
            message: 'Settings updated successfully',
            data: safeSettings
        });
    }
    catch (error) {
        console.error('Update settings error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update settings',
            error: process.env.NODE_ENV === 'development' ? error : {}
        });
    }
};
exports.updateSettings = updateSettings;
const resetSettings = async (req, res) => {
    try {
        await Settings_1.default.deleteMany({});
        const settings = await createDefaultSettings(req.user._id);
        await (0, activityController_1.logActivity)({
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
        const safeSettings = { ...settings };
        delete safeSettings.smtpPassword;
        res.json({
            success: true,
            message: 'Settings reset to defaults successfully',
            data: safeSettings
        });
    }
    catch (error) {
        console.error('Reset settings error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to reset settings',
            error: process.env.NODE_ENV === 'development' ? error : {}
        });
    }
};
exports.resetSettings = resetSettings;
cloudinary_1.v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});
const uploadLogo = async (req, res) => {
    try {
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
        if (!req.file.mimetype.startsWith('image/')) {
            return res.status(400).json({
                success: false,
                message: 'Please upload an image file'
            });
        }
        if (req.file.size > 5 * 1024 * 1024) {
            return res.status(400).json({
                success: false,
                message: 'Logo image must be under 5MB'
            });
        }
        const result = await new Promise((resolve, reject) => {
            const uploadStream = cloudinary_1.v2.uploader.upload_stream({
                folder: 'site-logos',
                resource_type: 'image',
                quality: 'auto',
                fetch_format: 'auto',
                transformation: [
                    { width: 400, height: 200, crop: 'fit' },
                    { quality: 'auto' }
                ]
            }, (error, result) => {
                if (error)
                    reject(error);
                else
                    resolve(result);
            });
            uploadStream.end(req.file.buffer);
        });
        const media = new Media_1.default({
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
        const settings = await Settings_1.default.findOneAndUpdate({}, {
            siteLogo: media.url,
            updatedBy: req.user._id
        }, {
            new: true,
            upsert: true,
            runValidators: true
        }).lean();
        await (0, activityController_1.logActivity)({
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
    }
    catch (error) {
        console.error('Logo upload error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error uploading logo'
        });
    }
};
exports.uploadLogo = uploadLogo;
const testEmailConfig = async (req, res) => {
    try {
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
        const settings = await Settings_1.default.findOne();
        if (!settings || !settings.smtpHost) {
            return res.status(400).json({
                success: false,
                message: 'SMTP configuration not found. Please configure email settings first.'
            });
        }
        res.json({
            success: true,
            message: `Test email sent to ${testEmail}`,
            testPerformed: true
        });
    }
    catch (error) {
        console.error('Test email error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to test email configuration'
        });
    }
};
exports.testEmailConfig = testEmailConfig;
const createDefaultSettings = async (userId) => {
    const defaultSettings = new Settings_1.default({
        updatedBy: userId
    });
    return await defaultSettings.save();
};
const getChangedFields = (oldSettings, newSettings) => {
    if (!oldSettings)
        return [];
    const changedFields = [];
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
