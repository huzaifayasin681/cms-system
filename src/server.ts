import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { createServer } from 'http';
import connectDB from './config/database';
import { errorHandler, notFound } from './middleware/errorHandler';
import { generalLimiter } from './middleware/rateLimiter';
import WebSocketServer from './websocket/websocketServer';

// Import routes
import authRoutes from './routes/auth';
import postRoutes from './routes/posts';
import pageRoutes from './routes/pages';
import mediaRoutes from './routes/media';
import analyticsRoutes from './routes/analytics';
import activityRoutes from './routes/activity';
import settingsRoutes from './routes/settings';
import commentRoutes from './routes/comments';
import notificationRoutes from './routes/notifications';
import testNotificationRoutes from './routes/test-notifications';

// Load environment variables
dotenv.config();

// Create Express app
const app = express();

// Connect to MongoDB
connectDB();

// Security middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// CORS configuration
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:3000',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
  'http://127.0.0.1:3002',
  'https://cms-frontend-3vk4.vercel.app',
  'https://localhost:3000',
  // Additional Vercel preview URLs pattern
  /^https:\/\/cms-frontend.*\.vercel\.app$/,
  // Allow any localhost port for development
  /^http:\/\/localhost:\d+$/,
  /^http:\/\/127\.0\.0\.1:\d+$/
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Check if origin matches any allowed origins (string or regex)
    const isAllowed = allowedOrigins.some(allowedOrigin => {
      if (typeof allowedOrigin === 'string') {
        return allowedOrigin === origin;
      } else if (allowedOrigin instanceof RegExp) {
        return allowedOrigin.test(origin);
      }
      return false;
    });
    
    if (isAllowed) {
      console.log(`✅ CORS allowed origin: ${origin}`);
      callback(null, true);
    } else {
      console.warn(`❌ CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Request-ID',
    'X-API-Version',
    'Accept',
    'Origin',
    'X-Requested-With'
  ],
  exposedHeaders: ['X-API-Version'],
  optionsSuccessStatus: 200, // Some legacy browsers (IE11, various SmartTVs) choke on 204
  preflightContinue: false
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
app.use(generalLimiter);

// Handle preflight requests explicitly
// app.options('*', (req, res) => {
//   res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
//   res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
//   res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Request-ID, X-API-Version, Accept, Origin, X-Requested-With');
//   res.header('Access-Control-Allow-Credentials', 'true');
//   res.header('Access-Control-Max-Age', '86400'); // 24 hours
//   res.sendStatus(200);
// });

// API versioning middleware
app.use('/api', (req, res, next) => {
  // Add API version to response headers
  res.setHeader('X-API-Version', '1.0.0');
  
  // Log request details for monitoring
  console.log(`${req.method} ${req.originalUrl} - ${req.headers['x-request-id'] || 'no-request-id'}`);
   console.log('🔥 Origin:', req.headers.origin);
  
  next();
});

// Health check route
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'CMS Backend Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0'
  });
});

// Legacy API routes (v1 - current)
app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/pages', pageRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/test', testNotificationRoutes);

// Versioned API routes (v1)
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/posts', postRoutes);
app.use('/api/v1/pages', pageRoutes);
app.use('/api/v1/media', mediaRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/activity', activityRoutes);
app.use('/api/v1/settings', settingsRoutes);
app.use('/api/v1/comments', commentRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/test', testNotificationRoutes);

// API info route
app.get('/api', (req, res) => {
  res.json({
    message: 'CMS API Server',
    version: '1.0.0',
    supportedVersions: ['v1'],
    currentVersion: 'v1',
    endpoints: {
      auth: '/api/v1/auth',
      posts: '/api/v1/posts',
      pages: '/api/v1/pages',
      media: '/api/v1/media',
      analytics: '/api/v1/analytics',
      activity: '/api/v1/activity',
      settings: '/api/v1/settings',
      comments: '/api/v1/comments',
      notifications: '/api/v1/notifications'
    },
    deprecation: {
      notice: 'Legacy endpoints without version prefix are deprecated',
      timeline: 'Will be removed in v2.0.0',
      migration: 'Use /api/v1/* endpoints instead'
    },
    documentation: 'Visit /api/docs for API documentation (coming soon)'
  });
});

// Version-specific info routes
app.get('/api/v1', (req, res) => {
  res.json({
    version: '1.0.0',
    status: 'stable',
    endpoints: {
      auth: '/api/v1/auth',
      posts: '/api/v1/posts',
      pages: '/api/v1/pages',
      media: '/api/v1/media',
      analytics: '/api/v1/analytics',
      activity: '/api/v1/activity',
      settings: '/api/v1/settings',
      comments: '/api/v1/comments',
      notifications: '/api/v1/notifications'
    }
  });
});

// 404 handler
app.use(notFound);

// Error handling middleware
app.use(errorHandler);

// Create HTTP server
const server = createServer(app);

// Initialize WebSocket server
const wsServer = new WebSocketServer(server);

// Make WebSocket server available to routes
app.set('websocketServer', wsServer);

// Export WebSocket server instance for use in other modules
export { wsServer };

// Start server
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  console.log(`📚 API Documentation: http://localhost:${PORT}/api`);
  console.log(`🏥 Health Check: http://localhost:${PORT}/health`);
  console.log(`🔌 WebSocket Server: ws://localhost:${PORT}`);
  console.log(`👥 Connected Users: ${wsServer.getConnectedUsers().length}`);
});

export default app;