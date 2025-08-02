import rateLimit from 'express-rate-limit';

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: {
    error: 'Too many authentication attempts, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const generalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'), // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // limit each IP to 20 uploads per hour
  message: {
    error: 'Too many file uploads, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const resendVerificationLimiter = rateLimit({
  windowMs: 2 * 60 * 1000, // 2 minutes
  max: 1, // limit each IP to 1 resend per 2 minutes
  message: {
    error: 'Too many resend attempts. Please wait 2 minutes before trying again.',
    retryAfter: '2 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false, // Don't skip successful requests
});