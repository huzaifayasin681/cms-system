import mongoose from 'mongoose';
export interface IVersionDiff {
    field: string;
    oldValue: any;
    newValue: any;
    type: 'added' | 'removed' | 'modified';
}
export declare class ContentVersioningService {
    static createVersion(contentId: mongoose.Types.ObjectId, contentType: 'post' | 'page', userId: mongoose.Types.ObjectId, changeType: 'create' | 'update' | 'revert', changeDescription?: string): Promise<mongoose.Document<unknown, {}, import("../models/ContentVersion").IContentVersion, {}> & import("../models/ContentVersion").IContentVersion & Required<{
        _id: unknown;
    }> & {
        __v: number;
    }>;
    static getVersionHistory(contentId: mongoose.Types.ObjectId, contentType: 'post' | 'page', limit?: number, offset?: number): Promise<{
        versions: (mongoose.FlattenMaps<import("../models/ContentVersion").IContentVersion> & Required<{
            _id: mongoose.FlattenMaps<unknown>;
        }> & {
            __v: number;
        })[];
        total: number;
        hasMore: boolean;
    }>;
    static getVersion(contentId: mongoose.Types.ObjectId, contentType: 'post' | 'page', version: number): Promise<mongoose.Document<unknown, {}, import("../models/ContentVersion").IContentVersion, {}> & import("../models/ContentVersion").IContentVersion & Required<{
        _id: unknown;
    }> & {
        __v: number;
    }>;
    static compareVersions(contentId: mongoose.Types.ObjectId, contentType: 'post' | 'page', fromVersion: number, toVersion: number): Promise<IVersionDiff[]>;
    static revertToVersion(contentId: mongoose.Types.ObjectId, contentType: 'post' | 'page', targetVersion: number, userId: mongoose.Types.ObjectId): Promise<any>;
    static cleanupOldVersions(contentId: mongoose.Types.ObjectId, contentType: 'post' | 'page', keepCount?: number): Promise<number>;
    static getContentStats(contentId: mongoose.Types.ObjectId, contentType: 'post' | 'page'): Promise<any>;
    private static getChangedFields;
    private static generateDiff;
}
export default ContentVersioningService;
//# sourceMappingURL=versioningService.d.ts.map