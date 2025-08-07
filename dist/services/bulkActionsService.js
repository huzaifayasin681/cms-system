"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BulkActionsService = void 0;
const Post_1 = __importDefault(require("../models/Post"));
const Page_1 = __importDefault(require("../models/Page"));
const versioningService_1 = __importDefault(require("./versioningService"));
const schedulingService_1 = __importDefault(require("./schedulingService"));
const mongooseHelper_1 = require("../utils/mongooseHelper");
class BulkActionsService {
    static async executeBulkOperation(operation, userId) {
        const result = {
            success: 0,
            failed: 0,
            total: operation.contentIds.length,
            errors: [],
            warnings: [],
            results: []
        };
        const validation = this.validateOperation(operation);
        if (!validation.isValid) {
            throw new Error(`Invalid operation: ${validation.errors.join(', ')}`);
        }
        switch (operation.action) {
            case 'publish':
                return await this.bulkPublish(operation, userId, result);
            case 'unpublish':
                return await this.bulkUnpublish(operation, userId, result);
            case 'archive':
                return await this.bulkArchive(operation, userId, result);
            case 'delete':
                return await this.bulkDelete(operation, userId, result);
            case 'update-categories':
                return await this.bulkUpdateCategories(operation, userId, result);
            case 'update-tags':
                return await this.bulkUpdateTags(operation, userId, result);
            case 'update-author':
                return await this.bulkUpdateAuthor(operation, userId, result);
            case 'schedule-publish':
                return await this.bulkSchedulePublish(operation, userId, result);
            case 'duplicate':
                return await this.bulkDuplicate(operation, userId, result);
            case 'export':
                return await this.bulkExport(operation, userId, result);
            default:
                throw new Error(`Unsupported bulk action: ${operation.action}`);
        }
    }
    static getAvailableActions(contentType) {
        const baseActions = [
            {
                action: 'publish',
                label: 'Publish',
                description: 'Make content publicly visible',
                requiresParameters: false
            },
            {
                action: 'unpublish',
                label: 'Unpublish',
                description: 'Hide content from public view',
                requiresParameters: false
            },
            {
                action: 'archive',
                label: 'Archive',
                description: 'Move content to archived status',
                requiresParameters: false
            },
            {
                action: 'delete',
                label: 'Delete',
                description: 'Permanently remove content (use with caution)',
                requiresParameters: false
            },
            {
                action: 'update-categories',
                label: 'Update Categories',
                description: 'Add or remove categories from content',
                requiresParameters: true,
                parameters: [
                    {
                        name: 'operation',
                        type: 'select',
                        required: true,
                        options: [
                            { value: 'add', label: 'Add Categories' },
                            { value: 'remove', label: 'Remove Categories' },
                            { value: 'replace', label: 'Replace All Categories' }
                        ]
                    },
                    {
                        name: 'categories',
                        type: 'multi-select',
                        required: true,
                        options: []
                    }
                ]
            },
            {
                action: 'update-tags',
                label: 'Update Tags',
                description: 'Add or remove tags from content',
                requiresParameters: true,
                parameters: [
                    {
                        name: 'operation',
                        type: 'select',
                        required: true,
                        options: [
                            { value: 'add', label: 'Add Tags' },
                            { value: 'remove', label: 'Remove Tags' },
                            { value: 'replace', label: 'Replace All Tags' }
                        ]
                    },
                    {
                        name: 'tags',
                        type: 'multi-select',
                        required: true,
                        options: []
                    }
                ]
            },
            {
                action: 'update-author',
                label: 'Change Author',
                description: 'Change the author of selected content',
                requiresParameters: true,
                parameters: [
                    {
                        name: 'authorId',
                        type: 'user-select',
                        required: true
                    }
                ]
            },
            {
                action: 'schedule-publish',
                label: 'Schedule Publishing',
                description: 'Schedule content to be published at a specific time',
                requiresParameters: true,
                parameters: [
                    {
                        name: 'scheduledAt',
                        type: 'datetime',
                        required: true
                    },
                    {
                        name: 'notifyUsers',
                        type: 'multi-user-select',
                        required: false
                    },
                    {
                        name: 'emailNotification',
                        type: 'boolean',
                        required: false
                    }
                ]
            },
            {
                action: 'duplicate',
                label: 'Duplicate',
                description: 'Create copies of selected content',
                requiresParameters: true,
                parameters: [
                    {
                        name: 'suffix',
                        type: 'text',
                        required: false,
                        default: ' (Copy)'
                    },
                    {
                        name: 'status',
                        type: 'select',
                        required: false,
                        default: 'draft',
                        options: [
                            { value: 'draft', label: 'Draft' },
                            { value: 'published', label: 'Published' }
                        ]
                    }
                ]
            },
            {
                action: 'export',
                label: 'Export',
                description: 'Export content in various formats',
                requiresParameters: true,
                parameters: [
                    {
                        name: 'format',
                        type: 'select',
                        required: true,
                        options: [
                            { value: 'markdown', label: 'Markdown' },
                            { value: 'json', label: 'JSON' },
                            { value: 'csv', label: 'CSV' }
                        ]
                    }
                ]
            }
        ];
        return baseActions;
    }
    static validateOperation(operation) {
        const errors = [];
        if (!operation.contentIds || operation.contentIds.length === 0) {
            errors.push('No content IDs provided');
        }
        if (operation.contentIds.length > 100) {
            errors.push('Too many items selected. Maximum 100 items per bulk operation.');
        }
        if (!['post', 'page', 'mixed'].includes(operation.contentType)) {
            errors.push('Invalid content type');
        }
        const actionConfig = this.getAvailableActions(operation.contentType)
            .find(a => a.action === operation.action);
        if (!actionConfig) {
            errors.push(`Unknown action: ${operation.action}`);
        }
        else if (actionConfig.requiresParameters) {
            if (!operation.parameters) {
                errors.push('Parameters required for this action');
            }
            else {
                const requiredParams = actionConfig.parameters?.filter(p => p.required) || [];
                for (const param of requiredParams) {
                    if (!(param.name in operation.parameters)) {
                        errors.push(`Required parameter missing: ${param.name}`);
                    }
                }
            }
        }
        return { isValid: errors.length === 0, errors };
    }
    static async bulkPublish(operation, userId, result) {
        for (const contentId of operation.contentIds) {
            try {
                const { Model, content } = await this.getContentModel(contentId, operation.contentType);
                if (!content) {
                    result.results.push({ id: contentId, success: false, error: 'Content not found' });
                    result.failed++;
                    continue;
                }
                await Model.findByIdAndUpdate(contentId, {
                    status: 'published',
                    publishedAt: content.publishedAt || new Date()
                });
                await versioningService_1.default.createVersion(contentId, this.getContentTypeFromModel(Model), userId, 'update', 'Bulk published');
                result.results.push({ id: contentId, success: true });
                result.success++;
            }
            catch (error) {
                result.results.push({ id: contentId, success: false, error: error instanceof Error ? error.message : 'Unknown error' });
                result.errors.push(`Error publishing ${contentId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
                result.failed++;
            }
        }
        return result;
    }
    static async bulkUnpublish(operation, userId, result) {
        for (const contentId of operation.contentIds) {
            try {
                const { Model } = await this.getContentModel(contentId, operation.contentType);
                await Model.findByIdAndUpdate(contentId, {
                    status: 'draft',
                    publishedAt: null
                });
                await versioningService_1.default.createVersion(contentId, this.getContentTypeFromModel(Model), userId, 'update', 'Bulk unpublished');
                result.results.push({ id: contentId, success: true });
                result.success++;
            }
            catch (error) {
                result.results.push({ id: contentId, success: false, error: error instanceof Error ? error.message : 'Unknown error' });
                result.errors.push(`Error unpublishing ${contentId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
                result.failed++;
            }
        }
        return result;
    }
    static async bulkArchive(operation, userId, result) {
        for (const contentId of operation.contentIds) {
            try {
                const { Model } = await this.getContentModel(contentId, operation.contentType);
                await Model.findByIdAndUpdate(contentId, { status: 'archived' });
                await versioningService_1.default.createVersion(contentId, this.getContentTypeFromModel(Model), userId, 'update', 'Bulk archived');
                result.results.push({ id: contentId, success: true });
                result.success++;
            }
            catch (error) {
                result.results.push({ id: contentId, success: false, error: error instanceof Error ? error.message : 'Unknown error' });
                result.errors.push(`Error archiving ${contentId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
                result.failed++;
            }
        }
        return result;
    }
    static async bulkDelete(operation, userId, result) {
        for (const contentId of operation.contentIds) {
            try {
                const { Model, content } = await this.getContentModel(contentId, operation.contentType);
                if (!content) {
                    result.results.push({ id: contentId, success: false, error: 'Content not found' });
                    result.failed++;
                    continue;
                }
                await Model.findByIdAndDelete(contentId);
                result.results.push({ id: contentId, success: true });
                result.success++;
            }
            catch (error) {
                result.results.push({ id: contentId, success: false, error: error instanceof Error ? error.message : 'Unknown error' });
                result.errors.push(`Error deleting ${contentId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
                result.failed++;
            }
        }
        return result;
    }
    static async bulkUpdateCategories(operation, userId, result) {
        const { operation: op, categories } = operation.parameters;
        for (const contentId of operation.contentIds) {
            try {
                const { Model } = await this.getContentModel(contentId, operation.contentType);
                let updateQuery = {};
                switch (op) {
                    case 'add':
                        updateQuery = { $addToSet: { categories: { $each: categories } } };
                        break;
                    case 'remove':
                        updateQuery = { $pull: { categories: { $in: categories } } };
                        break;
                    case 'replace':
                        updateQuery = { categories };
                        break;
                }
                await (0, mongooseHelper_1.safeFindByIdAndUpdate)(Model, contentId, updateQuery);
                await versioningService_1.default.createVersion(contentId, this.getContentTypeFromModel(Model), userId, 'update', `Bulk categories ${op}`);
                result.results.push({ id: contentId, success: true });
                result.success++;
            }
            catch (error) {
                result.results.push({ id: contentId, success: false, error: error instanceof Error ? error.message : 'Unknown error' });
                result.errors.push(`Error updating categories for ${contentId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
                result.failed++;
            }
        }
        return result;
    }
    static async bulkUpdateTags(operation, userId, result) {
        const { operation: op, tags } = operation.parameters;
        for (const contentId of operation.contentIds) {
            try {
                const { Model } = await this.getContentModel(contentId, operation.contentType);
                let updateQuery = {};
                switch (op) {
                    case 'add':
                        updateQuery = { $addToSet: { tags: { $each: tags } } };
                        break;
                    case 'remove':
                        updateQuery = { $pull: { tags: { $in: tags } } };
                        break;
                    case 'replace':
                        updateQuery = { tags };
                        break;
                }
                await (0, mongooseHelper_1.safeFindByIdAndUpdate)(Model, contentId, updateQuery);
                await versioningService_1.default.createVersion(contentId, this.getContentTypeFromModel(Model), userId, 'update', `Bulk tags ${op}`);
                result.results.push({ id: contentId, success: true });
                result.success++;
            }
            catch (error) {
                result.results.push({ id: contentId, success: false, error: error instanceof Error ? error.message : 'Unknown error' });
                result.errors.push(`Error updating tags for ${contentId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
                result.failed++;
            }
        }
        return result;
    }
    static async bulkSchedulePublish(operation, userId, result) {
        const { scheduledAt, notifyUsers, emailNotification } = operation.parameters;
        for (const contentId of operation.contentIds) {
            try {
                const { content } = await this.getContentModel(contentId, operation.contentType);
                if (!content) {
                    result.results.push({ id: contentId, success: false, error: 'Content not found' });
                    result.failed++;
                    continue;
                }
                const contentType = this.determineContentType(content);
                await schedulingService_1.default.scheduleAction(contentId, contentType, userId, {
                    scheduledAt: new Date(scheduledAt),
                    action: 'publish',
                    targetStatus: 'published',
                    notifyUsers: notifyUsers || [],
                    emailNotification: emailNotification || false,
                    socialMediaPost: false
                });
                result.results.push({ id: contentId, success: true });
                result.success++;
            }
            catch (error) {
                result.results.push({ id: contentId, success: false, error: error instanceof Error ? error.message : 'Unknown error' });
                result.errors.push(`Error scheduling ${contentId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
                result.failed++;
            }
        }
        return result;
    }
    static async getContentModel(contentId, contentType) {
        if (contentType === 'mixed') {
            let content = await Post_1.default.findById(contentId);
            if (content)
                return { Model: Post_1.default, content };
            content = await Page_1.default.findById(contentId);
            return { Model: Page_1.default, content };
        }
        else {
            const Model = contentType === 'post' ? Post_1.default : Page_1.default;
            const content = await (0, mongooseHelper_1.safeFindById)(Model, contentId);
            return { Model, content };
        }
    }
    static getContentTypeFromModel(Model) {
        return Model.modelName === 'Post' ? 'post' : 'page';
    }
    static determineContentType(content) {
        return content.constructor.modelName === 'Post' ? 'post' : 'page';
    }
    static async bulkUpdateAuthor(operation, userId, result) {
        return result;
    }
    static async bulkDuplicate(operation, userId, result) {
        return result;
    }
    static async bulkExport(operation, userId, result) {
        return result;
    }
}
exports.BulkActionsService = BulkActionsService;
exports.default = BulkActionsService;
