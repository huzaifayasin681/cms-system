import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import Page from '../models/Page';
import { AuthRequest } from '../middleware/auth';
import notificationService from '../services/notificationService';

export const createPage = async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    // Clean up empty string values for optional ObjectId fields
    const cleanedBody = { ...req.body };
    if (cleanedBody.parentPage === '') cleanedBody.parentPage = null;
    if (cleanedBody.customCss === '') cleanedBody.customCss = null;
    if (cleanedBody.customJs === '') cleanedBody.customJs = null;
    if (cleanedBody.seoTitle === '') cleanedBody.seoTitle = null;
    if (cleanedBody.seoDescription === '') cleanedBody.seoDescription = null;

    const pageData = {
      ...cleanedBody,
      author: req.user._id
    };

    // Check if setting as homepage
    if (pageData.isHomePage) {
      // Remove homepage status from other pages
      await Page.updateMany({ isHomePage: true }, { isHomePage: false });
    }

    const page = new Page(pageData);
    await page.save();
    await page.populate('author', 'username email firstName lastName avatar');

    // Send notifications for new page
    try {
      if (pageData.status === 'published') {
        await notificationService.notifyPagePublished(
          page,
          req.user,
          req.app.get('websocketServer')
        );
      } else {
        await notificationService.notifyNewPage(
          page,
          req.user,
          req.app.get('websocketServer')
        );
      }
    } catch (notificationError) {
      console.error('Failed to send page notifications:', notificationError);
      // Don't fail the entire request if notifications fail
    }

    res.status(201).json({
      success: true,
      message: 'Page created successfully',
      page
    });

  } catch (error: any) {
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

export const getPages = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;
    
    const { status, author, template, search, sortBy = 'menuOrder', sortOrder = 'asc' } = req.query;
    
    // Build filter object
    const filter: any = {};
    
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
    
    // Build sort object
    const sort: any = {};
    sort[sortBy as string] = sortOrder === 'desc' ? -1 : 1;
    
    const [pages, total] = await Promise.all([
      Page.find(filter)
        .populate('author', 'username email firstName lastName avatar')
        .populate('parentPage', 'title slug')
        .sort(sort)
        .skip(skip)
        .limit(limit),
      Page.countDocuments(filter)
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

  } catch (error) {
    console.error('Get pages error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching pages'
    });
  }
};

export const getPage = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Validate ID parameter
    if (!id || id === 'undefined' || id === 'null') {
      return res.status(400).json({
        success: false,
        message: 'Page ID is required'
      });
    }
    
    // Check if it's a valid ObjectId format (24 hex characters) or use as slug
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(id);
    
    let query;
    if (isObjectId) {
      query = { $or: [{ _id: id }, { slug: id }] };
    } else {
      query = { slug: id };
    }
    
    const page = await Page.findOne(query)
      .populate('author', 'username email firstName lastName avatar')
      .populate('parentPage', 'title slug');
    
    if (!page) {
      return res.status(404).json({
        success: false,
        message: 'Page not found'
      });
    }
    
    // Increment views
    page.views += 1;
    await page.save();
    
    res.json({
      success: true,
      page
    });

  } catch (error) {
    console.error('Get page error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching page'
    });
  }
};

export const updatePage = async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const page = await Page.findById(id);
    
    if (!page) {
      return res.status(404).json({
        success: false,
        message: 'Page not found'
      });
    }
    
    // Check permissions
    if (page.author.toString() !== req.user._id.toString() && req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this page'
      });
    }
    
    // Check if setting as homepage
    if (req.body.isHomePage && !page.isHomePage) {
      // Remove homepage status from other pages
      await Page.updateMany({ isHomePage: true }, { isHomePage: false });
    }
    
    // Clean up empty string values for optional ObjectId fields
    const cleanedBody = { ...req.body };
    if (cleanedBody.parentPage === '') cleanedBody.parentPage = null;
    if (cleanedBody.customCss === '') cleanedBody.customCss = null;
    if (cleanedBody.customJs === '') cleanedBody.customJs = null;
    if (cleanedBody.seoTitle === '') cleanedBody.seoTitle = null;
    if (cleanedBody.seoDescription === '') cleanedBody.seoDescription = null;
    
    // Check if page is being published (status changed from draft to published)
    const wasUnpublished = page.status !== 'published';
    const willBePublished = cleanedBody.status === 'published';
    
    // Save content history if content changed
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
    
    // Send notifications if page was just published
    if (wasUnpublished && willBePublished) {
      try {
        await notificationService.notifyPagePublished(
          page,
          req.user,
          req.app.get('websocketServer')
        );
      } catch (notificationError) {
        console.error('Failed to send page publication notifications:', notificationError);
        // Don't fail the entire request if notifications fail
      }
    }
    
    res.json({
      success: true,
      message: 'Page updated successfully',
      page
    });

  } catch (error: any) {
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

export const deletePage = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const page = await Page.findById(id);
    
    if (!page) {
      return res.status(404).json({
        success: false,
        message: 'Page not found'
      });
    }
    
    // Check permissions
    if (page.author.toString() !== req.user._id.toString() && req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this page'
      });
    }
    
    // Check if it's the homepage
    if (page.isHomePage) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete the homepage. Please set another page as homepage first.'
      });
    }
    
    await Page.findByIdAndDelete(id);
    
    res.json({
      success: true,
      message: 'Page deleted successfully'
    });

  } catch (error) {
    console.error('Delete page error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting page'
    });
  }
};

export const getMenuPages = async (req: Request, res: Response) => {
  try {
    console.log('🔥 getMenuPages API called!');
    
    // Get all published pages that should show in menu
    const menuPages = await Page.find({ 
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

  } catch (error) {
    console.error('Get menu pages error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching menu pages'
    });
  }
};

export const getHomePage = async (req: Request, res: Response) => {
  try {
    const page = await Page.findOne({ isHomePage: true, status: 'published' })
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

  } catch (error) {
    console.error('Get homepage error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching homepage'
    });
  }
};