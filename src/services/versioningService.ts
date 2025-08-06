import mongoose from 'mongoose';
import ContentVersion from '../models/ContentVersion';
import Post from '../models/Post';
import Page from '../models/Page';
import { IPost } from '../models/Post';
import { IPage } from '../models/Page';

export interface IVersionDiff {
  field: string;
  oldValue: any;
  newValue: any;
  type: 'added' | 'removed' | 'modified';
}

export class ContentVersioningService {
  /**
   * Create a new version of content
   */
  static async createVersion(
    contentId: mongoose.Types.ObjectId,
    contentType: 'post' | 'page',
    userId: mongoose.Types.ObjectId,
    changeType: 'create' | 'update' | 'revert',
    changeDescription?: string
  ) {
    try {
      // Get the current content
      const Model = contentType === 'post' ? Post : Page;
      const content = await Model.findById(contentId);
      
      if (!content) {
        throw new Error(`${contentType} not found`);
      }

      // Get the latest version number
      const latestVersion = await ContentVersion.findOne({ contentId, contentType })
        .sort({ version: -1 });
      
      const newVersionNumber = latestVersion ? latestVersion.version + 1 : 1;

      // Identify changed fields
      const changedFields = this.getChangedFields(content, latestVersion);

      // Calculate reading time and word count
      const cleanContent = content.content.replace(/<[^>]*>/g, ' ');
      const wordCount = cleanContent.split(/\s+/).length;
      const readingTime = Math.ceil(wordCount / 200);

      // Create version record
      const version = new ContentVersion({
        contentId,
        contentType,
        version: newVersionNumber,
        title: content.title,
        content: content.content,
        excerpt: content.excerpt,
        slug: content.slug,
        seoTitle: content.seoTitle,
        seoDescription: content.seoDescription,
        seoKeywords: (content as any).seoKeywords || [],
        featuredImage: content.featuredImage,
        categories: (content as any).categories || [],
        tags: (content as any).tags || [],
        customFields: (content as any).customFields || {},
        status: content.status,
        metadata: {
          changeType,
          changeDescription,
          previousVersion: latestVersion?.version,
          changedFields,
          wordCount,
          readingTime
        },
        createdBy: userId
      });

      await version.save();
      return version;
    } catch (error) {
      throw new Error(`Failed to create version: ${error.message}`);
    }
  }

  /**
   * Get version history for content
   */
  static async getVersionHistory(
    contentId: mongoose.Types.ObjectId,
    contentType: 'post' | 'page',
    limit: number = 20,
    offset: number = 0
  ) {
    try {
      const versions = await ContentVersion.find({ contentId, contentType })
        .sort({ version: -1 })
        .limit(limit)
        .skip(offset)
        .populate('createdBy', 'username email firstName lastName')
        .lean();

      const total = await ContentVersion.countDocuments({ contentId, contentType });

      return {
        versions,
        total,
        hasMore: (offset + limit) < total
      };
    } catch (error) {
      throw new Error(`Failed to get version history: ${error.message}`);
    }
  }

  /**
   * Get specific version
   */
  static async getVersion(
    contentId: mongoose.Types.ObjectId,
    contentType: 'post' | 'page',
    version: number
  ) {
    try {
      const versionDoc = await ContentVersion.findOne({
        contentId,
        contentType,
        version
      }).populate('createdBy', 'username email firstName lastName');

      if (!versionDoc) {
        throw new Error('Version not found');
      }

      return versionDoc;
    } catch (error) {
      throw new Error(`Failed to get version: ${error.message}`);
    }
  }

  /**
   * Compare two versions
   */
  static async compareVersions(
    contentId: mongoose.Types.ObjectId,
    contentType: 'post' | 'page',
    fromVersion: number,
    toVersion: number
  ): Promise<IVersionDiff[]> {
    try {
      const [from, to] = await Promise.all([
        ContentVersion.findOne({ contentId, contentType, version: fromVersion }),
        ContentVersion.findOne({ contentId, contentType, version: toVersion })
      ]);

      if (!from || !to) {
        throw new Error('One or both versions not found');
      }

      return this.generateDiff(from.toObject(), to.toObject());
    } catch (error) {
      throw new Error(`Failed to compare versions: ${error.message}`);
    }
  }

  /**
   * Revert to a specific version
   */
  static async revertToVersion(
    contentId: mongoose.Types.ObjectId,
    contentType: 'post' | 'page',
    targetVersion: number,
    userId: mongoose.Types.ObjectId
  ) {
    try {
      // Get the target version
      const targetVersionDoc = await ContentVersion.findOne({
        contentId,
        contentType,
        version: targetVersion
      });

      if (!targetVersionDoc) {
        throw new Error('Target version not found');
      }

      // Update the current content
      const Model = contentType === 'post' ? Post : Page;
      const updateData = {
        title: targetVersionDoc.title,
        content: targetVersionDoc.content,
        excerpt: targetVersionDoc.excerpt,
        slug: targetVersionDoc.slug,
        seoTitle: targetVersionDoc.seoTitle,
        seoDescription: targetVersionDoc.seoDescription,
        seoKeywords: targetVersionDoc.seoKeywords,
        featuredImage: targetVersionDoc.featuredImage,
        categories: targetVersionDoc.categories,
        tags: targetVersionDoc.tags,
        customFields: targetVersionDoc.customFields,
        status: targetVersionDoc.status
      };

      const updatedContent = await Model.findByIdAndUpdate(
        contentId,
        updateData,
        { new: true, runValidators: true }
      );

      if (!updatedContent) {
        throw new Error(`${contentType} not found`);
      }

      // Create a new version record for the revert
      await this.createVersion(
        contentId,
        contentType,
        userId,
        'revert',
        `Reverted to version ${targetVersion}`
      );

      return updatedContent;
    } catch (error) {
      throw new Error(`Failed to revert to version: ${error.message}`);
    }
  }

  /**
   * Delete old versions (keep only the last N versions)
   */
  static async cleanupOldVersions(
    contentId: mongoose.Types.ObjectId,
    contentType: 'post' | 'page',
    keepCount: number = 10
  ) {
    try {
      const versions = await ContentVersion.find({ contentId, contentType })
        .sort({ version: -1 })
        .skip(keepCount);

      if (versions.length > 0) {
        const versionIds = versions.map(v => v._id);
        await ContentVersion.deleteMany({ _id: { $in: versionIds } });
        return versions.length;
      }

      return 0;
    } catch (error) {
      throw new Error(`Failed to cleanup versions: ${error.message}`);
    }
  }

  /**
   * Get content statistics
   */
  static async getContentStats(
    contentId: mongoose.Types.ObjectId,
    contentType: 'post' | 'page'
  ) {
    try {
      const stats = await ContentVersion.aggregate([
        { $match: { contentId, contentType } },
        {
          $group: {
            _id: null,
            totalVersions: { $sum: 1 },
            averageWordCount: { $avg: '$metadata.wordCount' },
            averageReadingTime: { $avg: '$metadata.readingTime' },
            firstVersion: { $min: '$createdAt' },
            lastVersion: { $max: '$createdAt' },
            contributors: { $addToSet: '$createdBy' }
          }
        }
      ]);

      return stats[0] || {
        totalVersions: 0,
        averageWordCount: 0,
        averageReadingTime: 0,
        firstVersion: null,
        lastVersion: null,
        contributors: []
      };
    } catch (error) {
      throw new Error(`Failed to get content stats: ${error.message}`);
    }
  }

  /**
   * Private helper methods
   */
  private static getChangedFields(current: any, previous: any): string[] {
    if (!previous) return ['title', 'content', 'excerpt', 'slug'];

    const changedFields: string[] = [];
    const fieldsToCheck = [
      'title', 'content', 'excerpt', 'slug', 'seoTitle', 'seoDescription',
      'seoKeywords', 'featuredImage', 'categories', 'tags', 'customFields', 'status'
    ];

    for (const field of fieldsToCheck) {
      const currentValue = JSON.stringify(current[field]);
      const previousValue = JSON.stringify(previous[field]);
      
      if (currentValue !== previousValue) {
        changedFields.push(field);
      }
    }

    return changedFields;
  }

  private static generateDiff(from: any, to: any): IVersionDiff[] {
    const diffs: IVersionDiff[] = [];
    const fieldsToCompare = [
      'title', 'content', 'excerpt', 'slug', 'seoTitle', 'seoDescription',
      'seoKeywords', 'featuredImage', 'status'
    ];

    for (const field of fieldsToCompare) {
      const fromValue = from[field];
      const toValue = to[field];

      if (JSON.stringify(fromValue) !== JSON.stringify(toValue)) {
        diffs.push({
          field,
          oldValue: fromValue,
          newValue: toValue,
          type: !fromValue ? 'added' : !toValue ? 'removed' : 'modified'
        });
      }
    }

    return diffs;
  }
}

export default ContentVersioningService;