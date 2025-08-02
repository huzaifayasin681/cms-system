import { Server as HTTPServer } from 'http';
export declare class WebSocketServer {
    private io;
    private connectedUsers;
    constructor(server: HTTPServer);
    private setupMiddleware;
    private setupEventHandlers;
    private setupPostEvents;
    private setupPageEvents;
    private setupMediaEvents;
    private setupUserEvents;
    private setupSystemEvents;
    broadcastToAll(event: string, data: any): void;
    broadcastToAdmins(event: string, data: any): void;
    broadcastToEditors(event: string, data: any): void;
    broadcastToUser(userId: string, event: string, data: any): boolean;
    getConnectedUsers(): string[];
    getConnectedUsersCount(): number;
    isUserConnected(userId: string): boolean;
    disconnectUser(userId: string): boolean;
    getServerStats(): {
        connectedUsers: number;
        rooms: string[];
    };
}
export default WebSocketServer;
//# sourceMappingURL=websocketServer.d.ts.map