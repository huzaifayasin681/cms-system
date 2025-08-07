import { Request, Response } from 'express';
import Category from '../models/Category';
import Post from '../models/Post';
import Page from '../models/Page';

// Get all categories
export const getCategories = async (req: Request, res: Response) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      search = '',
      isActive,
      parentId,
      sortBy = 'name',
      sortOrder = 'asc'
    } = req.query;

    const filter: any = {};
    
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    }

    if (parentId) {
      filter.parentId = parentId === 'null' ? null : parentId;
    }

    const sortOptions: any = {};
    sortOptions[sortBy as string] = sortOrder === 'desc' ? -1 : 1;

    const categories = await Category.find(filter)
      .populate('createdBy', 'username email firstName lastName')
      .populate('parent', 'name slug')
      .sort(sortOptions)
      .limit(parseInt(limit as string))
      .skip((parseInt(page as string) - 1) * parseInt(limit as string));

    const total = await Category.countDocuments(filter);

    res.json({
      categories,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        totalPages: Math.ceil(total / parseInt(limit as string))
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching categories', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

// Get category hierarchy
export const getCategoryHierarchy = async (req: Request, res: Response) => {
  try {
    const categories = await Category.find({ isActive: true })
      .populate('subcategories')
      .sort({ level: 1, sortOrder: 1, name: 1 });

    // Build hierarchy
    const hierarchy = categories.filter(cat => !cat.parentId).map(parent => ({
      ...parent.toObject(),
      children: categories.filter(cat => 
        cat.parentId && cat.parentId.toString() === (parent._id as any).toString()
      ).map(child => ({
        ...child.toObject(),
        children: categories.filter(subcat => 
          subcat.parentId && subcat.parentId.toString() === (child._id as any).toString()
        )
      }))
    }));

    res.json(hierarchy);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching category hierarchy', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

// Get single category
export const getCategory = async (req: Request, res: Response) => {
  try {
    const category = await Category.findById(req.params.id)
      .populate('createdBy', 'username email firstName lastName')
      .populate('parent', 'name slug')
      .populate('subcategories');

    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    res.json(category);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching category', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

// Create new category
export const createCategory = async (req: Request, res: Response) => {
  try {
    const { name, description, color, icon, parentId } = req.body;
    const userId = (req as any).user.id;

    // Check if category with same name exists
    const existingCategory = await Category.findOne({ 
      name: { $regex: new RegExp(`^${name}$`, 'i') } 
    });

    if (existingCategory) {
      return res.status(400).json({ message: 'Category with this name already exists' });
    }

    const category = new Category({
      name,
      description,
      color,
      icon,
      parentId: parentId || null,
      createdBy: userId
    });

    await category.save();
    await category.populate('createdBy', 'username email firstName lastName');

    res.status(201).json(category);
  } catch (error) {
    res.status(500).json({ message: 'Error creating category', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

// Update category
export const updateCategory = async (req: Request, res: Response) => {
  try {
    const { name, description, color, icon, parentId, isActive, sortOrder } = req.body;

    // Check if updating name to existing name
    if (name) {
      const existingCategory = await Category.findOne({ 
        name: { $regex: new RegExp(`^${name}$`, 'i') },
        _id: { $ne: req.params.id }
      });

      if (existingCategory) {
        return res.status(400).json({ message: 'Category with this name already exists' });
      }
    }

    // Prevent circular parent-child relationships
    if (parentId && parentId === req.params.id) {
      return res.status(400).json({ message: 'Category cannot be its own parent' });
    }

    const category = await Category.findByIdAndUpdate(
      req.params.id,
      {
        name,
        description,
        color,
        icon,
        parentId: parentId || null,
        isActive,
        sortOrder
      },
      { new: true, runValidators: true }
    ).populate('createdBy', 'username email firstName lastName');

    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    res.json(category);
  } catch (error) {
    res.status(500).json({ message: 'Error updating category', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

// Delete category
export const deleteCategory = async (req: Request, res: Response) => {
  try {
    const category = await Category.findById(req.params.id);
    
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    // Check if category has subcategories
    const subcategories = await Category.find({ parentId: req.params.id });
    if (subcategories.length > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete category with subcategories. Delete subcategories first or move them to another parent.' 
      });
    }

    // Check if category is used by posts or pages
    const [postsCount, pagesCount] = await Promise.all([
      Post.countDocuments({ categories: req.params.id }),
      Page.countDocuments({ categories: req.params.id })
    ]);

    if (postsCount > 0 || pagesCount > 0) {
      return res.status(400).json({ 
        message: `Cannot delete category. It is used by ${postsCount} posts and ${pagesCount} pages.` 
      });
    }

    await Category.findByIdAndDelete(req.params.id);
    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting category', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

// Bulk delete categories
export const bulkDeleteCategories = async (req: Request, res: Response) => {
  try {
    const { categoryIds } = req.body;

    if (!categoryIds || !Array.isArray(categoryIds) || categoryIds.length === 0) {
      return res.status(400).json({ message: 'Category IDs are required' });
    }

    // Check if any categories have subcategories
    const subcategoriesCount = await Category.countDocuments({ 
      parentId: { $in: categoryIds }
    });

    if (subcategoriesCount > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete categories that have subcategories' 
      });
    }

    // Check if categories are used by posts or pages
    const [postsCount, pagesCount] = await Promise.all([
      Post.countDocuments({ categories: { $in: categoryIds } }),
      Page.countDocuments({ categories: { $in: categoryIds } })
    ]);

    if (postsCount > 0 || pagesCount > 0) {
      return res.status(400).json({ 
        message: `Cannot delete categories. They are used by ${postsCount} posts and ${pagesCount} pages.` 
      });
    }

    const result = await Category.deleteMany({ _id: { $in: categoryIds } });
    res.json({ 
      message: `${result.deletedCount} categories deleted successfully`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting categories', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

// Get category statistics
export const getCategoryStats = async (req: Request, res: Response) => {
  try {
    const categoryId = req.params.id;

    const [postsCount, pagesCount, subcategoriesCount] = await Promise.all([
      Post.countDocuments({ categories: categoryId }),
      Page.countDocuments({ categories: categoryId }),
      Category.countDocuments({ parentId: categoryId })
    ]);

    // Update the counts in the category document
    await Category.findByIdAndUpdate(categoryId, {
      postCount: postsCount,
      pageCount: pagesCount
    });

    res.json({
      postsCount,
      pagesCount,
      subcategoriesCount,
      totalContent: postsCount + pagesCount
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching category stats', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

// Move category to different parent
export const moveCategory = async (req: Request, res: Response) => {
  try {
    const { newParentId } = req.body;
    const categoryId = req.params.id;

    // Prevent circular relationships
    if (newParentId === categoryId) {
      return res.status(400).json({ message: 'Category cannot be its own parent' });
    }

    // Check if new parent would create a circular relationship
    if (newParentId) {
      const wouldCreateCircle = await checkCircularRelationship(categoryId, newParentId);
      if (wouldCreateCircle) {
        return res.status(400).json({ message: 'This move would create a circular parent-child relationship' });
      }
    }

    const category = await Category.findByIdAndUpdate(
      categoryId,
      { parentId: newParentId || null },
      { new: true, runValidators: true }
    ).populate('createdBy', 'username email firstName lastName');

    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    res.json(category);
  } catch (error) {
    res.status(500).json({ message: 'Error moving category', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

// Helper function to check circular relationships
async function checkCircularRelationship(categoryId: string, newParentId: string): Promise<boolean> {
  let currentParent = newParentId;
  const visited = new Set();

  while (currentParent) {
    if (visited.has(currentParent) || currentParent === categoryId) {
      return true;
    }
    
    visited.add(currentParent);
    const parent = await Category.findById(currentParent);
    currentParent = parent?.parentId?.toString();
  }

  return false;
}