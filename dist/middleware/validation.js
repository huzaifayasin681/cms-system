"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateSettings = exports.validateComment = exports.validatePage = exports.validatePost = exports.validateResetPassword = exports.validateEmail = exports.validateChangePassword = exports.validateUpdateProfile = exports.validateLogin = exports.validateRegister = void 0;
const express_validator_1 = require("express-validator");
exports.validateRegister = [
    (0, express_validator_1.body)('username')
        .trim()
        .isLength({ min: 3, max: 30 })
        .withMessage('Username must be between 3 and 30 characters')
        .matches(/^[a-zA-Z0-9_]+$/)
        .withMessage('Username can only contain letters, numbers, and underscores'),
    (0, express_validator_1.body)('email')
        .trim()
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email'),
    (0, express_validator_1.body)('password')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters long')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
    (0, express_validator_1.body)('role')
        .optional()
        .isIn(['admin', 'editor', 'viewer'])
        .withMessage('Role must be admin, editor, or viewer')
];
exports.validateLogin = [
    (0, express_validator_1.body)('login')
        .trim()
        .notEmpty()
        .withMessage('Email or username is required'),
    (0, express_validator_1.body)('password')
        .notEmpty()
        .withMessage('Password is required')
];
exports.validateUpdateProfile = [
    (0, express_validator_1.body)('firstName')
        .optional()
        .trim()
        .isLength({ max: 50 })
        .withMessage('First name cannot exceed 50 characters'),
    (0, express_validator_1.body)('lastName')
        .optional()
        .trim()
        .isLength({ max: 50 })
        .withMessage('Last name cannot exceed 50 characters'),
    (0, express_validator_1.body)('bio')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Bio cannot exceed 500 characters'),
    (0, express_validator_1.body)('avatar')
        .optional()
        .trim()
        .custom((value) => {
        if (value && value !== '' && !value.match(/^https?:\/\/.+/)) {
            throw new Error('Avatar must be a valid URL');
        }
        return true;
    }),
    (0, express_validator_1.body)('website')
        .optional()
        .trim()
        .custom((value) => {
        if (value && value !== '' && !value.match(/^https?:\/\/.+/)) {
            throw new Error('Website must be a valid URL');
        }
        return true;
    }),
    (0, express_validator_1.body)('location')
        .optional()
        .trim()
        .isLength({ max: 100 })
        .withMessage('Location cannot exceed 100 characters'),
    (0, express_validator_1.body)('phone')
        .optional()
        .trim()
        .isLength({ max: 20 })
        .withMessage('Phone number cannot exceed 20 characters')
];
exports.validateChangePassword = [
    (0, express_validator_1.body)('currentPassword')
        .notEmpty()
        .withMessage('Current password is required'),
    (0, express_validator_1.body)('newPassword')
        .isLength({ min: 6 })
        .withMessage('New password must be at least 6 characters long')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('New password must contain at least one lowercase letter, one uppercase letter, and one number')
];
exports.validateEmail = [
    (0, express_validator_1.body)('email')
        .trim()
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email')
];
exports.validateResetPassword = [
    (0, express_validator_1.body)('token')
        .trim()
        .notEmpty()
        .withMessage('Reset token is required'),
    (0, express_validator_1.body)('newPassword')
        .isLength({ min: 6 })
        .withMessage('New password must be at least 6 characters long')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('New password must contain at least one lowercase letter, one uppercase letter, and one number')
];
exports.validatePost = [
    (0, express_validator_1.body)('title')
        .trim()
        .notEmpty()
        .withMessage('Title is required')
        .isLength({ max: 200 })
        .withMessage('Title cannot exceed 200 characters'),
    (0, express_validator_1.body)('slug')
        .trim()
        .notEmpty()
        .withMessage('Slug is required')
        .matches(/^[a-z0-9-]+$/)
        .withMessage('Slug can only contain lowercase letters, numbers, and hyphens'),
    (0, express_validator_1.body)('content')
        .trim()
        .notEmpty()
        .withMessage('Content is required'),
    (0, express_validator_1.body)('excerpt')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Excerpt cannot exceed 500 characters'),
    (0, express_validator_1.body)('status')
        .optional()
        .isIn(['draft', 'published', 'archived'])
        .withMessage('Status must be draft, published, or archived'),
    (0, express_validator_1.body)('tags')
        .optional()
        .isArray()
        .withMessage('Tags must be an array'),
    (0, express_validator_1.body)('categories')
        .optional()
        .isArray()
        .withMessage('Categories must be an array'),
    (0, express_validator_1.body)('seoTitle')
        .optional()
        .trim()
        .isLength({ max: 70 })
        .withMessage('SEO title cannot exceed 70 characters'),
    (0, express_validator_1.body)('seoDescription')
        .optional()
        .trim()
        .isLength({ max: 160 })
        .withMessage('SEO description cannot exceed 160 characters')
];
exports.validatePage = [
    (0, express_validator_1.body)('title')
        .trim()
        .notEmpty()
        .withMessage('Title is required')
        .isLength({ max: 200 })
        .withMessage('Title cannot exceed 200 characters'),
    (0, express_validator_1.body)('slug')
        .trim()
        .notEmpty()
        .withMessage('Slug is required')
        .matches(/^[a-z0-9-]+$/)
        .withMessage('Slug can only contain lowercase letters, numbers, and hyphens'),
    (0, express_validator_1.body)('content')
        .trim()
        .notEmpty()
        .withMessage('Content is required'),
    (0, express_validator_1.body)('template')
        .optional()
        .isIn(['default', 'full-width', 'minimal', 'landing', 'contact', 'about'])
        .withMessage('Template must be default, full-width, minimal, landing, contact, or about'),
    (0, express_validator_1.body)('status')
        .optional()
        .isIn(['draft', 'published', 'archived'])
        .withMessage('Status must be draft, published, or archived'),
    (0, express_validator_1.body)('seoTitle')
        .optional()
        .trim()
        .isLength({ max: 70 })
        .withMessage('SEO title cannot exceed 70 characters'),
    (0, express_validator_1.body)('seoDescription')
        .optional()
        .trim()
        .isLength({ max: 160 })
        .withMessage('SEO description cannot exceed 160 characters'),
    (0, express_validator_1.body)('showInMenu')
        .optional()
        .isBoolean()
        .withMessage('showInMenu must be a boolean'),
    (0, express_validator_1.body)('menuOrder')
        .optional()
        .isInt({ min: 0 })
        .withMessage('menuOrder must be a non-negative integer'),
    (0, express_validator_1.body)('isHomePage')
        .optional()
        .isBoolean()
        .withMessage('isHomePage must be a boolean')
];
exports.validateComment = [
    (0, express_validator_1.body)('content')
        .trim()
        .notEmpty()
        .withMessage('Comment content is required')
        .isLength({ max: 1000 })
        .withMessage('Comment cannot exceed 1000 characters'),
    (0, express_validator_1.body)('authorName')
        .optional()
        .trim()
        .isLength({ max: 100 })
        .withMessage('Author name cannot exceed 100 characters'),
    (0, express_validator_1.body)('authorEmail')
        .optional()
        .trim()
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email'),
    (0, express_validator_1.body)('authorWebsite')
        .optional()
        .trim()
        .isURL()
        .withMessage('Website must be a valid URL')
];
exports.validateSettings = [
    (0, express_validator_1.body)('siteName')
        .optional()
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('Site name must be between 1 and 100 characters'),
    (0, express_validator_1.body)('siteDescription')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Site description cannot exceed 500 characters'),
    (0, express_validator_1.body)('siteUrl')
        .optional()
        .trim()
        .isURL()
        .withMessage('Site URL must be a valid URL'),
    (0, express_validator_1.body)('adminEmail')
        .optional()
        .trim()
        .isEmail()
        .normalizeEmail()
        .withMessage('Admin email must be a valid email address'),
    (0, express_validator_1.body)('timezone')
        .optional()
        .trim()
        .isLength({ max: 50 })
        .withMessage('Timezone must be a valid timezone string'),
    (0, express_validator_1.body)('language')
        .optional()
        .trim()
        .isLength({ min: 2, max: 10 })
        .withMessage('Language code must be between 2 and 10 characters'),
    (0, express_validator_1.body)('siteLogo')
        .optional()
        .trim()
        .isURL()
        .withMessage('Site logo must be a valid URL'),
    (0, express_validator_1.body)('postsPerPage')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Posts per page must be between 1 and 100'),
    (0, express_validator_1.body)('defaultRole')
        .optional()
        .isIn(['viewer', 'editor', 'admin'])
        .withMessage('Default role must be viewer, editor, or admin'),
    (0, express_validator_1.body)('smtpHost')
        .optional()
        .trim()
        .isLength({ max: 100 })
        .withMessage('SMTP host cannot exceed 100 characters'),
    (0, express_validator_1.body)('smtpPort')
        .optional()
        .isInt({ min: 1, max: 65535 })
        .withMessage('SMTP port must be between 1 and 65535'),
    (0, express_validator_1.body)('smtpUser')
        .optional()
        .trim()
        .isLength({ max: 100 })
        .withMessage('SMTP user cannot exceed 100 characters'),
    (0, express_validator_1.body)('smtpPassword')
        .optional()
        .isLength({ max: 200 })
        .withMessage('SMTP password cannot exceed 200 characters'),
    (0, express_validator_1.body)('fromEmail')
        .optional()
        .trim()
        .isEmail()
        .normalizeEmail()
        .withMessage('From email must be a valid email address'),
    (0, express_validator_1.body)('fromName')
        .optional()
        .trim()
        .isLength({ max: 100 })
        .withMessage('From name cannot exceed 100 characters'),
    (0, express_validator_1.body)('sessionTimeout')
        .optional()
        .isInt({ min: 1, max: 168 })
        .withMessage('Session timeout must be between 1 and 168 hours'),
    (0, express_validator_1.body)('maxLoginAttempts')
        .optional()
        .isInt({ min: 1, max: 20 })
        .withMessage('Max login attempts must be between 1 and 20'),
    (0, express_validator_1.body)('trackingCode')
        .optional()
        .isLength({ max: 500 })
        .withMessage('Tracking code cannot exceed 500 characters')
];
