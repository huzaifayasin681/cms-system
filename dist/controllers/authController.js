"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadAvatar = exports.getUserStats = exports.resetUserPassword = exports.deactivateUser = exports.activateUser = exports.deleteUser = exports.updateUser = exports.createUser = exports.getUserById = exports.getAllUsers = exports.rejectUser = exports.approveUser = exports.getPendingUsers = exports.resetPassword = exports.forgotPassword = exports.resendVerificationEmail = exports.verifyEmail = exports.changePassword = exports.updateProfile = exports.getMe = exports.login = exports.adminRegister = exports.register = void 0;
const express_validator_1 = require("express-validator");
const crypto_1 = __importDefault(require("crypto"));
const cloudinary_1 = require("cloudinary");
const User_1 = __importDefault(require("../models/User"));
const jwt_1 = require("../utils/jwt");
const emailService_1 = __importDefault(require("../utils/emailService"));
const mongoose_1 = __importDefault(require("mongoose"));
const Media_1 = __importDefault(require("../models/Media"));
const activityController_1 = require("./activityController");
const register = async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation errors',
                errors: errors.array()
            });
        }
        const { username, email, password, role } = req.body;
        if (role && ['superadmin', 'admin', 'editor'].includes(role)) {
            return res.status(403).json({
                success: false,
                message: 'SuperAdmin, Admin and Editor accounts must be created by an administrator. Please contact your administrator for access.'
            });
        }
        const existingUser = await User_1.default.findOne({
            $or: [{ email }, { username }]
        });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'User already exists with this email or username'
            });
        }
        const user = new User_1.default({
            username,
            email,
            password,
            role: 'viewer',
            status: 'active'
        });
        const verificationToken = user.generateEmailVerificationToken();
        await user.save();
        try {
            await emailService_1.default.sendVerificationEmail(user.email, user.username, verificationToken);
        }
        catch (emailError) {
            console.error('Failed to send verification email:', emailError);
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
    }
    catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during registration'
        });
    }
};
exports.register = register;
const adminRegister = async (req, res) => {
    try {
        if (!['admin', 'superadmin'].includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'Admin or SuperAdmin access required to create users'
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
        const { username, email, password, role } = req.body;
        let allowedRoles = [];
        let errorMessage = '';
        if (req.user.role === 'superadmin') {
            allowedRoles = ['editor', 'admin', 'superadmin', 'viewer'];
            errorMessage = 'SuperAdmin can create: SuperAdmin, Admin, Editor, or Viewer';
        }
        else if (req.user.role === 'admin') {
            allowedRoles = ['editor', 'viewer'];
            errorMessage = 'Admin can only create: Editor or Viewer accounts. Only SuperAdmin can create Admin accounts.';
        }
        else {
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
        const existingUser = await User_1.default.findOne({
            $or: [{ email }, { username }]
        });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'User already exists with this email or username'
            });
        }
        const user = new User_1.default({
            username,
            email,
            password,
            role,
            status: 'active',
            emailVerified: true
        });
        await user.save();
        const token = (0, jwt_1.generateToken)({
            userId: user._id.toString(),
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
    }
    catch (error) {
        console.error('Admin registration error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during admin registration'
        });
    }
};
exports.adminRegister = adminRegister;
const login = async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation errors',
                errors: errors.array()
            });
        }
        const { login, password } = req.body;
        const user = await User_1.default.findOne({
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
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(400).json({
                success: false,
                message: 'Invalid credentials'
            });
        }
        user.lastLogin = new Date();
        await user.save();
        const token = (0, jwt_1.generateToken)({
            userId: user._id.toString(),
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
    }
    catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during login'
        });
    }
};
exports.login = login;
const getMe = async (req, res) => {
    try {
        const user = await User_1.default.findById(req.user._id).select('-password');
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
    }
    catch (error) {
        console.error('Get me error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};
exports.getMe = getMe;
const updateProfile = async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation errors',
                errors: errors.array()
            });
        }
        const { firstName, lastName, bio, avatar, website, location, phone } = req.body;
        const updateData = {
            firstName: firstName && firstName.trim() ? firstName : null,
            lastName: lastName && lastName.trim() ? lastName : null,
            bio: bio && bio.trim() ? bio : null,
            avatar: avatar && avatar.trim() ? avatar : null,
            website: website && website.trim() ? website : null,
            location: location && location.trim() ? location : null,
            phone: phone && phone.trim() ? phone : null
        };
        const user = await User_1.default.findByIdAndUpdate(req.user._id, updateData, { new: true, runValidators: true }).select('-password');
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
    }
    catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error updating profile'
        });
    }
};
exports.updateProfile = updateProfile;
const changePassword = async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation errors',
                errors: errors.array()
            });
        }
        const { currentPassword, newPassword } = req.body;
        const user = await User_1.default.findById(req.user._id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        const isMatch = await user.comparePassword(currentPassword);
        if (!isMatch) {
            return res.status(400).json({
                success: false,
                message: 'Current password is incorrect'
            });
        }
        user.password = newPassword;
        await user.save();
        res.json({
            success: true,
            message: 'Password changed successfully'
        });
    }
    catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error changing password'
        });
    }
};
exports.changePassword = changePassword;
const verifyEmail = async (req, res) => {
    try {
        const { token } = req.query;
        if (!token) {
            return res.status(400).json({
                success: false,
                message: 'Verification token is required'
            });
        }
        const hashedToken = crypto_1.default.createHash('sha256').update(token).digest('hex');
        const user = await User_1.default.findOne({
            emailVerificationToken: hashedToken,
            emailVerificationExpires: { $gt: Date.now() }
        });
        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired verification token'
            });
        }
        user.emailVerified = true;
        user.emailVerificationToken = undefined;
        user.emailVerificationExpires = undefined;
        await user.save();
        try {
            await emailService_1.default.sendWelcomeEmail({
                to: user.email,
                username: user.username,
                firstName: user.firstName || user.username,
                role: user.role,
                createdBy: 'System'
            });
        }
        catch (emailError) {
            console.error('Failed to send welcome email:', emailError);
        }
        res.json({
            success: true,
            message: 'Email verified successfully. You can now log in.'
        });
    }
    catch (error) {
        console.error('Email verification error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during email verification'
        });
    }
};
exports.verifyEmail = verifyEmail;
const resendVerificationEmail = async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation errors',
                errors: errors.array()
            });
        }
        const { email } = req.body;
        const user = await User_1.default.findOne({ email });
        if (!user) {
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
        const lastVerificationTime = user.emailVerificationExpires ?
            new Date(user.emailVerificationExpires.getTime() - 24 * 60 * 60 * 1000) : null;
        if (lastVerificationTime && Date.now() - lastVerificationTime.getTime() < 2 * 60 * 1000) {
            return res.status(429).json({
                success: false,
                message: 'Please wait at least 2 minutes before requesting another verification email.',
                retryAfter: 120
            });
        }
        const verificationToken = user.generateEmailVerificationToken();
        await user.save();
        try {
            await emailService_1.default.sendVerificationEmail(user.email, user.username, verificationToken);
        }
        catch (emailError) {
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
    }
    catch (error) {
        console.error('Resend verification error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error resending verification email'
        });
    }
};
exports.resendVerificationEmail = resendVerificationEmail;
const forgotPassword = async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation errors',
                errors: errors.array()
            });
        }
        const { email } = req.body;
        const user = await User_1.default.findOne({ email });
        if (!user) {
            return res.json({
                success: true,
                message: 'If an account with that email exists, a password reset link has been sent.'
            });
        }
        const resetToken = user.generatePasswordResetToken();
        await user.save();
        try {
            await emailService_1.default.sendPasswordResetEmail(user.email, user.username, resetToken);
        }
        catch (emailError) {
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
    }
    catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error processing password reset request'
        });
    }
};
exports.forgotPassword = forgotPassword;
const resetPassword = async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
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
        const hashedToken = crypto_1.default.createHash('sha256').update(token).digest('hex');
        const user = await User_1.default.findOne({
            passwordResetToken: hashedToken,
            passwordResetExpires: { $gt: Date.now() }
        });
        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired reset token'
            });
        }
        user.password = newPassword;
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save();
        res.json({
            success: true,
            message: 'Password reset successfully. You can now log in with your new password.'
        });
    }
    catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during password reset'
        });
    }
};
exports.resetPassword = resetPassword;
const getPendingUsers = async (req, res) => {
    try {
        if (req.user?.role !== 'admin' && req.user?.role !== 'superadmin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Admin privileges required.'
            });
        }
        const pendingUsers = await User_1.default.find({ status: 'pending' })
            .select('-password -emailVerificationToken -passwordResetToken')
            .sort({ createdAt: -1 });
        res.json({
            success: true,
            users: pendingUsers
        });
    }
    catch (error) {
        console.error('Get pending users error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching pending users'
        });
    }
};
exports.getPendingUsers = getPendingUsers;
const approveUser = async (req, res) => {
    try {
        if (req.user?.role !== 'admin' && req.user?.role !== 'superadmin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Admin privileges required.'
            });
        }
        const { userId } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid user ID'
            });
        }
        const user = await User_1.default.findById(userId);
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
        user.approvedBy = new mongoose_1.default.Types.ObjectId(req.user._id);
        user.approvedAt = new Date();
        await user.save();
        try {
            await emailService_1.default.sendEmail({
                to: user.email,
                subject: 'Account Approved - Welcome to CMS System',
                text: `Hello ${user.username},\n\nYour admin account has been approved! You can now log in to the CMS system.\n\nBest regards,\nCMS System Team`,
                html: `<p>Hello ${user.username},</p><p>Your admin account has been approved! You can now log in to the CMS system.</p><p>Best regards,<br>CMS System Team</p>`
            });
        }
        catch (emailError) {
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
    }
    catch (error) {
        console.error('Approve user error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error approving user'
        });
    }
};
exports.approveUser = approveUser;
const rejectUser = async (req, res) => {
    try {
        if (req.user?.role !== 'admin' && req.user?.role !== 'superadmin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Admin privileges required.'
            });
        }
        const { userId } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid user ID'
            });
        }
        const user = await User_1.default.findById(userId);
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
        user.approvedBy = new mongoose_1.default.Types.ObjectId(req.user._id);
        user.approvedAt = new Date();
        await user.save();
        try {
            await emailService_1.default.sendEmail({
                to: user.email,
                subject: 'Account Application - CMS System',
                text: `Hello ${user.username},\n\nWe regret to inform you that your admin account application has not been approved at this time.\n\nIf you have any questions, please contact the administrator.\n\nBest regards,\nCMS System Team`,
                html: `<p>Hello ${user.username},</p><p>We regret to inform you that your admin account application has not been approved at this time.</p><p>If you have any questions, please contact the administrator.</p><p>Best regards,<br>CMS System Team</p>`
            });
        }
        catch (emailError) {
            console.error('Failed to send rejection email:', emailError);
        }
        res.json({
            success: true,
            message: 'User rejected successfully'
        });
    }
    catch (error) {
        console.error('Reject user error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error rejecting user'
        });
    }
};
exports.rejectUser = rejectUser;
const getAllUsers = async (req, res) => {
    try {
        if (req.user?.role !== 'admin' && req.user?.role !== 'superadmin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Admin privileges required.'
            });
        }
        const { status, role, page = 1, limit = 10 } = req.query;
        const filter = {};
        if (status)
            filter.status = status;
        if (role)
            filter.role = role;
        const users = await User_1.default.find(filter)
            .select('-password -emailVerificationToken -passwordResetToken')
            .populate('approvedBy', 'username email')
            .sort({ createdAt: -1 })
            .limit(Number(limit))
            .skip((Number(page) - 1) * Number(limit));
        const total = await User_1.default.countDocuments(filter);
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
    }
    catch (error) {
        console.error('Get all users error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching users'
        });
    }
};
exports.getAllUsers = getAllUsers;
const getUserById = async (req, res) => {
    try {
        if (req.user?.role !== 'superadmin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. SuperAdmin privileges required.'
            });
        }
        const { userId } = req.params;
        const user = await User_1.default.findById(userId)
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
    }
    catch (error) {
        console.error('Get user by ID error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching user'
        });
    }
};
exports.getUserById = getUserById;
const createUser = async (req, res) => {
    try {
        const currentUserRole = req.user?.role;
        const { role: newUserRole } = req.body;
        if (currentUserRole === 'superadmin') {
        }
        else if (currentUserRole === 'admin') {
            if (!['editor', 'viewer'].includes(newUserRole)) {
                return res.status(403).json({
                    success: false,
                    message: 'Admins can only create Editor and Viewer accounts.'
                });
            }
        }
        else {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Admin or SuperAdmin privileges required.'
            });
        }
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }
        const { username, email, password, role, firstName, lastName, bio, isActive = true } = req.body;
        const existingUser = await User_1.default.findOne({
            $or: [{ email: email.toLowerCase() }, { username }]
        });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: existingUser.email === email.toLowerCase() ?
                    'Email already registered' : 'Username already taken'
            });
        }
        let needsApproval = false;
        let approvalStatus = 'active';
        let emailVerified = false;
        if (currentUserRole === 'superadmin') {
            if (newUserRole === 'admin') {
                needsApproval = true;
                approvalStatus = 'pending';
                emailVerified = false;
            }
            else if (newUserRole === 'editor') {
                approvalStatus = 'active';
                emailVerified = false;
            }
            else {
                approvalStatus = 'active';
                emailVerified = true;
            }
        }
        else if (currentUserRole === 'admin') {
            if (newUserRole === 'editor') {
                needsApproval = true;
                approvalStatus = 'pending';
                emailVerified = false;
            }
            else {
                approvalStatus = 'active';
                emailVerified = true;
            }
        }
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
        const user = new User_1.default(userData);
        await user.save();
        try {
            let emailToken = null;
            if (!emailVerified) {
                emailToken = user.generateEmailVerificationToken();
                await user.save();
            }
            if (needsApproval) {
                await emailService_1.default.sendAccountCreatedEmail({
                    to: user.email,
                    username: user.username,
                    firstName: user.firstName || user.username,
                    role: user.role,
                    createdBy: `${req.user.firstName || req.user.username}`,
                    verificationToken: emailToken || undefined,
                    needsApproval: true,
                    approvalRequired: currentUserRole === 'admin' ? 'SuperAdmin' : 'Admin'
                });
                if (currentUserRole === 'admin' && newUserRole === 'editor') {
                    const superAdmins = await User_1.default.find({ role: 'superadmin', isActive: true });
                    for (const superAdmin of superAdmins) {
                        await emailService_1.default.sendApprovalNotificationEmail({
                            to: superAdmin.email,
                            approverName: superAdmin.firstName || superAdmin.username,
                            newUserName: `${user.firstName || user.username}`,
                            newUserEmail: user.email,
                            newUserRole: user.role,
                            createdByName: `${req.user.firstName || req.user.username}`,
                            createdByRole: req.user.role
                        });
                    }
                }
                else if (currentUserRole === 'superadmin' && newUserRole === 'admin') {
                    await emailService_1.default.sendApprovalNotificationEmail({
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
            }
            else if (!emailVerified) {
                await emailService_1.default.sendVerificationEmail(user.email, user.username, emailToken);
            }
            else {
                await emailService_1.default.sendWelcomeEmail({
                    to: user.email,
                    username: user.username,
                    firstName: user.firstName || user.username,
                    role: user.role,
                    createdBy: `${req.user.firstName || req.user.username}`,
                    temporaryPassword: password
                });
            }
        }
        catch (emailError) {
            console.error('Email sending failed:', emailError);
        }
        await (0, activityController_1.logActivity)({
            type: 'user',
            action: 'create_user',
            entityId: user._id.toString(),
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
        const userResponse = await User_1.default.findById(user._id)
            .select('-password -emailVerificationToken -passwordResetToken')
            .populate('approvedBy', 'username email');
        res.status(201).json({
            success: true,
            message: 'User created successfully',
            user: userResponse
        });
    }
    catch (error) {
        console.error('Create user error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error creating user'
        });
    }
};
exports.createUser = createUser;
const updateUser = async (req, res) => {
    try {
        if (req.user?.role !== 'superadmin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. SuperAdmin privileges required.'
            });
        }
        const { userId } = req.params;
        const updates = req.body;
        delete updates.password;
        delete updates.emailVerificationToken;
        delete updates.passwordResetToken;
        const user = await User_1.default.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        if (updates.email || updates.username) {
            const conflict = await User_1.default.findOne({
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
        const updatedUser = await User_1.default.findByIdAndUpdate(userId, { ...updates, updatedAt: new Date() }, { new: true, runValidators: true }).select('-password -emailVerificationToken -passwordResetToken')
            .populate('approvedBy', 'username email');
        await (0, activityController_1.logActivity)({
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
    }
    catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error updating user'
        });
    }
};
exports.updateUser = updateUser;
const deleteUser = async (req, res) => {
    try {
        if (req.user?.role !== 'superadmin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. SuperAdmin privileges required.'
            });
        }
        const { userId } = req.params;
        if (userId === req.user._id.toString()) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete your own account'
            });
        }
        const user = await User_1.default.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        await User_1.default.findByIdAndDelete(userId);
        await (0, activityController_1.logActivity)({
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
    }
    catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error deleting user'
        });
    }
};
exports.deleteUser = deleteUser;
const activateUser = async (req, res) => {
    try {
        if (req.user?.role !== 'superadmin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. SuperAdmin privileges required.'
            });
        }
        const { userId } = req.params;
        const user = await User_1.default.findByIdAndUpdate(userId, {
            isActive: true,
            status: 'active',
            updatedAt: new Date()
        }, { new: true }).select('-password -emailVerificationToken -passwordResetToken')
            .populate('approvedBy', 'username email');
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        await (0, activityController_1.logActivity)({
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
    }
    catch (error) {
        console.error('Activate user error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error activating user'
        });
    }
};
exports.activateUser = activateUser;
const deactivateUser = async (req, res) => {
    try {
        if (req.user?.role !== 'superadmin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. SuperAdmin privileges required.'
            });
        }
        const { userId } = req.params;
        if (userId === req.user._id.toString()) {
            return res.status(400).json({
                success: false,
                message: 'Cannot deactivate your own account'
            });
        }
        const user = await User_1.default.findByIdAndUpdate(userId, {
            isActive: false,
            status: 'pending',
            updatedAt: new Date()
        }, { new: true }).select('-password -emailVerificationToken -passwordResetToken')
            .populate('approvedBy', 'username email');
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        await (0, activityController_1.logActivity)({
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
    }
    catch (error) {
        console.error('Deactivate user error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error deactivating user'
        });
    }
};
exports.deactivateUser = deactivateUser;
const resetUserPassword = async (req, res) => {
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
        const user = await User_1.default.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        user.password = newPassword;
        await user.save();
        await (0, activityController_1.logActivity)({
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
    }
    catch (error) {
        console.error('Reset user password error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error resetting password'
        });
    }
};
exports.resetUserPassword = resetUserPassword;
const getUserStats = async (req, res) => {
    try {
        if (req.user?.role !== 'superadmin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. SuperAdmin privileges required.'
            });
        }
        const [totalUsers, activeUsers, inactiveUsers, pendingUsers, adminUsers, editorUsers, viewerUsers, superadminUsers, recentUsers] = await Promise.all([
            User_1.default.countDocuments(),
            User_1.default.countDocuments({ isActive: true }),
            User_1.default.countDocuments({ isActive: false }),
            User_1.default.countDocuments({ status: 'pending' }),
            User_1.default.countDocuments({ role: 'admin' }),
            User_1.default.countDocuments({ role: 'editor' }),
            User_1.default.countDocuments({ role: 'viewer' }),
            User_1.default.countDocuments({ role: 'superadmin' }),
            User_1.default.countDocuments({
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
    }
    catch (error) {
        console.error('Get user stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching user statistics'
        });
    }
};
exports.getUserStats = getUserStats;
cloudinary_1.v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});
const uploadAvatar = async (req, res) => {
    try {
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
        if (req.file.size > 2 * 1024 * 1024) {
            return res.status(400).json({
                success: false,
                message: 'Avatar image must be under 2MB'
            });
        }
        const user = await User_1.default.findById(req.user._id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        const result = await new Promise((resolve, reject) => {
            const uploadStream = cloudinary_1.v2.uploader.upload_stream({
                folder: 'avatars',
                resource_type: 'image',
                quality: 'auto',
                fetch_format: 'auto',
                transformation: [
                    { width: 200, height: 200, crop: 'fill' },
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
            alt: `${user.username} avatar`,
            folder: 'avatars',
            uploadedBy: req.user._id
        });
        await media.save();
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
    }
    catch (error) {
        console.error('Avatar upload error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error uploading avatar'
        });
    }
};
exports.uploadAvatar = uploadAvatar;
