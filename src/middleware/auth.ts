import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import User from '../models/User';

export interface AuthRequest extends Request {
  user?: any;
  file?: Express.Multer.File;
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    const token = authHeader.substring(7);
    
    try {
      const decoded = verifyToken(token);
      const user = await User.findById(decoded.userId).select('-password');
      
      if (!user || !user.isActive) {
        return res.status(401).json({ message: 'Invalid token. User not found or inactive.' });
      }

      if (!user.emailVerified) {
        return res.status(401).json({ 
          message: 'Email not verified. Please verify your email before accessing protected resources.',
          emailVerified: false
        });
      }

      req.user = user;
      next();
    } catch (tokenError) {
      return res.status(401).json({ message: 'Invalid token.' });
    }
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ message: 'Server error during authentication.' });
  }
};

export const authorize = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Access denied. No user found.' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: 'Access denied. Insufficient permissions.',
        requiredRoles: roles,
        userRole: req.user.role
      });
    }

    next();
  };
};

export const optionalAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      
      try {
        const decoded = verifyToken(token);
        const user = await User.findById(decoded.userId).select('-password');
        
        if (user && user.isActive && user.emailVerified) {
          req.user = user;
        }
      } catch (tokenError) {
        // Token invalid, but we continue without user
      }
    }
    
    next();
  } catch (error) {
    // If there's an error, continue without user
    next();
  }
};

export const authenticateWithoutEmailVerification = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    const token = authHeader.substring(7);
    
    try {
      const decoded = verifyToken(token);
      const user = await User.findById(decoded.userId).select('-password');
      
      if (!user || !user.isActive) {
        return res.status(401).json({ message: 'Invalid token. User not found or inactive.' });
      }

      req.user = user;
      next();
    } catch (tokenError) {
      return res.status(401).json({ message: 'Invalid token.' });
    }
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ message: 'Server error during authentication.' });
  }
};

export const requireEmailVerification = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Access denied. User not authenticated.' });
  }

  if (!req.user.emailVerified) {
    return res.status(401).json({ 
      message: 'Email not verified. Please verify your email before accessing this resource.',
      emailVerified: false
    });
  }

  next();
};