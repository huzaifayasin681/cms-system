import mongoose from 'mongoose';
import Post from '../models/Post';
import Page from '../models/Page';
import Category from '../models/Category';
import Tag from '../models/Tag';
import ContentVersioningService from './versioningService';
import ContentSchedulingService from './schedulingService';
import NotificationService from './notificationService';
import { mongooseQuery, safeFindByIdAndUpdate, safeFindById } from '../utils/mongooseHelper';

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

export class BulkActionsService {
  /**
   * Execute bulk operation
   */
  static async executeBulkOperation(
    operation: IBulkOperation,
    userId: mongoose.Types.ObjectId
  ): Promise<IBulkResult> {
    const result: IBulkResult = {
      success: 0,
      failed: 0,
      total: operation.contentIds.length,
      errors: [],
      warnings: [],
      results: []
    };

    // Validate operation
    const validation = this.validateOperation(operation);
    if (!validation.isValid) {
      throw new Error(`Invalid operation: ${validation.errors.join(', ')}`);
    }

    // Execute operation based on action
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

  /**
   * Get available bulk actions for content type
   */
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
  }> {
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
            options: [] // Will be populated from Category collection
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
            options: [] // Will be populated from Tag collection
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

  /**
   * Validate bulk operation
   */
  private static validateOperation(operation: IBulkOperation): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!operation.contentIds || operation.contentIds.length === 0) {
      errors.push('No content IDs provided');
    }

    if (operation.contentIds.length > 100) {
      errors.push('Too many items selected. Maximum 100 items per bulk operation.');
    }

    if (!['post', 'page', 'mixed'].includes(operation.contentType)) {
      errors.push('Invalid content type');
    }

    // Validate required parameters based on action
    const actionConfig = this.getAvailableActions(operation.contentType)
      .find(a => a.action === operation.action);

    if (!actionConfig) {
      errors.push(`Unknown action: ${operation.action}`);
    } else if (actionConfig.requiresParameters) {
      if (!operation.parameters) {
        errors.push('Parameters required for this action');
      } else {
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

  /**
   * Bulk operation implementations
   */
  private static async bulkPublish(
    operation: IBulkOperation,
    userId: mongoose.Types.ObjectId,
    result: IBulkResult
  ): Promise<IBulkResult> {
    for (const contentId of operation.contentIds) {
      try {
        const { Model, content } = await this.getContentModel(contentId, operation.contentType);
        
        if (!content) {
          result.results.push({ id: contentId, success: false, error: 'Content not found' });
          result.failed++;
          continue;
        }

        await (Model.findByIdAndUpdate as any)(contentId, {
          status: 'published',
          publishedAt: content.publishedAt || new Date()
        });

        // Create version
        await ContentVersioningService.createVersion(
          contentId,
          this.getContentTypeFromModel(Model),
          userId,
          'update',
          'Bulk published'
        );

        result.results.push({ id: contentId, success: true });
        result.success++;
      } catch (error) {
        result.results.push({ id: contentId, success: false, error: error instanceof Error ? error.message : 'Unknown error' });
        result.errors.push(`Error publishing ${contentId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        result.failed++;
      }
    }

    return result;
  }

  private static async bulkUnpublish(
    operation: IBulkOperation,
    userId: mongoose.Types.ObjectId,
    result: IBulkResult
  ): Promise<IBulkResult> {
    for (const contentId of operation.contentIds) {
      try {
        const { Model } = await this.getContentModel(contentId, operation.contentType);
        
        await (Model.findByIdAndUpdate as any)(contentId, {
          status: 'draft',
          publishedAt: null
        });

        // Create version
        await ContentVersioningService.createVersion(
          contentId,
          this.getContentTypeFromModel(Model),
          userId,
          'update',
          'Bulk unpublished'
        );

        result.results.push({ id: contentId, success: true });
        result.success++;
      } catch (error) {
        result.results.push({ id: contentId, success: false, error: error instanceof Error ? error.message : 'Unknown error' });
        result.errors.push(`Error unpublishing ${contentId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        result.failed++;
      }
    }

    return result;
  }

  private static async bulkArchive(
    operation: IBulkOperation,
    userId: mongoose.Types.ObjectId,
    result: IBulkResult
  ): Promise<IBulkResult> {
    for (const contentId of operation.contentIds) {
      try {
        const { Model } = await this.getContentModel(contentId, operation.contentType);
        
        await (Model.findByIdAndUpdate as any)(contentId, { status: 'archived' });

        // Create version
        await ContentVersioningService.createVersion(
          contentId,
          this.getContentTypeFromModel(Model),
          userId,
          'update',
          'Bulk archived'
        );

        result.results.push({ id: contentId, success: true });
        result.success++;
      } catch (error) {
        result.results.push({ id: contentId, success: false, error: error instanceof Error ? error.message : 'Unknown error' });
        result.errors.push(`Error archiving ${contentId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        result.failed++;
      }
    }

    return result;
  }

  private static async bulkDelete(
    operation: IBulkOperation,
    userId: mongoose.Types.ObjectId,
    result: IBulkResult
  ): Promise<IBulkResult> {
    for (const contentId of operation.contentIds) {
      try {
        const { Model, content } = await this.getContentModel(contentId, operation.contentType);
        
        if (!content) {
          result.results.push({ id: contentId, success: false, error: 'Content not found' });
          result.failed++;
          continue;
        }

        await (Model.findByIdAndDelete as any)(contentId);
        result.results.push({ id: contentId, success: true });
        result.success++;
      } catch (error) {
        result.results.push({ id: contentId, success: false, error: error instanceof Error ? error.message : 'Unknown error' });
        result.errors.push(`Error deleting ${contentId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        result.failed++;
      }
    }

    return result;
  }

  private static async bulkUpdateCategories(
    operation: IBulkOperation,
    userId: mongoose.Types.ObjectId,
    result: IBulkResult
  ): Promise<IBulkResult> {
    const { operation: op, categories } = operation.parameters!;
    
    for (const contentId of operation.contentIds) {
      try {
        const { Model } = await this.getContentModel(contentId, operation.contentType);
        
        let updateQuery: any = {};
        
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

        await safeFindByIdAndUpdate(Model, contentId, updateQuery);

        // Create version
        await ContentVersioningService.createVersion(
          contentId,
          this.getContentTypeFromModel(Model),
          userId,
          'update',
          `Bulk categories ${op}`
        );

        result.results.push({ id: contentId, success: true });
        result.success++;
      } catch (error) {
        result.results.push({ id: contentId, success: false, error: error instanceof Error ? error.message : 'Unknown error' });
        result.errors.push(`Error updating categories for ${contentId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        result.failed++;
      }
    }

    return result;
  }

  private static async bulkUpdateTags(
    operation: IBulkOperation,
    userId: mongoose.Types.ObjectId,
    result: IBulkResult
  ): Promise<IBulkResult> {
    const { operation: op, tags } = operation.parameters!;
    
    for (const contentId of operation.contentIds) {
      try {
        const { Model } = await this.getContentModel(contentId, operation.contentType);
        
        let updateQuery: any = {};
        
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

        await safeFindByIdAndUpdate(Model, contentId, updateQuery);

        // Create version
        await ContentVersioningService.createVersion(
          contentId,
          this.getContentTypeFromModel(Model),
          userId,
          'update',
          `Bulk tags ${op}`
        );

        result.results.push({ id: contentId, success: true });
        result.success++;
      } catch (error) {
        result.results.push({ id: contentId, success: false, error: error instanceof Error ? error.message : 'Unknown error' });
        result.errors.push(`Error updating tags for ${contentId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        result.failed++;
      }
    }

    return result;
  }

  private static async bulkSchedulePublish(
    operation: IBulkOperation,
    userId: mongoose.Types.ObjectId,
    result: IBulkResult
  ): Promise<IBulkResult> {
    const { scheduledAt, notifyUsers, emailNotification } = operation.parameters!;
    
    for (const contentId of operation.contentIds) {
      try {
        const { content } = await this.getContentModel(contentId, operation.contentType);
        
        if (!content) {
          result.results.push({ id: contentId, success: false, error: 'Content not found' });
          result.failed++;
          continue;
        }

        const contentType = this.determineContentType(content);
        
        await ContentSchedulingService.scheduleAction(
          contentId,
          contentType,
          userId,
          {
            scheduledAt: new Date(scheduledAt),
            action: 'publish',
            targetStatus: 'published',
            notifyUsers: notifyUsers || [],
            emailNotification: emailNotification || false,
            socialMediaPost: false
          }
        );

        result.results.push({ id: contentId, success: true });
        result.success++;
      } catch (error) {
        result.results.push({ id: contentId, success: false, error: error instanceof Error ? error.message : 'Unknown error' });
        result.errors.push(`Error scheduling ${contentId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        result.failed++;
      }
    }

    return result;
  }

  // Helper methods would continue...
  private static async getContentModel(contentId: mongoose.Types.ObjectId, contentType: string) {
    if (contentType === 'mixed') {
      // Try Post first, then Page
      let content = await (Post.findById as any)(contentId);
      if (content) return { Model: Post, content };
      
      content = await (Page.findById as any)(contentId);
      return { Model: Page, content };
    } else {
      const Model = contentType === 'post' ? Post : Page;
      const content = await safeFindById(Model, contentId);
      return { Model, content };
    }
  }

  private static getContentTypeFromModel(Model: any): 'post' | 'page' {
    return Model.modelName === 'Post' ? 'post' : 'page';
  }

  private static determineContentType(content: any): 'post' | 'page' {
    return content.constructor.modelName === 'Post' ? 'post' : 'page';
  }

  private static async bulkUpdateAuthor(operation: IBulkOperation, userId: mongoose.Types.ObjectId, result: IBulkResult) {
    // Implementation for bulk author update
    return result;
  }

  private static async bulkDuplicate(operation: IBulkOperation, userId: mongoose.Types.ObjectId, result: IBulkResult) {
    // Implementation for bulk duplication
    return result;
  }

  private static async bulkExport(operation: IBulkOperation, userId: mongoose.Types.ObjectId, result: IBulkResult) {
    // Implementation for bulk export
    return result;
  }
}

export default BulkActionsService;