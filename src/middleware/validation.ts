import { body } from 'express-validator';

export const validateRegister = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
    
  body('email')
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
    
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
    
  body('role')
    .optional()
    .isIn(['admin', 'editor', 'viewer'])
    .withMessage('Role must be admin, editor, or viewer')
];

export const validateLogin = [
  body('login')
    .trim()
    .notEmpty()
    .withMessage('Email or username is required'),
    
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

export const validateUpdateProfile = [
  body('firstName')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('First name cannot exceed 50 characters'),
    
  body('lastName')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Last name cannot exceed 50 characters'),
    
  body('bio')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Bio cannot exceed 500 characters'),
    
  body('avatar')
    .optional()
    .trim()
    .custom((value) => {
      if (value && value !== '' && !value.match(/^https?:\/\/.+/)) {
        throw new Error('Avatar must be a valid URL');
      }
      return true;
    }),
    
  body('website')
    .optional()
    .trim()
    .custom((value) => {
      if (value && value !== '' && !value.match(/^https?:\/\/.+/)) {
        throw new Error('Website must be a valid URL');
      }
      return true;
    }),
    
  body('location')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Location cannot exceed 100 characters'),
    
  body('phone')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('Phone number cannot exceed 20 characters')
];

export const validateChangePassword = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
    
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('New password must contain at least one lowercase letter, one uppercase letter, and one number')
];

export const validateEmail = [
  body('email')
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email')
];

export const validateResetPassword = [
  body('token')
    .trim()
    .notEmpty()
    .withMessage('Reset token is required'),
    
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('New password must contain at least one lowercase letter, one uppercase letter, and one number')
];

export const validatePost = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ max: 200 })
    .withMessage('Title cannot exceed 200 characters'),
    
  body('slug')
    .trim()
    .notEmpty()
    .withMessage('Slug is required')
    .matches(/^[a-z0-9-]+$/)
    .withMessage('Slug can only contain lowercase letters, numbers, and hyphens'),
    
  body('content')
    .trim()
    .notEmpty()
    .withMessage('Content is required'),
    
  body('excerpt')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Excerpt cannot exceed 500 characters'),
    
  body('status')
    .optional()
    .isIn(['draft', 'published', 'archived'])
    .withMessage('Status must be draft, published, or archived'),
    
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
    
  body('categories')
    .optional()
    .isArray()
    .withMessage('Categories must be an array'),
    
  body('seoTitle')
    .optional()
    .trim()
    .isLength({ max: 70 })
    .withMessage('SEO title cannot exceed 70 characters'),
    
  body('seoDescription')
    .optional()
    .trim()
    .isLength({ max: 160 })
    .withMessage('SEO description cannot exceed 160 characters')
];

export const validatePage = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ max: 200 })
    .withMessage('Title cannot exceed 200 characters'),
    
  body('slug')
    .trim()
    .notEmpty()
    .withMessage('Slug is required')
    .matches(/^[a-z0-9-]+$/)
    .withMessage('Slug can only contain lowercase letters, numbers, and hyphens'),
    
  body('content')
    .trim()
    .notEmpty()
    .withMessage('Content is required'),
    
  body('template')
    .optional()
    .isIn(['default', 'full-width', 'minimal', 'landing', 'contact', 'about'])
    .withMessage('Template must be default, full-width, minimal, landing, contact, or about'),
    
  body('status')
    .optional()
    .isIn(['draft', 'published', 'archived'])
    .withMessage('Status must be draft, published, or archived'),
    
  body('seoTitle')
    .optional()
    .trim()
    .isLength({ max: 70 })
    .withMessage('SEO title cannot exceed 70 characters'),
    
  body('seoDescription')
    .optional()
    .trim()
    .isLength({ max: 160 })
    .withMessage('SEO description cannot exceed 160 characters'),
    
  body('showInMenu')
    .optional()
    .isBoolean()
    .withMessage('showInMenu must be a boolean'),
    
  body('menuOrder')
    .optional()
    .isInt({ min: 0 })
    .withMessage('menuOrder must be a non-negative integer'),
    
  body('isHomePage')
    .optional()
    .isBoolean()
    .withMessage('isHomePage must be a boolean')
];

export const validateComment = [
  body('content')
    .trim()
    .notEmpty()
    .withMessage('Comment content is required')
    .isLength({ max: 1000 })
    .withMessage('Comment cannot exceed 1000 characters'),
    
  body('authorName')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Author name cannot exceed 100 characters'),
    
  body('authorEmail')
    .optional()
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
    
  body('authorWebsite')
    .optional()
    .trim()
    .isURL()
    .withMessage('Website must be a valid URL')
];

export const validateSettings = [
  // General Settings
  body('siteName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Site name must be between 1 and 100 characters'),
    
  body('siteDescription')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Site description cannot exceed 500 characters'),
    
  body('siteUrl')
    .optional()
    .trim()
    .isURL()
    .withMessage('Site URL must be a valid URL'),
    
  body('adminEmail')
    .optional()
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage('Admin email must be a valid email address'),
    
  body('timezone')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Timezone must be a valid timezone string'),
    
  body('language')
    .optional()
    .trim()
    .isLength({ min: 2, max: 10 })
    .withMessage('Language code must be between 2 and 10 characters'),
    
  body('siteLogo')
    .optional()
    .trim()
    .isURL()
    .withMessage('Site logo must be a valid URL'),
    
  // Content Settings
  body('postsPerPage')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Posts per page must be between 1 and 100'),
    
  body('defaultRole')
    .optional()
    .isIn(['viewer', 'editor', 'admin'])
    .withMessage('Default role must be viewer, editor, or admin'),
    
  // Email Settings
  body('smtpHost')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('SMTP host cannot exceed 100 characters'),
    
  body('smtpPort')
    .optional()
    .isInt({ min: 1, max: 65535 })
    .withMessage('SMTP port must be between 1 and 65535'),
    
  body('smtpUser')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('SMTP user cannot exceed 100 characters'),
    
  body('smtpPassword')
    .optional()
    .isLength({ max: 200 })
    .withMessage('SMTP password cannot exceed 200 characters'),
    
  body('fromEmail')
    .optional()
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage('From email must be a valid email address'),
    
  body('fromName')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('From name cannot exceed 100 characters'),
    
  // Security Settings
  body('sessionTimeout')
    .optional()
    .isInt({ min: 1, max: 168 })
    .withMessage('Session timeout must be between 1 and 168 hours'),
    
  body('maxLoginAttempts')
    .optional()
    .isInt({ min: 1, max: 20 })
    .withMessage('Max login attempts must be between 1 and 20'),
    
  // Analytics Settings
  body('trackingCode')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Tracking code cannot exceed 500 characters')
];