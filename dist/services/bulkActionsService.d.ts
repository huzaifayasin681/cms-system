import mongoose from 'mongoose';
export interface IBulkOperation {
    action: string;
    contentIds: mongoose.Types.ObjectId[];
    contentType: 'post' | 'page' | 'mixed';
    parameters?: Record<string, any>;
}
export interface IBulkResult {
    success: number;
    failed: number;
    total: number;
    errors: string[];
    warnings: string[];
    results: Array<{
        id: mongoose.Types.ObjectId;
        success: boolean;
        error?: string;
    }>;
}
export declare class BulkActionsService {
    static executeBulkOperation(operation: IBulkOperation, userId: mongoose.Types.ObjectId): Promise<IBulkResult>;
    static getAvailableActions(contentType: 'post' | 'page' | 'mixed'): Array<{
        action: string;
        label: string;
        description: string;
        requiresParameters: boolean;
        parameters?: Array<{
            name: string;
            type: string;
            required: boolean;
            options?: any[];
        }>;
    }>;
    private static validateOperation;
    private static bulkPublish;
    private static bulkUnpublish;
    private static bulkArchive;
    private static bulkDelete;
    private static bulkUpdateCategories;
    private static bulkUpdateTags;
    private static bulkSchedulePublish;
    private static getContentModel;
    private static getContentTypeFromModel;
    private static determineContentType;
    private static bulkUpdateAuthor;
    private static bulkDuplicate;
    private static bulkExport;
}
export default BulkActionsService;
//# sourceMappingURL=bulkActionsService.d.ts.map