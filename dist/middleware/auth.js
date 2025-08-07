"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireEmailVerification = exports.authenticateWithoutEmailVerification = exports.optionalAuth = exports.authorize = exports.authenticate = void 0;
const jwt_1 = require("../utils/jwt");
const User_1 = __importDefault(require("../models/User"));
const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ message: 'Access denied. No token provided.' });
        }
        const token = authHeader.substring(7);
        try {
            const decoded = (0, jwt_1.verifyToken)(token);
            const user = await User_1.default.findById(decoded.userId).select('-password');
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
        }
        catch (tokenError) {
            return res.status(401).json({ message: 'Invalid token.' });
        }
    }
    catch (error) {
        console.error('Authentication error:', error);
        res.status(500).json({ message: 'Server error during authentication.' });
    }
};
exports.authenticate = authenticate;
const authorize = (roles) => {
    return (req, res, next) => {
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
exports.authorize = authorize;
const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            try {
                const decoded = (0, jwt_1.verifyToken)(token);
                const user = await User_1.default.findById(decoded.userId).select('-password');
                if (user && user.isActive && user.emailVerified) {
                    req.user = user;
                }
            }
            catch (tokenError) {
            }
        }
        next();
    }
    catch (error) {
        next();
    }
};
exports.optionalAuth = optionalAuth;
const authenticateWithoutEmailVerification = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ message: 'Access denied. No token provided.' });
        }
        const token = authHeader.substring(7);
        try {
            const decoded = (0, jwt_1.verifyToken)(token);
            const user = await User_1.default.findById(decoded.userId).select('-password');
            if (!user || !user.isActive) {
                return res.status(401).json({ message: 'Invalid token. User not found or inactive.' });
            }
            req.user = user;
            next();
        }
        catch (tokenError) {
            return res.status(401).json({ message: 'Invalid token.' });
        }
    }
    catch (error) {
        console.error('Authentication error:', error);
        res.status(500).json({ message: 'Server error during authentication.' });
    }
};
exports.authenticateWithoutEmailVerification = authenticateWithoutEmailVerification;
const requireEmailVerification = (req, res, next) => {
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
exports.requireEmailVerification = requireEmailVerification;
