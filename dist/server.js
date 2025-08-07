"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.wsServer = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const dotenv_1 = __importDefault(require("dotenv"));
const http_1 = require("http");
const database_1 = __importDefault(require("./config/database"));
const errorHandler_1 = require("./middleware/errorHandler");
const rateLimiter_1 = require("./middleware/rateLimiter");
const websocketServer_1 = __importDefault(require("./websocket/websocketServer"));
const auth_1 = __importDefault(require("./routes/auth"));
const posts_1 = __importDefault(require("./routes/posts"));
const pages_1 = __importDefault(require("./routes/pages"));
const media_1 = __importDefault(require("./routes/media"));
const analytics_1 = __importDefault(require("./routes/analytics"));
const activity_1 = __importDefault(require("./routes/activity"));
const settings_1 = __importDefault(require("./routes/settings"));
const comments_1 = __importDefault(require("./routes/comments"));
const notifications_1 = __importDefault(require("./routes/notifications"));
const test_notifications_1 = __importDefault(require("./routes/test-notifications"));
dotenv_1.default.config();
const app = (0, express_1.default)();
(0, database_1.default)();
app.use((0, helmet_1.default)({
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
    /^https:\/\/cms-frontend.*\.vercel\.app$/,
    /^http:\/\/localhost:\d+$/,
    /^http:\/\/127\.0\.0\.1:\d+$/
];
app.use((0, cors_1.default)({
    origin: function (origin, callback) {
        if (!origin)
            return callback(null, true);
        const isAllowed = allowedOrigins.some(allowedOrigin => {
            if (typeof allowedOrigin === 'string') {
                return allowedOrigin === origin;
            }
            else if (allowedOrigin instanceof RegExp) {
                return allowedOrigin.test(origin);
            }
            return false;
        });
        if (isAllowed) {
            console.log(`✅ CORS allowed origin: ${origin}`);
            callback(null, true);
        }
        else {
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
    optionsSuccessStatus: 200,
    preflightContinue: false
}));
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
app.use(rateLimiter_1.generalLimiter);
app.use('/api', (req, res, next) => {
    res.setHeader('X-API-Version', '1.0.0');
    console.log(`${req.method} ${req.originalUrl} - ${req.headers['x-request-id'] || 'no-request-id'}`);
    console.log('🔥 Origin:', req.headers.origin);
    next();
});
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        message: 'CMS Backend Server is running',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        version: '1.0.0'
    });
});
app.use('/api/auth', auth_1.default);
app.use('/api/posts', posts_1.default);
app.use('/api/pages', pages_1.default);
app.use('/api/media', media_1.default);
app.use('/api/analytics', analytics_1.default);
app.use('/api/activity', activity_1.default);
app.use('/api/settings', settings_1.default);
app.use('/api/comments', comments_1.default);
app.use('/api/notifications', notifications_1.default);
app.use('/api/test', test_notifications_1.default);
app.use('/api/v1/auth', auth_1.default);
app.use('/api/v1/posts', posts_1.default);
app.use('/api/v1/pages', pages_1.default);
app.use('/api/v1/media', media_1.default);
app.use('/api/v1/analytics', analytics_1.default);
app.use('/api/v1/activity', activity_1.default);
app.use('/api/v1/settings', settings_1.default);
app.use('/api/v1/comments', comments_1.default);
app.use('/api/v1/notifications', notifications_1.default);
app.use('/api/v1/test', test_notifications_1.default);
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
app.use(errorHandler_1.notFound);
app.use(errorHandler_1.errorHandler);
const server = (0, http_1.createServer)(app);
const wsServer = new websocketServer_1.default(server);
exports.wsServer = wsServer;
app.set('websocketServer', wsServer);
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`🚀 Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
    console.log(`📚 API Documentation: http://localhost:${PORT}/api`);
    console.log(`🏥 Health Check: http://localhost:${PORT}/health`);
    console.log(`🔌 WebSocket Server: ws://localhost:${PORT}`);
    console.log(`👥 Connected Users: ${wsServer.getConnectedUsers().length}`);
});
exports.default = app;
