"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContentVersioningService = void 0;
const ContentVersion_1 = __importDefault(require("../models/ContentVersion"));
const Post_1 = __importDefault(require("../models/Post"));
const Page_1 = __importDefault(require("../models/Page"));
const mongooseHelper_1 = require("../utils/mongooseHelper");
class ContentVersioningService {
    static async createVersion(contentId, contentType, userId, changeType, changeDescription) {
        try {
            const Model = contentType === 'post' ? Post_1.default : Page_1.default;
            const content = await (0, mongooseHelper_1.safeFindById)(Model, contentId);
            if (!content) {
                throw new Error(`${contentType} not found`);
            }
            const latestVersion = await ContentVersion_1.default.findOne({ contentId, contentType })
                .sort({ version: -1 });
            const newVersionNumber = latestVersion ? latestVersion.version + 1 : 1;
            const changedFields = this.getChangedFields(content, latestVersion);
            const cleanContent = content.content.replace(/<[^>]*>/g, ' ');
            const wordCount = cleanContent.split(/\s+/).length;
            const readingTime = Math.ceil(wordCount / 200);
            const version = new ContentVersion_1.default({
                contentId,
                contentType,
                version: newVersionNumber,
                title: content.title,
                content: content.content,
                excerpt: content.excerpt,
                slug: content.slug,
                seoTitle: content.seoTitle,
                seoDescription: content.seoDescription,
                seoKeywords: content.seoKeywords || [],
                featuredImage: content.featuredImage,
                categories: content.categories || [],
                tags: content.tags || [],
                customFields: content.customFields || {},
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
        }
        catch (error) {
            throw new Error(`Failed to create version: ${error.message}`);
        }
    }
    static async getVersionHistory(contentId, contentType, limit = 20, offset = 0) {
        try {
            const versions = await ContentVersion_1.default.find({ contentId, contentType })
                .sort({ version: -1 })
                .limit(limit)
                .skip(offset)
                .populate('createdBy', 'username email firstName lastName')
                .lean();
            const total = await ContentVersion_1.default.countDocuments({ contentId, contentType });
            return {
                versions,
                total,
                hasMore: (offset + limit) < total
            };
        }
        catch (error) {
            throw new Error(`Failed to get version history: ${error.message}`);
        }
    }
    static async getVersion(contentId, contentType, version) {
        try {
            const versionDoc = await ContentVersion_1.default.findOne({
                contentId,
                contentType,
                version
            }).populate('createdBy', 'username email firstName lastName');
            if (!versionDoc) {
                throw new Error('Version not found');
            }
            return versionDoc;
        }
        catch (error) {
            throw new Error(`Failed to get version: ${error.message}`);
        }
    }
    static async compareVersions(contentId, contentType, fromVersion, toVersion) {
        try {
            const [from, to] = await Promise.all([
                ContentVersion_1.default.findOne({ contentId, contentType, version: fromVersion }),
                ContentVersion_1.default.findOne({ contentId, contentType, version: toVersion })
            ]);
            if (!from || !to) {
                throw new Error('One or both versions not found');
            }
            return this.generateDiff(from.toObject(), to.toObject());
        }
        catch (error) {
            throw new Error(`Failed to compare versions: ${error.message}`);
        }
    }
    static async revertToVersion(contentId, contentType, targetVersion, userId) {
        try {
            const targetVersionDoc = await ContentVersion_1.default.findOne({
                contentId,
                contentType,
                version: targetVersion
            });
            if (!targetVersionDoc) {
                throw new Error('Target version not found');
            }
            const Model = contentType === 'post' ? Post_1.default : Page_1.default;
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
            const updatedContent = await (0, mongooseHelper_1.safeFindByIdAndUpdate)(Model, contentId, updateData, { new: true, runValidators: true });
            if (!updatedContent) {
                throw new Error(`${contentType} not found`);
            }
            await this.createVersion(contentId, contentType, userId, 'revert', `Reverted to version ${targetVersion}`);
            return updatedContent;
        }
        catch (error) {
            throw new Error(`Failed to revert to version: ${error.message}`);
        }
    }
    static async cleanupOldVersions(contentId, contentType, keepCount = 10) {
        try {
            const versions = await ContentVersion_1.default.find({ contentId, contentType })
                .sort({ version: -1 })
                .skip(keepCount);
            if (versions.length > 0) {
                const versionIds = versions.map(v => v._id);
                await ContentVersion_1.default.deleteMany({ _id: { $in: versionIds } });
                return versions.length;
            }
            return 0;
        }
        catch (error) {
            throw new Error(`Failed to cleanup versions: ${error.message}`);
        }
    }
    static async getContentStats(contentId, contentType) {
        try {
            const stats = await ContentVersion_1.default.aggregate([
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
        }
        catch (error) {
            throw new Error(`Failed to get content stats: ${error.message}`);
        }
    }
    static getChangedFields(current, previous) {
        if (!previous)
            return ['title', 'content', 'excerpt', 'slug'];
        const changedFields = [];
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
    static generateDiff(from, to) {
        const diffs = [];
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
exports.ContentVersioningService = ContentVersioningService;
exports.default = ContentVersioningService;
