"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SEOService = void 0;
const Post_1 = __importDefault(require("../models/Post"));
const Page_1 = __importDefault(require("../models/Page"));
const Category_1 = __importDefault(require("../models/Category"));
const Tag_1 = __importDefault(require("../models/Tag"));
const mongooseHelper_1 = require("../utils/mongooseHelper");
class SEOService {
    static analyzeSEO(content, contentType) {
        const analysis = {
            score: 0,
            issues: [],
            suggestions: [],
            keywordDensity: {},
            readabilityScore: 0
        };
        let score = 0;
        const maxScore = 100;
        const titleAnalysis = this.analyzeTitle(content.title, content.seoTitle);
        analysis.issues.push(...titleAnalysis.issues);
        analysis.suggestions.push(...titleAnalysis.suggestions);
        score += titleAnalysis.score;
        const descAnalysis = this.analyzeDescription(content.excerpt, content.seoDescription);
        analysis.issues.push(...descAnalysis.issues);
        analysis.suggestions.push(...descAnalysis.suggestions);
        score += descAnalysis.score;
        const contentAnalysis = this.analyzeContent(content.content);
        analysis.issues.push(...contentAnalysis.issues);
        analysis.suggestions.push(...contentAnalysis.suggestions);
        analysis.keywordDensity = contentAnalysis.keywordDensity;
        analysis.readabilityScore = contentAnalysis.readabilityScore;
        score += contentAnalysis.score;
        const urlAnalysis = this.analyzeURL(content.slug);
        analysis.issues.push(...urlAnalysis.issues);
        analysis.suggestions.push(...urlAnalysis.suggestions);
        score += urlAnalysis.score;
        const imageAnalysis = this.analyzeImages(content.content, content.featuredImage);
        analysis.issues.push(...imageAnalysis.issues);
        analysis.suggestions.push(...imageAnalysis.suggestions);
        score += imageAnalysis.score;
        if (content.seoKeywords && content.seoKeywords.length > 0) {
            const keywordAnalysis = this.analyzeKeywords(content.seoKeywords, content.content, content.title);
            analysis.issues.push(...keywordAnalysis.issues);
            analysis.suggestions.push(...keywordAnalysis.suggestions);
            score += keywordAnalysis.score;
        }
        else {
            analysis.issues.push({
                type: 'warning',
                message: 'No SEO keywords defined',
                field: 'seoKeywords'
            });
        }
        analysis.score = Math.round((score / maxScore) * 100);
        return analysis;
    }
    static generateMetaTags(content, contentType, siteSettings = {}) {
        const tags = {};
        const siteUrl = process.env.FRONTEND_URL || 'https://example.com';
        const fullUrl = `${siteUrl}/${contentType === 'post' ? 'blog' : 'pages'}/${content.slug}`;
        tags.title = content.seoTitle || content.title;
        tags.description = content.seoDescription || content.excerpt || siteSettings.defaultMetaDescription || '';
        tags.canonical = fullUrl;
        tags.robots = content.status === 'published' ? 'index,follow' : 'noindex,nofollow';
        tags['og:title'] = tags.title;
        tags['og:description'] = tags.description;
        tags['og:url'] = fullUrl;
        tags['og:type'] = contentType === 'post' ? 'article' : 'website';
        tags['og:site_name'] = siteSettings.siteName || 'CMS Site';
        if (content.featuredImage) {
            tags['og:image'] = content.featuredImage;
            tags['og:image:alt'] = content.title;
        }
        if (contentType === 'post') {
            if (content.publishedAt) {
                tags['article:published_time'] = content.publishedAt.toISOString();
            }
            if (content.updatedAt) {
                tags['article:modified_time'] = content.updatedAt.toISOString();
            }
            if (content.author && content.author.username) {
                tags['article:author'] = content.author.username;
            }
        }
        tags['twitter:card'] = 'summary_large_image';
        tags['twitter:title'] = tags.title;
        tags['twitter:description'] = tags.description;
        if (siteSettings.twitterHandle) {
            tags['twitter:site'] = siteSettings.twitterHandle;
        }
        if (content.featuredImage) {
            tags['twitter:image'] = content.featuredImage;
        }
        if (content.seoKeywords && content.seoKeywords.length > 0) {
            tags.keywords = content.seoKeywords.join(', ');
        }
        return tags;
    }
    static async generateSitemap(siteUrl = process.env.FRONTEND_URL || 'https://example.com') {
        const entries = [];
        entries.push({
            url: siteUrl,
            lastmod: new Date().toISOString().split('T')[0],
            changefreq: 'daily',
            priority: 1.0
        });
        const posts = await Post_1.default.find({ status: 'published' })
            .select('slug updatedAt')
            .sort({ updatedAt: -1 });
        for (const post of posts) {
            entries.push({
                url: `${siteUrl}/blog/${post.slug}`,
                lastmod: post.updatedAt.toISOString().split('T')[0],
                changefreq: 'weekly',
                priority: 0.8
            });
        }
        const pages = await Page_1.default.find({ status: 'published' })
            .select('slug updatedAt')
            .sort({ updatedAt: -1 });
        for (const page of pages) {
            entries.push({
                url: `${siteUrl}/pages/${page.slug}`,
                lastmod: page.updatedAt.toISOString().split('T')[0],
                changefreq: 'monthly',
                priority: 0.6
            });
        }
        const categories = await Category_1.default.find({ isActive: true })
            .select('slug updatedAt')
            .sort({ updatedAt: -1 });
        for (const category of categories) {
            entries.push({
                url: `${siteUrl}/category/${category.slug}`,
                lastmod: category.updatedAt.toISOString().split('T')[0],
                changefreq: 'weekly',
                priority: 0.5
            });
        }
        const tags = await Tag_1.default.find({ isActive: true })
            .select('slug updatedAt')
            .sort({ updatedAt: -1 });
        for (const tag of tags) {
            entries.push({
                url: `${siteUrl}/tag/${tag.slug}`,
                lastmod: tag.updatedAt.toISOString().split('T')[0],
                changefreq: 'weekly',
                priority: 0.4
            });
        }
        let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
        xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
        for (const entry of entries) {
            xml += '  <url>\n';
            xml += `    <loc>${entry.url}</loc>\n`;
            xml += `    <lastmod>${entry.lastmod}</lastmod>\n`;
            xml += `    <changefreq>${entry.changefreq}</changefreq>\n`;
            xml += `    <priority>${entry.priority}</priority>\n`;
            xml += '  </url>\n';
        }
        xml += '</urlset>';
        return xml;
    }
    static generateRobotsTxt(siteUrl = process.env.FRONTEND_URL || 'https://example.com') {
        return this.DEFAULT_ROBOTS_CONTENT.replace('{{SITE_URL}}', siteUrl);
    }
    static async getSEORecommendations(contentId, contentType) {
        try {
            const Model = contentType === 'post' ? Post_1.default : Page_1.default;
            const content = await (0, mongooseHelper_1.safeFindById)(Model, contentId).populate('categories tags');
            if (!content) {
                throw new Error('Content not found');
            }
            const analysis = this.analyzeSEO(content, contentType);
            const recommendations = [];
            if (analysis.score < 70) {
                recommendations.push({
                    priority: 'high',
                    title: 'Improve SEO Score',
                    description: `Current SEO score is ${analysis.score}%. Focus on addressing the critical issues identified.`
                });
            }
            const criticalIssues = analysis.issues.filter(issue => issue.type === 'error');
            if (criticalIssues.length > 0) {
                recommendations.push({
                    priority: 'high',
                    title: 'Fix Critical SEO Issues',
                    description: `Address ${criticalIssues.length} critical SEO issues to improve visibility.`
                });
            }
            const mainKeywords = Object.keys(analysis.keywordDensity)
                .sort((a, b) => analysis.keywordDensity[b] - analysis.keywordDensity[a])
                .slice(0, 3);
            if (mainKeywords.length > 0) {
                recommendations.push({
                    priority: 'medium',
                    title: 'Optimize for Main Keywords',
                    description: `Focus on keywords: ${mainKeywords.join(', ')}. Current density: ${mainKeywords.map(k => `${k} (${analysis.keywordDensity[k].toFixed(1)}%)`).join(', ')}`
                });
            }
            if (analysis.readabilityScore < 60) {
                recommendations.push({
                    priority: 'medium',
                    title: 'Improve Content Readability',
                    description: 'Content readability can be improved. Consider shorter sentences and paragraphs.'
                });
            }
            return {
                analysis,
                recommendations,
                metaTags: this.generateMetaTags(content, contentType)
            };
        }
        catch (error) {
            throw new Error(`Failed to get SEO recommendations: ${error.message}`);
        }
    }
    static analyzeTitle(title, seoTitle) {
        const analysis = { score: 0, issues: [], suggestions: [] };
        const titleToCheck = seoTitle || title;
        if (!titleToCheck) {
            analysis.issues.push({
                type: 'error',
                message: 'Title is missing',
                field: 'title'
            });
            return analysis;
        }
        const titleLength = titleToCheck.length;
        if (titleLength < this.SEO_LIMITS.titleMin) {
            analysis.issues.push({
                type: 'warning',
                message: `Title is too short (${titleLength} characters). Aim for ${this.SEO_LIMITS.titleMin}-${this.SEO_LIMITS.titleMax} characters.`,
                field: 'seoTitle'
            });
            analysis.score += 10;
        }
        else if (titleLength > this.SEO_LIMITS.titleMax) {
            analysis.issues.push({
                type: 'warning',
                message: `Title is too long (${titleLength} characters). Keep it under ${this.SEO_LIMITS.titleMax} characters.`,
                field: 'seoTitle'
            });
            analysis.score += 15;
        }
        else {
            analysis.score += 25;
        }
        if (!seoTitle && title) {
            analysis.suggestions.push('Consider creating a custom SEO title optimized for search engines');
        }
        return analysis;
    }
    static analyzeDescription(excerpt, seoDescription) {
        const analysis = { score: 0, issues: [], suggestions: [] };
        const descToCheck = seoDescription || excerpt;
        if (!descToCheck) {
            analysis.issues.push({
                type: 'error',
                message: 'Meta description is missing',
                field: 'seoDescription'
            });
            return analysis;
        }
        const descLength = descToCheck.length;
        if (descLength < this.SEO_LIMITS.descriptionMin) {
            analysis.issues.push({
                type: 'warning',
                message: `Meta description is too short (${descLength} characters). Aim for ${this.SEO_LIMITS.descriptionMin}-${this.SEO_LIMITS.descriptionMax} characters.`,
                field: 'seoDescription'
            });
            analysis.score += 10;
        }
        else if (descLength > this.SEO_LIMITS.descriptionMax) {
            analysis.issues.push({
                type: 'warning',
                message: `Meta description is too long (${descLength} characters). Keep it under ${this.SEO_LIMITS.descriptionMax} characters.`,
                field: 'seoDescription'
            });
            analysis.score += 15;
        }
        else {
            analysis.score += 25;
        }
        return analysis;
    }
    static analyzeContent(content) {
        const analysis = {
            score: 0,
            issues: [],
            suggestions: [],
            keywordDensity: {},
            readabilityScore: 0
        };
        const plainText = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        const wordCount = plainText.split(' ').length;
        if (wordCount < 300) {
            analysis.issues.push({
                type: 'warning',
                message: `Content is quite short (${wordCount} words). Consider adding more valuable content.`,
                field: 'content'
            });
            analysis.score += 10;
        }
        else if (wordCount < 500) {
            analysis.score += 15;
        }
        else {
            analysis.score += 25;
        }
        analysis.keywordDensity = this.calculateKeywordDensity(plainText);
        analysis.readabilityScore = this.calculateReadabilityScore(plainText);
        const headingCount = (content.match(/<h[1-6][^>]*>/g) || []).length;
        if (headingCount === 0) {
            analysis.issues.push({
                type: 'suggestion',
                message: 'Consider adding headings (H1, H2, etc.) to improve content structure.',
                field: 'content'
            });
        }
        else {
            analysis.score += 5;
        }
        return analysis;
    }
    static analyzeURL(slug) {
        const analysis = { score: 0, issues: [], suggestions: [] };
        if (!slug) {
            analysis.issues.push({
                type: 'error',
                message: 'URL slug is missing',
                field: 'slug'
            });
            return analysis;
        }
        if (slug.length > this.SEO_LIMITS.urlMax) {
            analysis.issues.push({
                type: 'warning',
                message: `URL is too long (${slug.length} characters). Keep URLs concise and descriptive.`,
                field: 'slug'
            });
            analysis.score += 5;
        }
        else {
            analysis.score += 10;
        }
        if (!/^[a-z0-9-]+$/.test(slug)) {
            analysis.issues.push({
                type: 'suggestion',
                message: 'URL contains special characters. Use only lowercase letters, numbers, and hyphens.',
                field: 'slug'
            });
        }
        else {
            analysis.score += 5;
        }
        return analysis;
    }
    static analyzeImages(content, featuredImage) {
        const analysis = { score: 0, issues: [], suggestions: [] };
        if (!featuredImage) {
            analysis.issues.push({
                type: 'suggestion',
                message: 'Consider adding a featured image to improve social media sharing.',
                field: 'featuredImage'
            });
        }
        else {
            analysis.score += 10;
        }
        const images = content.match(/<img[^>]*>/g) || [];
        let imagesWithoutAlt = 0;
        images.forEach(img => {
            if (!img.includes('alt=') || img.includes('alt=""') || img.includes("alt=''")) {
                imagesWithoutAlt++;
            }
        });
        if (imagesWithoutAlt > 0) {
            analysis.issues.push({
                type: 'warning',
                message: `${imagesWithoutAlt} image(s) missing alt text. Add descriptive alt text for accessibility and SEO.`,
                field: 'content'
            });
        }
        else if (images.length > 0) {
            analysis.score += 5;
        }
        return analysis;
    }
    static analyzeKeywords(keywords, content, title) {
        const analysis = { score: 0, issues: [], suggestions: [] };
        const plainText = `${title} ${content}`.replace(/<[^>]*>/g, ' ').toLowerCase();
        if (keywords.length < this.SEO_LIMITS.keywordMin) {
            analysis.issues.push({
                type: 'suggestion',
                message: `Consider adding more keywords. You have ${keywords.length}, aim for ${this.SEO_LIMITS.keywordMin}-${this.SEO_LIMITS.keywordMax}.`,
                field: 'seoKeywords'
            });
        }
        else if (keywords.length > this.SEO_LIMITS.keywordMax) {
            analysis.issues.push({
                type: 'warning',
                message: `Too many keywords (${keywords.length}). Focus on ${this.SEO_LIMITS.keywordMax} or fewer targeted keywords.`,
                field: 'seoKeywords'
            });
        }
        else {
            analysis.score += 10;
        }
        let keywordsFound = 0;
        keywords.forEach(keyword => {
            if (plainText.includes(keyword.toLowerCase())) {
                keywordsFound++;
            }
        });
        if (keywordsFound === 0) {
            analysis.issues.push({
                type: 'error',
                message: 'None of the SEO keywords appear in the content or title.',
                field: 'seoKeywords'
            });
        }
        else if (keywordsFound < keywords.length / 2) {
            analysis.issues.push({
                type: 'warning',
                message: `Only ${keywordsFound} of ${keywords.length} keywords appear in the content.`,
                field: 'seoKeywords'
            });
            analysis.score += 5;
        }
        else {
            analysis.score += 10;
        }
        return analysis;
    }
    static calculateKeywordDensity(text) {
        const words = text.toLowerCase().match(/\b\w{3,}\b/g) || [];
        const wordCount = words.length;
        const frequency = {};
        words.forEach(word => {
            frequency[word] = (frequency[word] || 0) + 1;
        });
        const density = {};
        Object.keys(frequency).forEach(word => {
            const count = frequency[word];
            if (count > 1) {
                density[word] = (count / wordCount) * 100;
            }
        });
        return Object.keys(density)
            .sort((a, b) => density[b] - density[a])
            .slice(0, 10)
            .reduce((result, word) => {
            result[word] = density[word];
            return result;
        }, {});
    }
    static calculateReadabilityScore(text) {
        const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
        const words = text.match(/\b\w+\b/g) || [];
        const syllables = words.reduce((count, word) => count + SEOService.countSyllables(word), 0);
        if (sentences.length === 0 || words.length === 0)
            return 0;
        const avgWordsPerSentence = words.length / sentences.length;
        const avgSyllablesPerWord = syllables / words.length;
        const score = 206.835 - (1.015 * avgWordsPerSentence) - (84.6 * avgSyllablesPerWord);
        return Math.max(0, Math.min(100, score));
    }
    static countSyllables(word) {
        word = word.toLowerCase();
        if (word.length <= 3)
            return 1;
        let syllables = word.match(/[aeiouy]{1,2}/g);
        if (syllables) {
            let count = syllables.length;
            if (word.endsWith('e'))
                count--;
            if (word.endsWith('le') && word.length > 2)
                count++;
            return Math.max(1, count);
        }
        return 1;
    }
}
exports.SEOService = SEOService;
SEOService.DEFAULT_ROBOTS_CONTENT = `User-agent: *
Allow: /

Sitemap: {{SITE_URL}}/sitemap.xml`;
SEOService.SEO_LIMITS = {
    titleMin: 30,
    titleMax: 60,
    descriptionMin: 120,
    descriptionMax: 160,
    keywordMin: 3,
    keywordMax: 10,
    urlMax: 100
};
exports.default = SEOService;
