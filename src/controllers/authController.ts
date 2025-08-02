import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import crypto from 'crypto';
import { v2 as cloudinary } from 'cloudinary';
import User from '../models/User';
import { generateToken } from '../utils/jwt';
import { AuthRequest } from '../middleware/auth';
import emailService from '../utils/emailService';
import mongoose from 'mongoose';
import Media from '../models/Media';
import { logActivity } from './activityController';

export const register = async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { username, email, password, role } = req.body;

    // Restrict admin/editor/superadmin registration to public endpoint
    if (role && ['superadmin', 'admin', 'editor'].includes(role)) {
      return res.status(403).json({
        success: false,
        message: 'SuperAdmin, Admin and Editor accounts must be created by an administrator. Please contact your administrator for access.'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email or username'
      });
    }

    // Create user (force viewer role for public registration)
    const user = new User({
      username,
      email,
      password,
      role: 'viewer',
      status: 'active'
    });

    // Generate email verification token
    const verificationToken = user.generateEmailVerificationToken();
    await user.save();

    // Send verification email
    try {
      await emailService.sendVerificationEmail(user.email, user.username, verificationToken);
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      // Continue with registration even if email fails
    }

    res.status(201).json({
      success: true,
      message: 'User registered successfully. Please check your email to verify your account.',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during registration'
    });
  }
};

// Admin-only registration for creating editor/admin accounts
export const adminRegister = async (req: AuthRequest, res: Response) => {
  try {
    // Check if user has permission to create users
    if (!['admin', 'superadmin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Admin or SuperAdmin access required to create users'
      });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { username, email, password, role } = req.body;

    // Validate role based on strict hierarchy
    let allowedRoles: string[] = [];
    let errorMessage = '';
    
    if (req.user.role === 'superadmin') {
      // SuperAdmin can create any role
      allowedRoles = ['editor', 'admin', 'superadmin', 'viewer'];
      errorMessage = 'SuperAdmin can create: SuperAdmin, Admin, Editor, or Viewer';
    } else if (req.user.role === 'admin') {
      // Admin can only create Editor and Viewer, NOT other Admins
      allowedRoles = ['editor', 'viewer'];
      errorMessage = 'Admin can only create: Editor or Viewer accounts. Only SuperAdmin can create Admin accounts.';
    } else {
      // Editor and Viewer cannot create any users
      return res.status(403).json({
        success: false,
        message: 'Only SuperAdmin and Admin roles can create user accounts'
      });
    }
    
    if (!role || !allowedRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: errorMessage
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email or username'
      });
    }

    // Create user with specified role
    const user = new User({
      username,
      email,
      password,
      role,
      status: 'active', // Staff accounts are active by default
      emailVerified: true // Staff accounts don't need email verification
    });

    await user.save();

    // Generate token for immediate login
    const token = generateToken({
      userId: (user as any)._id.toString(),
      role: user.role,
      email: user.email
    });

    res.status(201).json({
      success: true,
      message: `${role.charAt(0).toUpperCase() + role.slice(1)} account created successfully`,
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        status: user.status,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt
      }
    });

  } catch (error) {
    console.error('Admin registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during admin registration'
    });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { login, password } = req.body; // login can be email or username

    // Find user by email or username
    const user = await User.findOne({
      $or: [
        { email: login.toLowerCase() },
        { username: login }
      ]
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    if (!user.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Account is inactive. Please contact administrator.'
      });
    }

    if (!user.emailVerified) {
      return res.status(400).json({
        success: false,
        message: 'Please verify your email address before logging in.',
        emailVerified: false
      });
    }

    if (user.status === 'pending') {
      return res.status(403).json({
        success: false,
        message: 'Your account is pending admin approval. Please wait for approval.'
      });
    }

    if (user.status === 'rejected') {
      return res.status(403).json({
        success: false,
        message: 'Your account has been rejected. Please contact administrator.'
      });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate token
    const token = generateToken({
      userId: (user as any)._id.toString(),
      role: user.role,
      email: user.email
    });

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        firstName: user.firstName,
        lastName: user.lastName,
        lastLogin: user.lastLogin
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
};

export const getMe = async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      user
    });

  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

export const updateProfile = async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { firstName, lastName, bio, avatar, website, location, phone } = req.body;
    
    // Clean up empty strings to null for optional fields
    const updateData = {
      firstName: firstName && firstName.trim() ? firstName : null,
      lastName: lastName && lastName.trim() ? lastName : null,
      bio: bio && bio.trim() ? bio : null,
      avatar: avatar && avatar.trim() ? avatar : null,
      website: website && website.trim() ? website : null,
      location: location && location.trim() ? location : null,
      phone: phone && phone.trim() ? phone : null
    };
    
    const user = await User.findByIdAndUpdate(
      req.user._id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating profile'
    });
  }
};

export const changePassword = async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { currentPassword, newPassword } = req.body;
    
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error changing password'
    });
  }
};

export const verifyEmail = async (req: Request, res: Response) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Verification token is required'
      });
    }

    // Hash the token to compare with stored hash
    const hashedToken = crypto.createHash('sha256').update(token as string).digest('hex');

    const user = await User.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification token'
      });
    }

    // Update user as verified
    user.emailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    // Send welcome email
    try {
      await emailService.sendWelcomeEmail({
        to: user.email,
        username: user.username,
        firstName: user.firstName || user.username,
        role: user.role,
        createdBy: 'System'
      });
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
    }

    res.json({
      success: true,
      message: 'Email verified successfully. You can now log in.'
    });

  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during email verification'
    });
  }
};

export const resendVerificationEmail = async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      // Don't reveal if user exists or not for security
      return res.json({
        success: true,
        message: 'If an account with that email exists and is unverified, a verification email has been sent.'
      });
    }

    if (user.emailVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email is already verified'
      });
    }

    // Check if user recently requested verification email (rate limiting)
    const lastVerificationTime = user.emailVerificationExpires ? 
      new Date(user.emailVerificationExpires.getTime() - 24 * 60 * 60 * 1000) : null;
    
    if (lastVerificationTime && Date.now() - lastVerificationTime.getTime() < 2 * 60 * 1000) {
      return res.status(429).json({
        success: false,
        message: 'Please wait at least 2 minutes before requesting another verification email.',
        retryAfter: 120 // seconds
      });
    }

    // Generate new verification token
    const verificationToken = user.generateEmailVerificationToken();
    await user.save();

    // Send verification email
    try {
      await emailService.sendVerificationEmail(user.email, user.username, verificationToken);
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      return res.status(500).json({
        success: false,
        message: 'Failed to send verification email. Please try again later.'
      });
    }

    res.json({
      success: true,
      message: 'Verification email sent successfully. Please check your inbox and spam folder.',
      emailSent: true
    });

  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error resending verification email'
    });
  }
};

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      // Don't reveal if user exists or not
      return res.json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent.'
      });
    }

    // Generate password reset token
    const resetToken = user.generatePasswordResetToken();
    await user.save();

    // Send password reset email
    try {
      await emailService.sendPasswordResetEmail(user.email, user.username, resetToken);
    } catch (emailError) {
      console.error('Failed to send password reset email:', emailError);
      return res.status(500).json({
        success: false,
        message: 'Failed to send password reset email'
      });
    }

    res.json({
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent.'
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error processing password reset request'
    });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { token, newPassword } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Reset token is required'
      });
    }

    // Hash the token to compare with stored hash
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }

    // Update password and clear reset token
    user.password = newPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    res.json({
      success: true,
      message: 'Password reset successfully. You can now log in with your new password.'
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during password reset'
    });
  }
};

// Admin approval endpoints
export const getPendingUsers = async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== 'admin' && req.user?.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }

    const pendingUsers = await User.find({ status: 'pending' })
      .select('-password -emailVerificationToken -passwordResetToken')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      users: pendingUsers
    });
  } catch (error) {
    console.error('Get pending users error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching pending users'
    });
  }
};

export const approveUser = async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== 'admin' && req.user?.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }

    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'User is not in pending status'
      });
    }

    user.status = 'active';
    user.approvedBy = new mongoose.Types.ObjectId(req.user._id);
    user.approvedAt = new Date();
    await user.save();

    // Send approval email
    try {
      await emailService.sendEmail({
        to: user.email,
        subject: 'Account Approved - Welcome to CMS System',
        text: `Hello ${user.username},\n\nYour admin account has been approved! You can now log in to the CMS system.\n\nBest regards,\nCMS System Team`,
        html: `<p>Hello ${user.username},</p><p>Your admin account has been approved! You can now log in to the CMS system.</p><p>Best regards,<br>CMS System Team</p>`
      });
    } catch (emailError) {
      console.error('Failed to send approval email:', emailError);
    }

    res.json({
      success: true,
      message: 'User approved successfully',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        status: user.status
      }
    });
  } catch (error) {
    console.error('Approve user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error approving user'
    });
  }
};

export const rejectUser = async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== 'admin' && req.user?.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }

    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'User is not in pending status'
      });
    }

    user.status = 'rejected';
    user.approvedBy = new mongoose.Types.ObjectId(req.user._id);
    user.approvedAt = new Date();
    await user.save();

    // Send rejection email
    try {
      await emailService.sendEmail({
        to: user.email,
        subject: 'Account Application - CMS System',
        text: `Hello ${user.username},\n\nWe regret to inform you that your admin account application has not been approved at this time.\n\nIf you have any questions, please contact the administrator.\n\nBest regards,\nCMS System Team`,
        html: `<p>Hello ${user.username},</p><p>We regret to inform you that your admin account application has not been approved at this time.</p><p>If you have any questions, please contact the administrator.</p><p>Best regards,<br>CMS System Team</p>`
      });
    } catch (emailError) {
      console.error('Failed to send rejection email:', emailError);
    }

    res.json({
      success: true,
      message: 'User rejected successfully'
    });
  } catch (error) {
    console.error('Reject user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error rejecting user'
    });
  }
};

export const getAllUsers = async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== 'admin' && req.user?.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }

    const { status, role, page = 1, limit = 10 } = req.query;
    const filter: any = {};

    if (status) filter.status = status;
    if (role) filter.role = role;

    const users = await User.find(filter)
      .select('-password -emailVerificationToken -passwordResetToken')
      .populate('approvedBy', 'username email')
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    const total = await User.countDocuments(filter);

    res.json({
      success: true,
      users,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching users'
    });
  }
};

// Superadmin-only user management functions

// Get user by ID
export const getUserById = async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. SuperAdmin privileges required.'
      });
    }

    const { userId } = req.params;
    const user = await User.findById(userId)
      .select('-password -emailVerificationToken -passwordResetToken')
      .populate('approvedBy', 'username email');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      user
    });
  } catch (error) {
    console.error('Get user by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching user'
    });
  }
};

// Create new user (SuperAdmin and Admin)
export const createUser = async (req: AuthRequest, res: Response) => {
  try {
    // Role-based permissions check
    const currentUserRole = req.user?.role;
    const { role: newUserRole } = req.body;

    // SuperAdmin can create any role
    // Admin can only create editor and viewer roles
    if (currentUserRole === 'superadmin') {
      // SuperAdmin can create any role
    } else if (currentUserRole === 'admin') {
      if (!['editor', 'viewer'].includes(newUserRole)) {
        return res.status(403).json({
          success: false,
          message: 'Admins can only create Editor and Viewer accounts.'
        });
      }
    } else {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin or SuperAdmin privileges required.'
      });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { username, email, password, role, firstName, lastName, bio, isActive = true } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { username }]
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: existingUser.email === email.toLowerCase() ? 
          'Email already registered' : 'Username already taken'
      });
    }

    // Determine if user needs approval based on role hierarchy
    let needsApproval = false;
    let approvalStatus = 'active';
    let emailVerified = false;

    if (currentUserRole === 'superadmin') {
      if (newUserRole === 'admin') {
        // Admin creation by SuperAdmin needs approval
        needsApproval = true;
        approvalStatus = 'pending';
        emailVerified = false;
      } else if (newUserRole === 'editor') {
        // Editor creation by SuperAdmin requires email verification
        approvalStatus = 'active';
        emailVerified = false;
      } else {
        // Viewer creation by SuperAdmin is auto-approved and no email verification needed
        approvalStatus = 'active';
        emailVerified = true;
      }
    } else if (currentUserRole === 'admin') {
      if (newUserRole === 'editor') {
        // Editor creation by Admin needs SuperAdmin approval
        needsApproval = true;
        approvalStatus = 'pending';
        emailVerified = false;
      } else {
        // Viewer creation by Admin is auto-approved and no email verification needed
        approvalStatus = 'active';
        emailVerified = true;
      }
    }

    // Create new user
    const userData = {
      username,
      email: email.toLowerCase(),
      password,
      role: role || 'viewer',
      firstName,
      lastName,
      bio,
      isActive: needsApproval ? false : isActive,
      emailVerified,
      status: approvalStatus,
      createdBy: req.user._id,
      ...(needsApproval ? {} : {
        approvedBy: req.user._id,
        approvedAt: new Date()
      })
    };

    const user = new User(userData);
    await user.save();

    // Send appropriate email based on approval status and email verification requirement
    try {
      // Generate email verification token for users who need email verification
      let emailToken = null;
      if (!emailVerified) {
        emailToken = user.generateEmailVerificationToken();
        await user.save();
      }

      if (needsApproval) {
        // Send email to new user about account creation and pending approval
        await emailService.sendAccountCreatedEmail({
          to: user.email,
          username: user.username,
          firstName: user.firstName || user.username,
          role: user.role,
          createdBy: `${req.user.firstName || req.user.username}`,
          verificationToken: emailToken || undefined,
          needsApproval: true,
          approvalRequired: currentUserRole === 'admin' ? 'SuperAdmin' : 'Admin'
        });

        // Send notification to approvers
        if (currentUserRole === 'admin' && newUserRole === 'editor') {
          // Notify SuperAdmins about editor approval needed
          const superAdmins = await User.find({ role: 'superadmin', isActive: true });
          for (const superAdmin of superAdmins) {
            await emailService.sendApprovalNotificationEmail({
              to: superAdmin.email,
              approverName: superAdmin.firstName || superAdmin.username,
              newUserName: `${user.firstName || user.username}`,
              newUserEmail: user.email,
              newUserRole: user.role,
              createdByName: `${req.user.firstName || req.user.username}`,
              createdByRole: req.user.role
            });
          }
        } else if (currentUserRole === 'superadmin' && newUserRole === 'admin') {
          // For admin creation, send confirmation email (self-approval by SuperAdmin)
          await emailService.sendApprovalNotificationEmail({
            to: req.user.email,
            approverName: req.user.firstName || req.user.username,
            newUserName: `${user.firstName || user.username}`,
            newUserEmail: user.email,
            newUserRole: user.role,
            createdByName: `${req.user.firstName || req.user.username}`,
            createdByRole: req.user.role,
            selfApproval: true
          });
        }
      } else if (!emailVerified) {
        // Send verification email for users who are approved but need email verification (like Editor by SuperAdmin)
        await emailService.sendVerificationEmail(user.email, user.username, emailToken!);
      } else {
        // Send welcome email for auto-approved users who don't need email verification (Viewers)
        await emailService.sendWelcomeEmail({
          to: user.email,
          username: user.username,
          firstName: user.firstName || user.username,
          role: user.role,
          createdBy: `${req.user.firstName || req.user.username}`,
          temporaryPassword: password
        });
      }
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
      // Don't fail the user creation if email fails
    }

    // Log activity
    await logActivity({
      type: 'user',
      action: 'create_user',
      entityId: (user._id as any).toString(),
      entityTitle: `${user.username} (${user.email})`,
      userId: req.user._id.toString(),
      userDetails: {
        username: req.user.username,
        firstName: req.user.firstName,
        lastName: req.user.lastName
      },
      metadata: { 
        targetUserId: user._id, 
        role: user.role, 
        needsApproval, 
        approvalStatus 
      }
    });

    // Remove sensitive data from response
    const userResponse = await User.findById(user._id)
      .select('-password -emailVerificationToken -passwordResetToken')
      .populate('approvedBy', 'username email');

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: userResponse
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error creating user'
    });
  }
};

// Update user (SuperAdmin only)
export const updateUser = async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. SuperAdmin privileges required.'
      });
    }

    const { userId } = req.params;
    const updates = req.body;

    // Don't allow password updates through this endpoint
    delete updates.password;
    delete updates.emailVerificationToken;
    delete updates.passwordResetToken;

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if email/username conflicts with other users
    if (updates.email || updates.username) {
      const conflict = await User.findOne({
        _id: { $ne: userId },
        $or: [
          ...(updates.email ? [{ email: updates.email.toLowerCase() }] : []),
          ...(updates.username ? [{ username: updates.username }] : [])
        ]
      });

      if (conflict) {
        return res.status(400).json({
          success: false,
          message: conflict.email === updates.email?.toLowerCase() ? 
            'Email already in use' : 'Username already taken'
        });
      }
    }

    // Update user
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { ...updates, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).select('-password -emailVerificationToken -passwordResetToken')
     .populate('approvedBy', 'username email');

    // Log activity
    await logActivity({
      type: 'user',
      action: 'update_user',
      entityId: userId,
      entityTitle: `${updatedUser?.username} (${updatedUser?.email})`,
      userId: req.user._id.toString(),
      userDetails: {
        username: req.user.username,
        firstName: req.user.firstName,
        lastName: req.user.lastName
      },
      metadata: { targetUserId: userId, updates: Object.keys(updates) }
    });

    res.json({
      success: true,
      message: 'User updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating user'
    });
  }
};

// Delete user (SuperAdmin only)
export const deleteUser = async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. SuperAdmin privileges required.'
      });
    }

    const { userId } = req.params;

    // Prevent deleting self
    if (userId === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete your own account'
      });
    }

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Delete user
    await User.findByIdAndDelete(userId);

    // Log activity
    await logActivity({
      type: 'user',
      action: 'delete_user',
      entityId: userId,
      entityTitle: `${user.username} (${user.email})`,
      userId: req.user._id.toString(),
      userDetails: {
        username: req.user.username,
        firstName: req.user.firstName,
        lastName: req.user.lastName
      },
      metadata: { targetUserId: userId, deletedUserRole: user.role }
    });

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting user'
    });
  }
};

// Activate user account (SuperAdmin only)
export const activateUser = async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. SuperAdmin privileges required.'
      });
    }

    const { userId } = req.params;

    const user = await User.findByIdAndUpdate(
      userId,
      { 
        isActive: true, 
        status: 'active',
        updatedAt: new Date()
      },
      { new: true }
    ).select('-password -emailVerificationToken -passwordResetToken')
     .populate('approvedBy', 'username email');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Log activity
    await logActivity({
      type: 'user',
      action: 'activate_user',
      entityId: userId,
      entityTitle: `${user.username} (${user.email})`,
      userId: req.user._id.toString(),
      userDetails: {
        username: req.user.username,
        firstName: req.user.firstName,
        lastName: req.user.lastName
      },
      metadata: { targetUserId: userId }
    });

    res.json({
      success: true,
      message: 'User account activated successfully',
      user
    });
  } catch (error) {
    console.error('Activate user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error activating user'
    });
  }
};

// Deactivate user account (SuperAdmin only)
export const deactivateUser = async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. SuperAdmin privileges required.'
      });
    }

    const { userId } = req.params;

    // Prevent deactivating self
    if (userId === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot deactivate your own account'
      });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { 
        isActive: false, 
        status: 'pending',
        updatedAt: new Date()
      },
      { new: true }
    ).select('-password -emailVerificationToken -passwordResetToken')
     .populate('approvedBy', 'username email');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Log activity
    await logActivity({
      type: 'user',
      action: 'deactivate_user',
      entityId: userId,
      entityTitle: `${user.username} (${user.email})`,
      userId: req.user._id.toString(),
      userDetails: {
        username: req.user.username,
        firstName: req.user.firstName,
        lastName: req.user.lastName
      },
      metadata: { targetUserId: userId }
    });

    res.json({
      success: true,
      message: 'User account deactivated successfully',
      user
    });
  } catch (error) {
    console.error('Deactivate user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error deactivating user'
    });
  }
};

// Reset user password (SuperAdmin only)
export const resetUserPassword = async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. SuperAdmin privileges required.'
      });
    }

    const { userId } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    // Log activity
    await logActivity({
      type: 'user',
      action: 'reset_user_password',
      entityId: userId,
      entityTitle: `${user.username} (${user.email})`,
      userId: req.user._id.toString(),
      userDetails: {
        username: req.user.username,
        firstName: req.user.firstName,
        lastName: req.user.lastName
      },
      metadata: { targetUserId: userId }
    });

    res.json({
      success: true,
      message: 'User password reset successfully'
    });
  } catch (error) {
    console.error('Reset user password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error resetting password'
    });
  }
};

// Get user statistics (SuperAdmin only)
export const getUserStats = async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. SuperAdmin privileges required.'
      });
    }

    const [
      totalUsers,
      activeUsers,
      inactiveUsers,
      pendingUsers,
      adminUsers,
      editorUsers,
      viewerUsers,
      superadminUsers,
      recentUsers
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isActive: true }),
      User.countDocuments({ isActive: false }),
      User.countDocuments({ status: 'pending' }),
      User.countDocuments({ role: 'admin' }),
      User.countDocuments({ role: 'editor' }),
      User.countDocuments({ role: 'viewer' }),
      User.countDocuments({ role: 'superadmin' }),
      User.countDocuments({ 
        createdAt: { 
          $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) 
        } 
      })
    ]);

    res.json({
      success: true,
      stats: {
        total: totalUsers,
        active: activeUsers,
        inactive: inactiveUsers,
        pending: pendingUsers,
        recent: recentUsers,
        byRole: {
          superadmin: superadminUsers,
          admin: adminUsers,
          editor: editorUsers,
          viewer: viewerUsers
        }
      }
    });
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching user statistics'
    });
  }
};

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const uploadAvatar = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    // Validate file type for avatars (only images)
    if (!req.file.mimetype.startsWith('image/')) {
      return res.status(400).json({
        success: false,
        message: 'Please upload an image file'
      });
    }

    // Validate file size (max 2MB for avatars)
    if (req.file.size > 2 * 1024 * 1024) {
      return res.status(400).json({
        success: false,
        message: 'Avatar image must be under 2MB'
      });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Upload to Cloudinary
    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'avatars',
          resource_type: 'image',
          quality: 'auto',
          fetch_format: 'auto',
          transformation: [
            { width: 200, height: 200, crop: 'fill' }, // Square crop for avatars
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

    // Create media record for the uploaded avatar
    const media = new Media({
      fileName: result.public_id,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      url: result.secure_url,
      cloudinaryId: result.public_id,
      alt: `${user.username} avatar`,
      folder: 'avatars',
      uploadedBy: req.user._id
    });

    await media.save();

    // Update user's avatar
    user.avatar = media.url;
    await user.save();

    res.json({
      success: true,
      message: 'Avatar uploaded successfully',
      media: {
        _id: media._id,
        url: media.url,
        fileName: media.fileName,
        originalName: media.originalName,
        size: media.size,
        mimeType: media.mimeType
      },
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        firstName: user.firstName,
        lastName: user.lastName
      }
    });

  } catch (error) {
    console.error('Avatar upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error uploading avatar'
    });
  }
};