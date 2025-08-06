"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebSocketServer = void 0;
const socket_io_1 = require("socket.io");
const jwt_1 = require("../utils/jwt");
const User_1 = __importDefault(require("../models/User"));
class WebSocketServer {
    constructor(server) {
        this.connectedUsers = new Map();
        this.io = new socket_io_1.Server(server, {
            cors: {
                origin: [
                    process.env.FRONTEND_URL || 'http://localhost:3000',
                    'http://localhost:3000',
                    'http://localhost:3001',
                    'http://127.0.0.1:3000'
                ],
                credentials: true,
                methods: ['GET', 'POST'],
            },
            transports: ['websocket', 'polling'],
            allowEIO3: true,
        });
        this.setupMiddleware();
        this.setupEventHandlers();
    }
    setupMiddleware() {
        this.io.use(async (socket, next) => {
            try {
                const token = socket.handshake.auth.token ||
                    socket.handshake.headers.authorization?.replace('Bearer ', '');
                if (!token) {
                    return next(new Error('Authentication token is required'));
                }
                const decoded = (0, jwt_1.verifyToken)(token);
                if (!decoded?.userId) {
                    return next(new Error('Invalid token'));
                }
                const user = await User_1.default.findById(decoded.userId).select('-password');
                if (!user || !user.isActive || !user.emailVerified) {
                    return next(new Error('Invalid or unverified user'));
                }
                socket.userId = user._id.toString();
                socket.userRole = user.role;
                next();
            }
            catch (err) {
                console.error('WebSocket authentication error:', err);
                next(new Error('Authentication failed'));
            }
        });
    }
    setupEventHandlers() {
        this.io.on('connection', (socket) => {
            if (!socket.userId)
                return;
            console.log(`User ${socket.userId} connected`);
            this.connectedUsers.set(socket.userId, socket);
            socket.join(`user:${socket.userId}`);
            socket.join('all-users');
            if (socket.userRole === 'admin')
                socket.join('admin');
            if (['admin', 'editor'].includes(socket.userRole || ''))
                socket.join('editors');
            this.setupPostEvents(socket);
            this.setupPageEvents(socket);
            this.setupMediaEvents(socket);
            this.setupUserEvents(socket);
            this.setupSystemEvents(socket);
            this.setupNotificationEvents(socket);
            socket.on('disconnect', () => {
                console.log(`User ${socket.userId} disconnected`);
                if (socket.userId) {
                    this.connectedUsers.delete(socket.userId);
                }
            });
        });
    }
    setupPostEvents(socket) {
        socket.on('post:editing', (data) => {
            if (!data.postId || !data.title) {
                console.error('Invalid post editing data received');
                return;
            }
            socket.to('editors').emit('post:being-edited', {
                ...data,
                editor: socket.userId,
                timestamp: new Date().toISOString(),
            });
        });
        socket.on('post:stop-editing', (data) => {
            if (!data.postId) {
                console.error('Invalid post stop editing data received');
                return;
            }
            socket.to('editors').emit('post:editing-stopped', {
                ...data,
                editor: socket.userId,
                timestamp: new Date().toISOString(),
            });
        });
        socket.on('comment:new', (data) => {
            if (!data.postId || !data.content) {
                console.error('Invalid comment data received');
                return;
            }
            this.io.to('all-users').emit('comment:created', {
                ...data,
                timestamp: new Date().toISOString(),
            });
        });
    }
    setupPageEvents(socket) {
        socket.on('page:editing', (data) => {
            if (!data.pageId || !data.title) {
                console.error('Invalid page editing data received');
                return;
            }
            socket.to('editors').emit('page:being-edited', {
                ...data,
                editor: socket.userId,
                timestamp: new Date().toISOString(),
            });
        });
        socket.on('page:visual-builder', (data) => {
            if (!data.pageId || !Array.isArray(data.components)) {
                console.error('Invalid page visual builder data received');
                return;
            }
            socket.to('editors').emit('page:visual-builder-update', {
                ...data,
                editor: socket.userId,
                timestamp: new Date().toISOString(),
            });
        });
    }
    setupMediaEvents(socket) {
        socket.on('media:upload-start', (data) => {
            if (!data.fileName) {
                console.error('Invalid media upload data received');
                return;
            }
            socket.emit('media:upload-progress', {
                ...data,
                progress: 0,
                status: 'started',
                timestamp: new Date().toISOString(),
            });
        });
        socket.on('media:upload-progress', (data) => {
            if (!data.fileName || typeof data.progress !== 'number') {
                console.error('Invalid media upload progress data received');
                return;
            }
            socket.emit('media:upload-progress', {
                ...data,
                status: 'uploading',
                timestamp: new Date().toISOString(),
            });
        });
        socket.on('media:upload-complete', (data) => {
            if (!data.fileName || !data.fileUrl) {
                console.error('Invalid media upload complete data received');
                return;
            }
            socket.emit('media:upload-progress', {
                ...data,
                progress: 100,
                status: 'completed',
                timestamp: new Date().toISOString(),
            });
            socket.to('editors').emit('media:new-upload', {
                fileName: data.fileName,
                fileUrl: data.fileUrl,
                uploadedBy: socket.userId,
                timestamp: new Date().toISOString(),
            });
        });
    }
    setupUserEvents(socket) {
        socket.on('user:status', (data) => {
            if (!data.status || !['active', 'away', 'busy'].includes(data.status)) {
                console.error('Invalid user status data received');
                return;
            }
            socket.to('editors').emit('user:status-update', {
                userId: socket.userId,
                ...data,
                timestamp: new Date().toISOString(),
            });
        });
        socket.on('user:typing', (data) => {
            if (!data.location || typeof data.isTyping !== 'boolean') {
                console.error('Invalid user typing data received');
                return;
            }
            socket.to('editors').emit('user:typing-update', {
                userId: socket.userId,
                ...data,
                timestamp: new Date().toISOString(),
            });
        });
    }
    setupSystemEvents(socket) {
        socket.on('system:ping', () => {
            socket.emit('system:pong', {
                timestamp: new Date().toISOString(),
                connectedUsers: this.connectedUsers.size,
            });
        });
    }
    setupNotificationEvents(socket) {
        socket.join(`notifications:${socket.userId}`);
        socket.on('notification:acknowledge', (data) => {
            if (!data.notificationId) {
                console.error('Invalid notification acknowledgment data received');
                return;
            }
            console.log(`User ${socket.userId} acknowledged notification ${data.notificationId}`);
        });
        socket.on('notification:read', (data) => {
            if (!data.notificationId) {
                console.error('Invalid notification read data received');
                return;
            }
            console.log(`User ${socket.userId} marked notification ${data.notificationId} as read`);
        });
    }
    broadcastToAll(event, data) {
        if (!event || typeof event !== 'string') {
            console.error('Invalid event name for broadcast');
            return;
        }
        this.io.to('all-users').emit(event, data);
    }
    broadcastToAdmins(event, data) {
        if (!event || typeof event !== 'string') {
            console.error('Invalid event name for admin broadcast');
            return;
        }
        this.io.to('admin').emit(event, data);
    }
    broadcastToEditors(event, data) {
        if (!event || typeof event !== 'string') {
            console.error('Invalid event name for editor broadcast');
            return;
        }
        this.io.to('editors').emit(event, data);
    }
    broadcastToUser(userId, event, data) {
        if (!userId || !event || typeof event !== 'string') {
            console.error('Invalid parameters for user broadcast');
            return false;
        }
        const socket = this.connectedUsers.get(userId);
        if (socket) {
            socket.emit(event, data);
            return true;
        }
        return false;
    }
    broadcastNotificationToUser(userId, notification) {
        if (!userId || !notification) {
            console.error('Invalid parameters for notification broadcast');
            return false;
        }
        const socket = this.connectedUsers.get(userId);
        if (socket) {
            socket.emit('notification:new', notification);
            return true;
        }
        this.io.to(`notifications:${userId}`).emit('notification:new', notification);
        return false;
    }
    broadcastNotificationUpdate(userId, update) {
        if (!userId || !update) {
            console.error('Invalid parameters for notification update broadcast');
            return false;
        }
        this.io.to(`notifications:${userId}`).emit('notification:update', update);
        return true;
    }
    getConnectedUsers() {
        return [...this.connectedUsers.keys()];
    }
    getConnectedUsersCount() {
        return this.connectedUsers.size;
    }
    isUserConnected(userId) {
        if (!userId)
            return false;
        return this.connectedUsers.has(userId);
    }
    disconnectUser(userId) {
        if (!userId)
            return false;
        const socket = this.connectedUsers.get(userId);
        if (socket) {
            socket.disconnect(true);
            this.connectedUsers.delete(userId);
            return true;
        }
        return false;
    }
    getServerStats() {
        const rooms = Array.from(this.io.sockets.adapter.rooms.keys());
        return {
            connectedUsers: this.connectedUsers.size,
            rooms: rooms.filter(room => !this.connectedUsers.has(room)),
        };
    }
}
exports.WebSocketServer = WebSocketServer;
exports.default = WebSocketServer;
//# sourceMappingURL=websocketServer.js.map