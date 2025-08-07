"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getHomePage = exports.getMenuPages = exports.deletePage = exports.updatePage = exports.getPage = exports.getPages = exports.createPage = void 0;
const express_validator_1 = require("express-validator");
const Page_1 = __importDefault(require("../models/Page"));
const notificationService_1 = __importDefault(require("../services/notificationService"));
const createPage = async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation errors',
                errors: errors.array()
            });
        }
        const cleanedBody = { ...req.body };
        if (cleanedBody.parentPage === '')
            cleanedBody.parentPage = null;
        if (cleanedBody.customCss === '')
            cleanedBody.customCss = null;
        if (cleanedBody.customJs === '')
            cleanedBody.customJs = null;
        if (cleanedBody.seoTitle === '')
            cleanedBody.seoTitle = null;
        if (cleanedBody.seoDescription === '')
            cleanedBody.seoDescription = null;
        const pageData = {
            ...cleanedBody,
            author: req.user._id
        };
        if (pageData.isHomePage) {
            await Page_1.default.updateMany({ isHomePage: true }, { isHomePage: false });
        }
        const page = new Page_1.default(pageData);
        await page.save();
        await page.populate('author', 'username email firstName lastName avatar');
        try {
            if (pageData.status === 'published') {
                await notificationService_1.default.notifyPagePublished(page, req.user, req.app.get('websocketServer'));
            }
            else {
                await notificationService_1.default.notifyNewPage(page, req.user, req.app.get('websocketServer'));
            }
        }
        catch (notificationError) {
            console.error('Failed to send page notifications:', notificationError);
        }
        res.status(201).json({
            success: true,
            message: 'Page created successfully',
            page
        });
    }
    catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'Page with this slug already exists'
            });
        }
        console.error('Create page error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error creating page'
        });
    }
};
exports.createPage = createPage;
const getPages = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const { status, author, template, search, sortBy = 'menuOrder', sortOrder = 'asc' } = req.query;
        const filter = {};
        if (status) {
            filter.status = status;
        }
        if (author) {
            filter.author = author;
        }
        if (template) {
            filter.template = template;
        }
        if (search) {
            filter.$or = [
                { title: { $regex: search, $options: 'i' } },
                { content: { $regex: search, $options: 'i' } }
            ];
        }
        const sort = {};
        sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
        const [pages, total] = await Promise.all([
            Page_1.default.find(filter)
                .populate('author', 'username email firstName lastName avatar')
                .populate('parentPage', 'title slug')
                .sort(sort)
                .skip(skip)
                .limit(limit),
            Page_1.default.countDocuments(filter)
        ]);
        const totalPages = Math.ceil(total / limit);
        res.json({
            success: true,
            pages,
            pagination: {
                currentPage: page,
                totalPages,
                totalRecords: total,
                hasNext: page < totalPages,
                hasPrev: page > 1
            }
        });
    }
    catch (error) {
        console.error('Get pages error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching pages'
        });
    }
};
exports.getPages = getPages;
const getPage = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id || id === 'undefined' || id === 'null') {
            return res.status(400).json({
                success: false,
                message: 'Page ID is required'
            });
        }
        const isObjectId = /^[0-9a-fA-F]{24}$/.test(id);
        let query;
        if (isObjectId) {
            query = { $or: [{ _id: id }, { slug: id }] };
        }
        else {
            query = { slug: id };
        }
        const page = await Page_1.default.findOne(query)
            .populate('author', 'username email firstName lastName avatar')
            .populate('parentPage', 'title slug');
        if (!page) {
            return res.status(404).json({
                success: false,
                message: 'Page not found'
            });
        }
        page.views += 1;
        await page.save();
        res.json({
            success: true,
            page
        });
    }
    catch (error) {
        console.error('Get page error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching page'
        });
    }
};
exports.getPage = getPage;
const updatePage = async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation errors',
                errors: errors.array()
            });
        }
        const { id } = req.params;
        const page = await Page_1.default.findById(id);
        if (!page) {
            return res.status(404).json({
                success: false,
                message: 'Page not found'
            });
        }
        if (page.author.toString() !== req.user._id.toString() && req.user.role !== 'admin' && req.user.role !== 'superadmin') {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to update this page'
            });
        }
        if (req.body.isHomePage && !page.isHomePage) {
            await Page_1.default.updateMany({ isHomePage: true }, { isHomePage: false });
        }
        const cleanedBody = { ...req.body };
        if (cleanedBody.parentPage === '')
            cleanedBody.parentPage = null;
        if (cleanedBody.customCss === '')
            cleanedBody.customCss = null;
        if (cleanedBody.customJs === '')
            cleanedBody.customJs = null;
        if (cleanedBody.seoTitle === '')
            cleanedBody.seoTitle = null;
        if (cleanedBody.seoDescription === '')
            cleanedBody.seoDescription = null;
        const wasUnpublished = page.status !== 'published';
        const willBePublished = cleanedBody.status === 'published';
        if (cleanedBody.content && cleanedBody.content !== page.content) {
            page.contentHistory.push({
                content: page.content,
                savedAt: new Date(),
                savedBy: req.user._id
            });
        }
        Object.assign(page, cleanedBody);
        await page.save();
        await page.populate([
            { path: 'author', select: 'username email firstName lastName avatar' },
            { path: 'parentPage', select: 'title slug' }
        ]);
        if (wasUnpublished && willBePublished) {
            try {
                await notificationService_1.default.notifyPagePublished(page, req.user, req.app.get('websocketServer'));
            }
            catch (notificationError) {
                console.error('Failed to send page publication notifications:', notificationError);
            }
        }
        res.json({
            success: true,
            message: 'Page updated successfully',
            page
        });
    }
    catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'Page with this slug already exists'
            });
        }
        console.error('Update page error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error updating page'
        });
    }
};
exports.updatePage = updatePage;
const deletePage = async (req, res) => {
    try {
        const { id } = req.params;
        const page = await Page_1.default.findById(id);
        if (!page) {
            return res.status(404).json({
                success: false,
                message: 'Page not found'
            });
        }
        if (page.author.toString() !== req.user._id.toString() && req.user.role !== 'admin' && req.user.role !== 'superadmin') {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to delete this page'
            });
        }
        if (page.isHomePage) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete the homepage. Please set another page as homepage first.'
            });
        }
        await Page_1.default.findByIdAndDelete(id);
        res.json({
            success: true,
            message: 'Page deleted successfully'
        });
    }
    catch (error) {
        console.error('Delete page error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error deleting page'
        });
    }
};
exports.deletePage = deletePage;
const getMenuPages = async (req, res) => {
    try {
        console.log('🔥 getMenuPages API called!');
        const menuPages = await Page_1.default.find({
            status: 'published',
            showInMenu: true
        })
            .select('title slug parentPage menuOrder showInMenu')
            .populate('parentPage', 'title slug')
            .sort({ menuOrder: 1 });
        console.log('📊 Menu pages found:', menuPages.length);
        console.log('📋 Raw menu pages from DB:', menuPages.map(p => ({
            title: p.title,
            showInMenu: p.showInMenu,
            menuOrder: p.menuOrder,
            type: typeof p.showInMenu
        })));
        console.log('📤 Sending response with pages:', JSON.stringify(menuPages, null, 2));
        res.json({
            success: true,
            data: {
                pages: menuPages
            },
            debug: {
                timestamp: new Date().toISOString(),
                version: 'v2-clean-implementation'
            }
        });
    }
    catch (error) {
        console.error('Get menu pages error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching menu pages'
        });
    }
};
exports.getMenuPages = getMenuPages;
const getHomePage = async (req, res) => {
    try {
        const page = await Page_1.default.findOne({ isHomePage: true, status: 'published' })
            .populate('author', 'username email firstName lastName avatar');
        if (!page) {
            return res.status(404).json({
                success: false,
                message: 'Homepage not found'
            });
        }
        res.json({
            success: true,
            page
        });
    }
    catch (error) {
        console.error('Get homepage error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching homepage'
        });
    }
};
exports.getHomePage = getHomePage;
