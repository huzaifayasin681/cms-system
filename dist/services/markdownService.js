"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MarkdownService = void 0;
const Post_1 = __importDefault(require("../models/Post"));
const Page_1 = __importDefault(require("../models/Page"));
const Category_1 = __importDefault(require("../models/Category"));
const Tag_1 = __importDefault(require("../models/Tag"));
const mongooseHelper_1 = require("../utils/mongooseHelper");
class MarkdownService {
    static parseMarkdown(markdownContent) {
        const frontMatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
        const match = markdownContent.match(frontMatterRegex);
        if (!match) {
            return {
                frontMatter: { title: 'Untitled' },
                content: markdownContent,
                rawContent: markdownContent
            };
        }
        const [, frontMatterStr, content] = match;
        const frontMatter = this.parseFrontMatter(frontMatterStr);
        return {
            frontMatter,
            content: content.trim(),
            rawContent: markdownContent
        };
    }
    static parseFrontMatter(frontMatterStr) {
        const lines = frontMatterStr.trim().split('\n');
        const frontMatter = { title: 'Untitled' };
        for (const line of lines) {
            const [key, ...valueParts] = line.split(':');
            if (key && valueParts.length > 0) {
                const cleanKey = key.trim();
                let value = valueParts.join(':').trim();
                if ((value.startsWith('"') && value.endsWith('"')) ||
                    (value.startsWith("'") && value.endsWith("'"))) {
                    value = value.slice(1, -1);
                }
                if (value.startsWith('[') && value.endsWith(']')) {
                    const arrayStr = value.slice(1, -1);
                    frontMatter[cleanKey] = arrayStr.split(',').map(item => item.trim().replace(/"/g, ''));
                }
                else if (value.toLowerCase() === 'true') {
                    frontMatter[cleanKey] = true;
                }
                else if (value.toLowerCase() === 'false') {
                    frontMatter[cleanKey] = false;
                }
                else if (!isNaN(Number(value)) && value !== '') {
                    frontMatter[cleanKey] = Number(value);
                }
                else {
                    frontMatter[cleanKey] = value;
                }
            }
        }
        return frontMatter;
    }
    static markdownToHtml(markdown) {
        let html = markdown;
        html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
        html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
        html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
        html = html.replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>');
        html = html.replace(/__(.*?)__/gim, '<strong>$1</strong>');
        html = html.replace(/\*(.*?)\*/gim, '<em>$1</em>');
        html = html.replace(/_(.*?)_/gim, '<em>$1</em>');
        html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2">$1</a>');
        html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/gim, '<img alt="$1" src="$2" />');
        html = html.replace(/```([\s\S]*?)```/gim, '<pre><code>$1</code></pre>');
        html = html.replace(/`([^`]+)`/gim, '<code>$1</code>');
        html = html.replace(/\n\n/gim, '</p><p>');
        html = html.replace(/\n/gim, '<br>');
        html = `<p>${html}</p>`;
        html = html.replace(/<p><\/p>/gim, '');
        html = html.replace(/<p><(h[1-6]|pre|blockquote)>/gim, '<$1>');
        html = html.replace(/<\/(h[1-6]|pre|blockquote)><\/p>/gim, '</$1>');
        return html;
    }
    static htmlToMarkdown(html) {
        let markdown = html;
        markdown = markdown.replace(/<h1>(.*?)<\/h1>/gim, '# $1\n\n');
        markdown = markdown.replace(/<h2>(.*?)<\/h2>/gim, '## $1\n\n');
        markdown = markdown.replace(/<h3>(.*?)<\/h3>/gim, '### $1\n\n');
        markdown = markdown.replace(/<h4>(.*?)<\/h4>/gim, '#### $1\n\n');
        markdown = markdown.replace(/<h5>(.*?)<\/h5>/gim, '##### $1\n\n');
        markdown = markdown.replace(/<h6>(.*?)<\/h6>/gim, '###### $1\n\n');
        markdown = markdown.replace(/<strong>(.*?)<\/strong>/gim, '**$1**');
        markdown = markdown.replace(/<b>(.*?)<\/b>/gim, '**$1**');
        markdown = markdown.replace(/<em>(.*?)<\/em>/gim, '*$1*');
        markdown = markdown.replace(/<i>(.*?)<\/i>/gim, '*$1*');
        markdown = markdown.replace(/<a[^>]+href="([^"]*)"[^>]*>(.*?)<\/a>/gim, '[$2]($1)');
        markdown = markdown.replace(/<img[^>]+src="([^"]*)"[^>]*alt="([^"]*)"[^>]*\/?>/gim, '![$2]($1)');
        markdown = markdown.replace(/<img[^>]+alt="([^"]*)"[^>]*src="([^"]*)"[^>]*\/?>/gim, '![$1]($2)');
        markdown = markdown.replace(/<img[^>]+src="([^"]*)"[^>]*\/?>/gim, '![]($1)');
        markdown = markdown.replace(/<pre><code>([\s\S]*?)<\/code><\/pre>/gim, '```\n$1\n```');
        markdown = markdown.replace(/<code>(.*?)<\/code>/gim, '`$1`');
        markdown = markdown.replace(/<br\s*\/?>/gim, '\n');
        markdown = markdown.replace(/<\/p>\s*<p>/gim, '\n\n');
        markdown = markdown.replace(/<p>/gim, '');
        markdown = markdown.replace(/<\/p>/gim, '\n\n');
        markdown = markdown.replace(/<ul>/gim, '');
        markdown = markdown.replace(/<\/ul>/gim, '\n');
        markdown = markdown.replace(/<ol>/gim, '');
        markdown = markdown.replace(/<\/ol>/gim, '\n');
        markdown = markdown.replace(/<li>(.*?)<\/li>/gim, '- $1\n');
        markdown = markdown.replace(/\n{3,}/gim, '\n\n');
        markdown = markdown.trim();
        return markdown;
    }
    static generateFrontMatter(content, contentType, categories = [], tags = []) {
        const frontMatter = {
            title: content.title,
            slug: content.slug,
            status: content.status,
            createdAt: content.createdAt?.toISOString(),
            updatedAt: content.updatedAt?.toISOString()
        };
        if (content.excerpt)
            frontMatter.excerpt = content.excerpt;
        if (content.featuredImage)
            frontMatter.featuredImage = content.featuredImage;
        if (content.seoTitle)
            frontMatter.seoTitle = content.seoTitle;
        if (content.seoDescription)
            frontMatter.seoDescription = content.seoDescription;
        if (content.seoKeywords?.length > 0)
            frontMatter.seoKeywords = content.seoKeywords;
        if (content.publishedAt)
            frontMatter.publishedAt = content.publishedAt.toISOString();
        if (categories.length > 0) {
            frontMatter.categories = categories.map(cat => cat.name);
        }
        if (tags.length > 0) {
            frontMatter.tags = tags.map(tag => tag.name);
        }
        if (contentType === 'page') {
            if (content.template)
                frontMatter.template = content.template;
            if (content.isHomePage)
                frontMatter.isHomePage = content.isHomePage;
            if (content.showInMenu !== undefined)
                frontMatter.showInMenu = content.showInMenu;
            if (content.menuOrder)
                frontMatter.menuOrder = content.menuOrder;
        }
        if (content.customFields && Object.keys(content.customFields).length > 0) {
            Object.assign(frontMatter, content.customFields);
        }
        const yamlLines = [];
        for (const [key, value] of Object.entries(frontMatter)) {
            if (Array.isArray(value)) {
                yamlLines.push(`${key}: [${value.map(v => `"${v}"`).join(', ')}]`);
            }
            else if (typeof value === 'string') {
                yamlLines.push(`${key}: "${value}"`);
            }
            else {
                yamlLines.push(`${key}: ${value}`);
            }
        }
        return `---\n${yamlLines.join('\n')}\n---\n`;
    }
    static async importFromMarkdown(files, userId, options = {}) {
        const { contentType = 'auto', overwrite = false, createMissingCategories = true, createMissingTags = true } = options;
        const result = {
            success: 0,
            failed: 0,
            errors: [],
            imported: []
        };
        for (const file of files) {
            try {
                const parsed = this.parseMarkdown(file.content);
                const { frontMatter, content } = parsed;
                let typeToCreate = contentType;
                if (contentType === 'auto') {
                    typeToCreate = (frontMatter.template ||
                        file.filename.includes('page') ||
                        frontMatter.isHomePage) ? 'page' : 'post';
                }
                if (!frontMatter.slug) {
                    frontMatter.slug = this.generateSlug(frontMatter.title);
                }
                const Model = typeToCreate === 'post' ? Post_1.default : Page_1.default;
                const existing = await (0, mongooseHelper_1.safeFindOne)(Model, { slug: frontMatter.slug });
                if (existing && !overwrite) {
                    result.errors.push(`Content with slug "${frontMatter.slug}" already exists`);
                    result.failed++;
                    continue;
                }
                const [categoryIds, tagIds] = await Promise.all([
                    this.processCategories(frontMatter.categories || [], userId, createMissingCategories),
                    this.processTags(frontMatter.tags || [], userId, createMissingTags)
                ]);
                const htmlContent = this.markdownToHtml(content);
                const contentData = {
                    title: frontMatter.title,
                    slug: frontMatter.slug,
                    content: htmlContent,
                    excerpt: frontMatter.excerpt,
                    author: userId,
                    status: frontMatter.status || 'draft',
                    featuredImage: frontMatter.featuredImage,
                    categories: categoryIds,
                    tags: tagIds,
                    seoTitle: frontMatter.seoTitle,
                    seoDescription: frontMatter.seoDescription,
                    seoKeywords: frontMatter.seoKeywords || [],
                    customFields: {},
                    version: 1
                };
                if (frontMatter.publishedAt) {
                    contentData.publishedAt = new Date(frontMatter.publishedAt);
                }
                if (typeToCreate === 'page') {
                    contentData.template = frontMatter.template || 'default';
                    contentData.isHomePage = frontMatter.isHomePage || false;
                    contentData.showInMenu = frontMatter.showInMenu !== false;
                    contentData.menuOrder = frontMatter.menuOrder || 0;
                }
                const reservedFields = [
                    'title', 'slug', 'excerpt', 'status', 'publishedAt', 'featuredImage',
                    'categories', 'tags', 'seoTitle', 'seoDescription', 'seoKeywords',
                    'template', 'isHomePage', 'showInMenu', 'menuOrder'
                ];
                for (const [key, value] of Object.entries(frontMatter)) {
                    if (!reservedFields.includes(key)) {
                        contentData.customFields[key] = value;
                    }
                }
                let savedContent;
                if (existing && overwrite) {
                    savedContent = await (0, mongooseHelper_1.safeFindByIdAndUpdate)(Model, existing._id, contentData, { new: true });
                }
                else {
                    savedContent = new Model(contentData);
                    await savedContent.save();
                }
                result.success++;
                result.imported.push({
                    title: savedContent.title,
                    slug: savedContent.slug,
                    type: typeToCreate,
                    id: savedContent._id
                });
            }
            catch (error) {
                result.failed++;
                result.errors.push(`Error processing ${file.filename}: ${error.message}`);
            }
        }
        return result;
    }
    static async exportToMarkdown(contentIds, contentType) {
        const files = [];
        for (const contentId of contentIds) {
            try {
                let content, categories, tags, type;
                if (contentType === 'mixed') {
                    content = await Post_1.default.findById(contentId).populate('categories tags author');
                    if (content) {
                        type = 'post';
                    }
                    else {
                        content = await Page_1.default.findById(contentId).populate('categories tags author');
                        type = 'page';
                    }
                }
                else {
                    const Model = contentType === 'post' ? Post_1.default : Page_1.default;
                    content = await (0, mongooseHelper_1.safeFindById)(Model, contentId).populate('categories tags author');
                    type = contentType;
                }
                if (!content)
                    continue;
                categories = content.categories || [];
                tags = content.tags || [];
                const frontMatter = this.generateFrontMatter(content, type, categories, tags);
                const markdownContent = this.htmlToMarkdown(content.content);
                const fullContent = `${frontMatter}\n${markdownContent}`;
                const filename = `${content.slug || this.generateSlug(content.title)}.md`;
                files.push({
                    filename,
                    content: fullContent
                });
            }
            catch (error) {
                console.error(`Error exporting content ${contentId}:`, error);
            }
        }
        return files;
    }
    static async exportAllToMarkdown(options = {}) {
        const { includePages = true, includePosts = true, status = ['published'], authorId } = options;
        const filter = { status: { $in: status } };
        if (authorId)
            filter.author = authorId;
        const files = [];
        if (includePosts) {
            const posts = await Post_1.default.find(filter).populate('categories tags author');
            for (const post of posts) {
                const frontMatter = this.generateFrontMatter(post, 'post', post.categories, post.tags);
                const markdownContent = this.htmlToMarkdown(post.content);
                const fullContent = `${frontMatter}\n${markdownContent}`;
                files.push({
                    filename: `posts/${post.slug || this.generateSlug(post.title)}.md`,
                    content: fullContent,
                    type: 'post'
                });
            }
        }
        if (includePages) {
            const pages = await Page_1.default.find(filter).populate('categories tags author');
            for (const page of pages) {
                const frontMatter = this.generateFrontMatter(page, 'page', page.categories, page.tags);
                const markdownContent = this.htmlToMarkdown(page.content);
                const fullContent = `${frontMatter}\n${markdownContent}`;
                files.push({
                    filename: `pages/${page.slug || this.generateSlug(page.title)}.md`,
                    content: fullContent,
                    type: 'page'
                });
            }
        }
        return files;
    }
    static generateSlug(title) {
        return title
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim();
    }
    static async processCategories(categoryNames, userId, createMissing) {
        const categoryIds = [];
        for (const name of categoryNames) {
            let category = await Category_1.default.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
            if (!category && createMissing) {
                category = new Category_1.default({
                    name,
                    slug: this.generateSlug(name),
                    createdBy: userId
                });
                await category.save();
            }
            if (category) {
                categoryIds.push(category._id);
            }
        }
        return categoryIds;
    }
    static async processTags(tagNames, userId, createMissing) {
        const tagIds = [];
        for (const name of tagNames) {
            let tag = await Tag_1.default.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
            if (!tag && createMissing) {
                tag = new Tag_1.default({
                    name,
                    slug: this.generateSlug(name),
                    createdBy: userId
                });
                await tag.save();
            }
            if (tag) {
                tagIds.push(tag._id);
            }
        }
        return tagIds;
    }
}
exports.MarkdownService = MarkdownService;
exports.default = MarkdownService;
