import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { verifyToken, JWTPayload } from '../utils/jwt';
import User, { IUser } from '../models/User';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userRole?: string;
}

interface PostEditingData {
  postId: string;
  title: string;
}

interface PageEditingData {
  pageId: string;
  title: string;
}

interface PageVisualBuilderData {
  pageId: string;
  components: any[];
}

interface MediaUploadData {
  fileName: string;
}

interface UserStatusData {
  status: 'active' | 'away' | 'busy';
}

interface CommentData {
  postId: string;
  content: string;
  author: string;
  timestamp: string;
}

export class WebSocketServer {
  private io: SocketIOServer;
  private connectedUsers: Map<string, AuthenticatedSocket> = new Map();

  constructor(server: HTTPServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        credentials: true,
        methods: ['GET', 'POST'],
      },
      transports: ['websocket', 'polling'],
    });

    this.setupMiddleware();
    this.setupEventHandlers();
  }

  private setupMiddleware() {
    this.io.use(async (socket: AuthenticatedSocket, next) => {
      try {
        const token =
          socket.handshake.auth.token ||
          socket.handshake.headers.authorization?.replace('Bearer ', '');

        if (!token) {
          return next(new Error('Authentication token is required'));
        }

        const decoded: JWTPayload = verifyToken(token);
        if (!decoded?.userId) {
          return next(new Error('Invalid token'));
        }

        const user: IUser | null = await User.findById(decoded.userId).select('-password');
        if (!user || !user.isActive || !user.emailVerified) {
          return next(new Error('Invalid or unverified user'));
        }

        socket.userId = (user._id as any).toString();
        socket.userRole = user.role;

        next();
      } catch (err) {
        console.error('WebSocket authentication error:', err);
        next(new Error('Authentication failed'));
      }
    });
  }

  private setupEventHandlers() {
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      if (!socket.userId) return;

      console.log(`User ${socket.userId} connected`);

      this.connectedUsers.set(socket.userId, socket);

      socket.join(`user:${socket.userId}`);
      socket.join('all-users');

      if (socket.userRole === 'admin') socket.join('admin');
      if (['admin', 'editor'].includes(socket.userRole || '')) socket.join('editors');

      this.setupPostEvents(socket);
      this.setupPageEvents(socket);
      this.setupMediaEvents(socket);
      this.setupUserEvents(socket);
      this.setupSystemEvents(socket);

      socket.on('disconnect', () => {
        console.log(`User ${socket.userId} disconnected`);
        if (socket.userId) {
          this.connectedUsers.delete(socket.userId);
        }
      });
    });
  }

  private setupPostEvents(socket: AuthenticatedSocket) {
    socket.on('post:editing', (data: PostEditingData) => {
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

    socket.on('post:stop-editing', (data: { postId: string }) => {
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

    socket.on('comment:new', (data: CommentData) => {
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

  private setupPageEvents(socket: AuthenticatedSocket) {
    socket.on('page:editing', (data: PageEditingData) => {
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

    socket.on('page:visual-builder', (data: PageVisualBuilderData) => {
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

  private setupMediaEvents(socket: AuthenticatedSocket) {
    socket.on('media:upload-start', (data: MediaUploadData) => {
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

    socket.on('media:upload-progress', (data: { fileName: string; progress: number }) => {
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

    socket.on('media:upload-complete', (data: { fileName: string; fileUrl: string }) => {
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
      
      // Notify other editors about new media
      socket.to('editors').emit('media:new-upload', {
        fileName: data.fileName,
        fileUrl: data.fileUrl,
        uploadedBy: socket.userId,
        timestamp: new Date().toISOString(),
      });
    });
  }

  private setupUserEvents(socket: AuthenticatedSocket) {
    socket.on('user:status', (data: UserStatusData) => {
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

    socket.on('user:typing', (data: { location: string; isTyping: boolean }) => {
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

  private setupSystemEvents(socket: AuthenticatedSocket) {
    socket.on('system:ping', () => {
      socket.emit('system:pong', {
        timestamp: new Date().toISOString(),
        connectedUsers: this.connectedUsers.size,
      });
    });
  }

  // Broadcast Methods
  public broadcastToAll(event: string, data: any): void {
    if (!event || typeof event !== 'string') {
      console.error('Invalid event name for broadcast');
      return;
    }
    this.io.to('all-users').emit(event, data);
  }

  public broadcastToAdmins(event: string, data: any): void {
    if (!event || typeof event !== 'string') {
      console.error('Invalid event name for admin broadcast');
      return;
    }
    this.io.to('admin').emit(event, data);
  }

  public broadcastToEditors(event: string, data: any): void {
    if (!event || typeof event !== 'string') {
      console.error('Invalid event name for editor broadcast');
      return;
    }
    this.io.to('editors').emit(event, data);
  }

  public broadcastToUser(userId: string, event: string, data: any): boolean {
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

  public getConnectedUsers(): string[] {
    return [...this.connectedUsers.keys()];
  }

  public getConnectedUsersCount(): number {
    return this.connectedUsers.size;
  }

  public isUserConnected(userId: string): boolean {
    if (!userId) return false;
    return this.connectedUsers.has(userId);
  }

  public disconnectUser(userId: string): boolean {
    if (!userId) return false;
    
    const socket = this.connectedUsers.get(userId);
    if (socket) {
      socket.disconnect(true);
      this.connectedUsers.delete(userId);
      return true;
    }
    return false;
  }

  public getServerStats(): { connectedUsers: number; rooms: string[] } {
    const rooms = Array.from(this.io.sockets.adapter.rooms.keys());
    return {
      connectedUsers: this.connectedUsers.size,
      rooms: rooms.filter(room => !this.connectedUsers.has(room)), // Filter out user-specific rooms
    };
  }
}

export default WebSocketServer;
