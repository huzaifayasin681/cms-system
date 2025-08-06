import fs from 'fs/promises';
import path from 'path';
import mongoose from 'mongoose';
import Post from '../models/Post';
import Page from '../models/Page';
import Category from '../models/Category';
import Tag from '../models/Tag';

interface IMarkdownFrontMatter {
  title: string;
  slug?: string;
  excerpt?: string;
  author?: string;
  status?: 'draft' | 'published' | 'archived';
  publishedAt?: string;
  featuredImage?: string;
  categories?: string[];
  tags?: string[];
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string[];
  customFields?: Record<string, any>;
  template?: string;
  [key: string]: any;
}

interface IMarkdownContent {
  frontMatter: IMarkdownFrontMatter;
  content: string;
  rawContent: string;
}

interface IImportResult {
  success: number;
  failed: number;
  errors: string[];
  imported: Array<{
    title: string;
    slug: string;
    type: 'post' | 'page';
    id: mongoose.Types.ObjectId;
  }>;
}

export class MarkdownService {
  /**
   * Parse markdown file with frontmatter
   */
  static parseMarkdown(markdownContent: string): IMarkdownContent {
    const frontMatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
    const match = markdownContent.match(frontMatterRegex);

    if (!match) {
      // No frontmatter found, treat entire content as body
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

  /**
   * Parse YAML frontmatter
   */
  private static parseFrontMatter(frontMatterStr: string): IMarkdownFrontMatter {
    const lines = frontMatterStr.trim().split('\n');
    const frontMatter: any = { title: 'Untitled' };

    for (const line of lines) {
      const [key, ...valueParts] = line.split(':');
      if (key && valueParts.length > 0) {
        const cleanKey = key.trim();
        let value = valueParts.join(':').trim();

        // Remove quotes if present
        if ((value.startsWith('"') && value.endsWith('"')) || 
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }

        // Handle arrays
        if (value.startsWith('[') && value.endsWith(']')) {
          const arrayStr = value.slice(1, -1);
          frontMatter[cleanKey] = arrayStr.split(',').map(item => item.trim().replace(/"/g, ''));
        } else if (value.toLowerCase() === 'true') {
          frontMatter[cleanKey] = true;
        } else if (value.toLowerCase() === 'false') {
          frontMatter[cleanKey] = false;
        } else if (!isNaN(Number(value)) && value !== '') {
          frontMatter[cleanKey] = Number(value);
        } else {
          frontMatter[cleanKey] = value;
        }
      }
    }

    return frontMatter as IMarkdownFrontMatter;
  }

  /**
   * Convert markdown to HTML
   */
  static markdownToHtml(markdown: string): string {
    // Basic markdown to HTML conversion
    // You can enhance this with a proper markdown parser like marked or markdown-it
    
    let html = markdown;

    // Headers
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

    // Bold
    html = html.replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>');
    html = html.replace(/__(.*?)__/gim, '<strong>$1</strong>');

    // Italic
    html = html.replace(/\*(.*?)\*/gim, '<em>$1</em>');
    html = html.replace(/_(.*?)_/gim, '<em>$1</em>');

    // Links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2">$1</a>');

    // Images
    html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/gim, '<img alt="$1" src="$2" />');

    // Code blocks
    html = html.replace(/```([\s\S]*?)```/gim, '<pre><code>$1</code></pre>');
    html = html.replace(/`([^`]+)`/gim, '<code>$1</code>');

    // Line breaks
    html = html.replace(/\n\n/gim, '</p><p>');
    html = html.replace(/\n/gim, '<br>');

    // Wrap in paragraphs
    html = `<p>${html}</p>`;

    // Clean up empty paragraphs
    html = html.replace(/<p><\/p>/gim, '');
    html = html.replace(/<p><(h[1-6]|pre|blockquote)>/gim, '<$1>');
    html = html.replace(/<\/(h[1-6]|pre|blockquote)><\/p>/gim, '</$1>');

    return html;
  }

  /**
   * Convert HTML to markdown
   */
  static htmlToMarkdown(html: string): string {
    let markdown = html;

    // Headers
    markdown = markdown.replace(/<h1>(.*?)<\/h1>/gim, '# $1\n\n');
    markdown = markdown.replace(/<h2>(.*?)<\/h2>/gim, '## $1\n\n');
    markdown = markdown.replace(/<h3>(.*?)<\/h3>/gim, '### $1\n\n');
    markdown = markdown.replace(/<h4>(.*?)<\/h4>/gim, '#### $1\n\n');
    markdown = markdown.replace(/<h5>(.*?)<\/h5>/gim, '##### $1\n\n');
    markdown = markdown.replace(/<h6>(.*?)<\/h6>/gim, '###### $1\n\n');

    // Bold
    markdown = markdown.replace(/<strong>(.*?)<\/strong>/gim, '**$1**');
    markdown = markdown.replace(/<b>(.*?)<\/b>/gim, '**$1**');

    // Italic
    markdown = markdown.replace(/<em>(.*?)<\/em>/gim, '*$1*');
    markdown = markdown.replace(/<i>(.*?)<\/i>/gim, '*$1*');

    // Links
    markdown = markdown.replace(/<a[^>]+href="([^"]*)"[^>]*>(.*?)<\/a>/gim, '[$2]($1)');

    // Images
    markdown = markdown.replace(/<img[^>]+src="([^"]*)"[^>]*alt="([^"]*)"[^>]*\/?>/gim, '![$2]($1)');
    markdown = markdown.replace(/<img[^>]+alt="([^"]*)"[^>]*src="([^"]*)"[^>]*\/?>/gim, '![$1]($2)');
    markdown = markdown.replace(/<img[^>]+src="([^"]*)"[^>]*\/?>/gim, '![]($1)');

    // Code blocks
    markdown = markdown.replace(/<pre><code>([\s\S]*?)<\/code><\/pre>/gim, '```\n$1\n```');
    markdown = markdown.replace(/<code>(.*?)<\/code>/gim, '`$1`');

    // Line breaks and paragraphs
    markdown = markdown.replace(/<br\s*\/?>/gim, '\n');
    markdown = markdown.replace(/<\/p>\s*<p>/gim, '\n\n');
    markdown = markdown.replace(/<p>/gim, '');
    markdown = markdown.replace(/<\/p>/gim, '\n\n');

    // Lists
    markdown = markdown.replace(/<ul>/gim, '');
    markdown = markdown.replace(/<\/ul>/gim, '\n');
    markdown = markdown.replace(/<ol>/gim, '');
    markdown = markdown.replace(/<\/ol>/gim, '\n');
    markdown = markdown.replace(/<li>(.*?)<\/li>/gim, '- $1\n');

    // Clean up extra whitespace
    markdown = markdown.replace(/\n{3,}/gim, '\n\n');
    markdown = markdown.trim();

    return markdown;
  }

  /**
   * Generate frontmatter from content object
   */
  static generateFrontMatter(
    content: any,
    contentType: 'post' | 'page',
    categories: any[] = [],
    tags: any[] = []
  ): string {
    const frontMatter: any = {
      title: content.title,
      slug: content.slug,
      status: content.status,
      createdAt: content.createdAt?.toISOString(),
      updatedAt: content.updatedAt?.toISOString()
    };

    if (content.excerpt) frontMatter.excerpt = content.excerpt;
    if (content.featuredImage) frontMatter.featuredImage = content.featuredImage;
    if (content.seoTitle) frontMatter.seoTitle = content.seoTitle;
    if (content.seoDescription) frontMatter.seoDescription = content.seoDescription;
    if (content.seoKeywords?.length > 0) frontMatter.seoKeywords = content.seoKeywords;
    if (content.publishedAt) frontMatter.publishedAt = content.publishedAt.toISOString();

    // Add categories and tags
    if (categories.length > 0) {
      frontMatter.categories = categories.map(cat => cat.name);
    }
    if (tags.length > 0) {
      frontMatter.tags = tags.map(tag => tag.name);
    }

    // Add page-specific fields
    if (contentType === 'page') {
      if (content.template) frontMatter.template = content.template;
      if (content.isHomePage) frontMatter.isHomePage = content.isHomePage;
      if (content.showInMenu !== undefined) frontMatter.showInMenu = content.showInMenu;
      if (content.menuOrder) frontMatter.menuOrder = content.menuOrder;
    }

    // Add custom fields
    if (content.customFields && Object.keys(content.customFields).length > 0) {
      Object.assign(frontMatter, content.customFields);
    }

    // Convert to YAML format
    const yamlLines = [];
    for (const [key, value] of Object.entries(frontMatter)) {
      if (Array.isArray(value)) {
        yamlLines.push(`${key}: [${value.map(v => `"${v}"`).join(', ')}]`);
      } else if (typeof value === 'string') {
        yamlLines.push(`${key}: "${value}"`);
      } else {
        yamlLines.push(`${key}: ${value}`);
      }
    }

    return `---\n${yamlLines.join('\n')}\n---\n`;
  }

  /**
   * Import content from markdown files
   */
  static async importFromMarkdown(
    files: Array<{ filename: string; content: string }>,
    userId: mongoose.Types.ObjectId,
    options: {
      contentType?: 'post' | 'page' | 'auto';
      overwrite?: boolean;
      createMissingCategories?: boolean;
      createMissingTags?: boolean;
    } = {}
  ): Promise<IImportResult> {
    const {
      contentType = 'auto',
      overwrite = false,
      createMissingCategories = true,
      createMissingTags = true
    } = options;

    const result: IImportResult = {
      success: 0,
      failed: 0,
      errors: [],
      imported: []
    };

    for (const file of files) {
      try {
        const parsed = this.parseMarkdown(file.content);
        const { frontMatter, content } = parsed;

        // Determine content type
        let typeToCreate = contentType;
        if (contentType === 'auto') {
          typeToCreate = frontMatter.template || 
                        file.filename.includes('page') || 
                        frontMatter.isHomePage ? 'page' : 'post';
        }

        // Generate slug if not provided
        if (!frontMatter.slug) {
          frontMatter.slug = this.generateSlug(frontMatter.title);
        }

        // Check for existing content
        const Model = typeToCreate === 'post' ? Post : Page;
        const existing = await Model.findOne({ slug: frontMatter.slug });
        
        if (existing && !overwrite) {
          result.errors.push(`Content with slug "${frontMatter.slug}" already exists`);
          result.failed++;
          continue;
        }

        // Process categories and tags
        const [categoryIds, tagIds] = await Promise.all([
          this.processCategories(frontMatter.categories || [], userId, createMissingCategories),
          this.processTags(frontMatter.tags || [], userId, createMissingTags)
        ]);

        // Convert markdown to HTML
        const htmlContent = this.markdownToHtml(content);

        // Prepare content data
        const contentData: any = {
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

        // Add publish date if provided
        if (frontMatter.publishedAt) {
          contentData.publishedAt = new Date(frontMatter.publishedAt);
        }

        // Add page-specific fields
        if (typeToCreate === 'page') {
          contentData.template = frontMatter.template || 'default';
          contentData.isHomePage = frontMatter.isHomePage || false;
          contentData.showInMenu = frontMatter.showInMenu !== false;
          contentData.menuOrder = frontMatter.menuOrder || 0;
        }

        // Extract custom fields
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

        // Create or update content
        let savedContent;
        if (existing && overwrite) {
          savedContent = await Model.findByIdAndUpdate(existing._id, contentData, { new: true });
        } else {
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

      } catch (error) {
        result.failed++;
        result.errors.push(`Error processing ${file.filename}: ${error.message}`);
      }
    }

    return result;
  }

  /**
   * Export content to markdown
   */
  static async exportToMarkdown(
    contentIds: mongoose.Types.ObjectId[],
    contentType: 'post' | 'page' | 'mixed'
  ): Promise<Array<{ filename: string; content: string }>> {
    const files: Array<{ filename: string; content: string }> = [];

    for (const contentId of contentIds) {
      try {
        let content, categories, tags, type;

        // Determine content type and fetch content
        if (contentType === 'mixed') {
          // Try to find in both collections
          content = await Post.findById(contentId).populate('categories tags author');
          if (content) {
            type = 'post';
          } else {
            content = await Page.findById(contentId).populate('categories tags author');
            type = 'page';
          }
        } else {
          const Model = contentType === 'post' ? Post : Page;
          content = await Model.findById(contentId).populate('categories tags author');
          type = contentType;
        }

        if (!content) continue;

        categories = content.categories || [];
        tags = content.tags || [];

        // Generate frontmatter
        const frontMatter = this.generateFrontMatter(content, type, categories, tags);

        // Convert HTML content to markdown
        const markdownContent = this.htmlToMarkdown(content.content);

        // Combine frontmatter and content
        const fullContent = `${frontMatter}\n${markdownContent}`;

        // Generate filename
        const filename = `${content.slug || this.generateSlug(content.title)}.md`;

        files.push({
          filename,
          content: fullContent
        });

      } catch (error) {
        console.error(`Error exporting content ${contentId}:`, error);
      }
    }

    return files;
  }

  /**
   * Export all content to markdown
   */
  static async exportAllToMarkdown(
    options: {
      includePages?: boolean;
      includePosts?: boolean;
      status?: string[];
      authorId?: mongoose.Types.ObjectId;
    } = {}
  ) {
    const {
      includePages = true,
      includePosts = true,
      status = ['published'],
      authorId
    } = options;

    const filter: any = { status: { $in: status } };
    if (authorId) filter.author = authorId;

    const files: Array<{ filename: string; content: string; type: string }> = [];

    if (includePosts) {
      const posts = await Post.find(filter).populate('categories tags author');
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
      const pages = await Page.find(filter).populate('categories tags author');
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

  /**
   * Helper methods
   */
  private static generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }

  private static async processCategories(
    categoryNames: string[],
    userId: mongoose.Types.ObjectId,
    createMissing: boolean
  ): Promise<mongoose.Types.ObjectId[]> {
    const categoryIds: mongoose.Types.ObjectId[] = [];

    for (const name of categoryNames) {
      let category = await Category.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
      
      if (!category && createMissing) {
        category = new Category({
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

  private static async processTags(
    tagNames: string[],
    userId: mongoose.Types.ObjectId,
    createMissing: boolean
  ): Promise<mongoose.Types.ObjectId[]> {
    const tagIds: mongoose.Types.ObjectId[] = [];

    for (const name of tagNames) {
      let tag = await Tag.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
      
      if (!tag && createMissing) {
        tag = new Tag({
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

export default MarkdownService;