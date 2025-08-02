import { Router } from 'express';
import { 
  register, 
  adminRegister,
  login, 
  getMe, 
  updateProfile, 
  changePassword,
  verifyEmail,
  resendVerificationEmail,
  forgotPassword,
  resetPassword,
  getPendingUsers,
  approveUser,
  rejectUser,
  getAllUsers,
  uploadAvatar,
  // SuperAdmin user management functions
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  activateUser,
  deactivateUser,
  resetUserPassword,
  getUserStats
} from '../controllers/authController';
import { authenticate } from '../middleware/auth';
import { authLimiter, resendVerificationLimiter } from '../middleware/rateLimiter';
import { uploadSingle } from '../middleware/upload';
import {
  validateRegister,
  validateLogin,
  validateUpdateProfile,
  validateChangePassword,
  validateEmail,
  validateResetPassword
} from '../middleware/validation';

const router = Router();

// Public routes
router.post('/register', authLimiter, validateRegister, register);
router.post('/login', authLimiter, validateLogin, login);
router.get('/verify-email', authLimiter, verifyEmail);
router.post('/resend-verification', resendVerificationLimiter, validateEmail, resendVerificationEmail);
router.post('/forgot-password', authLimiter, validateEmail, forgotPassword);
router.post('/reset-password', authLimiter, validateResetPassword, resetPassword);

// Protected routes
router.get('/me', authenticate, getMe);
router.put('/profile', authenticate, validateUpdateProfile, updateProfile);
router.put('/password', authenticate, validateChangePassword, changePassword);
router.post('/avatar', authenticate, uploadSingle, uploadAvatar);

// Admin-only routes
router.post('/admin-register', authenticate, validateRegister, adminRegister);
router.get('/pending-users', authenticate, getPendingUsers);
router.post('/approve/:userId', authenticate, approveUser);
router.post('/reject/:userId', authenticate, rejectUser);
router.get('/users', authenticate, getAllUsers);

// SuperAdmin-only user management routes
router.get('/users/stats', authenticate, getUserStats);
router.get('/users/:userId', authenticate, getUserById);
router.post('/users/create', authenticate, validateRegister, createUser);
router.put('/users/:userId', authenticate, updateUser);
router.delete('/users/:userId', authenticate, deleteUser);
router.post('/users/:userId/activate', authenticate, activateUser);
router.post('/users/:userId/deactivate', authenticate, deactivateUser);
router.post('/users/:userId/reset-password', authenticate, resetUserPassword);

export default router;