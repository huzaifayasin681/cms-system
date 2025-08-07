"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.moveCategory = exports.getCategoryStats = exports.bulkDeleteCategories = exports.deleteCategory = exports.updateCategory = exports.createCategory = exports.getCategory = exports.getCategoryHierarchy = exports.getCategories = void 0;
const Category_1 = __importDefault(require("../models/Category"));
const Post_1 = __importDefault(require("../models/Post"));
const Page_1 = __importDefault(require("../models/Page"));
const getCategories = async (req, res) => {
    try {
        const { page = 1, limit = 20, search = '', isActive, parentId, sortBy = 'name', sortOrder = 'asc' } = req.query;
        const filter = {};
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
        const sortOptions = {};
        sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;
        const categories = await Category_1.default.find(filter)
            .populate('createdBy', 'username email firstName lastName')
            .populate('parent', 'name slug')
            .sort(sortOptions)
            .limit(parseInt(limit))
            .skip((parseInt(page) - 1) * parseInt(limit));
        const total = await Category_1.default.countDocuments(filter);
        res.json({
            categories,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                totalPages: Math.ceil(total / parseInt(limit))
            }
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching categories', error: error instanceof Error ? error.message : 'Unknown error' });
    }
};
exports.getCategories = getCategories;
const getCategoryHierarchy = async (req, res) => {
    try {
        const categories = await Category_1.default.find({ isActive: true })
            .populate('subcategories')
            .sort({ level: 1, sortOrder: 1, name: 1 });
        const hierarchy = categories.filter(cat => !cat.parentId).map(parent => ({
            ...parent.toObject(),
            children: categories.filter(cat => cat.parentId && cat.parentId.toString() === parent._id.toString()).map(child => ({
                ...child.toObject(),
                children: categories.filter(subcat => subcat.parentId && subcat.parentId.toString() === child._id.toString())
            }))
        }));
        res.json(hierarchy);
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching category hierarchy', error: error instanceof Error ? error.message : 'Unknown error' });
    }
};
exports.getCategoryHierarchy = getCategoryHierarchy;
const getCategory = async (req, res) => {
    try {
        const category = await Category_1.default.findById(req.params.id)
            .populate('createdBy', 'username email firstName lastName')
            .populate('parent', 'name slug')
            .populate('subcategories');
        if (!category) {
            return res.status(404).json({ message: 'Category not found' });
        }
        res.json(category);
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching category', error: error instanceof Error ? error.message : 'Unknown error' });
    }
};
exports.getCategory = getCategory;
const createCategory = async (req, res) => {
    try {
        const { name, description, color, icon, parentId } = req.body;
        const userId = req.user.id;
        const existingCategory = await Category_1.default.findOne({
            name: { $regex: new RegExp(`^${name}$`, 'i') }
        });
        if (existingCategory) {
            return res.status(400).json({ message: 'Category with this name already exists' });
        }
        const category = new Category_1.default({
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
    }
    catch (error) {
        res.status(500).json({ message: 'Error creating category', error: error instanceof Error ? error.message : 'Unknown error' });
    }
};
exports.createCategory = createCategory;
const updateCategory = async (req, res) => {
    try {
        const { name, description, color, icon, parentId, isActive, sortOrder } = req.body;
        if (name) {
            const existingCategory = await Category_1.default.findOne({
                name: { $regex: new RegExp(`^${name}$`, 'i') },
                _id: { $ne: req.params.id }
            });
            if (existingCategory) {
                return res.status(400).json({ message: 'Category with this name already exists' });
            }
        }
        if (parentId && parentId === req.params.id) {
            return res.status(400).json({ message: 'Category cannot be its own parent' });
        }
        const category = await Category_1.default.findByIdAndUpdate(req.params.id, {
            name,
            description,
            color,
            icon,
            parentId: parentId || null,
            isActive,
            sortOrder
        }, { new: true, runValidators: true }).populate('createdBy', 'username email firstName lastName');
        if (!category) {
            return res.status(404).json({ message: 'Category not found' });
        }
        res.json(category);
    }
    catch (error) {
        res.status(500).json({ message: 'Error updating category', error: error instanceof Error ? error.message : 'Unknown error' });
    }
};
exports.updateCategory = updateCategory;
const deleteCategory = async (req, res) => {
    try {
        const category = await Category_1.default.findById(req.params.id);
        if (!category) {
            return res.status(404).json({ message: 'Category not found' });
        }
        const subcategories = await Category_1.default.find({ parentId: req.params.id });
        if (subcategories.length > 0) {
            return res.status(400).json({
                message: 'Cannot delete category with subcategories. Delete subcategories first or move them to another parent.'
            });
        }
        const [postsCount, pagesCount] = await Promise.all([
            Post_1.default.countDocuments({ categories: req.params.id }),
            Page_1.default.countDocuments({ categories: req.params.id })
        ]);
        if (postsCount > 0 || pagesCount > 0) {
            return res.status(400).json({
                message: `Cannot delete category. It is used by ${postsCount} posts and ${pagesCount} pages.`
            });
        }
        await Category_1.default.findByIdAndDelete(req.params.id);
        res.json({ message: 'Category deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ message: 'Error deleting category', error: error instanceof Error ? error.message : 'Unknown error' });
    }
};
exports.deleteCategory = deleteCategory;
const bulkDeleteCategories = async (req, res) => {
    try {
        const { categoryIds } = req.body;
        if (!categoryIds || !Array.isArray(categoryIds) || categoryIds.length === 0) {
            return res.status(400).json({ message: 'Category IDs are required' });
        }
        const subcategoriesCount = await Category_1.default.countDocuments({
            parentId: { $in: categoryIds }
        });
        if (subcategoriesCount > 0) {
            return res.status(400).json({
                message: 'Cannot delete categories that have subcategories'
            });
        }
        const [postsCount, pagesCount] = await Promise.all([
            Post_1.default.countDocuments({ categories: { $in: categoryIds } }),
            Page_1.default.countDocuments({ categories: { $in: categoryIds } })
        ]);
        if (postsCount > 0 || pagesCount > 0) {
            return res.status(400).json({
                message: `Cannot delete categories. They are used by ${postsCount} posts and ${pagesCount} pages.`
            });
        }
        const result = await Category_1.default.deleteMany({ _id: { $in: categoryIds } });
        res.json({
            message: `${result.deletedCount} categories deleted successfully`,
            deletedCount: result.deletedCount
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Error deleting categories', error: error instanceof Error ? error.message : 'Unknown error' });
    }
};
exports.bulkDeleteCategories = bulkDeleteCategories;
const getCategoryStats = async (req, res) => {
    try {
        const categoryId = req.params.id;
        const [postsCount, pagesCount, subcategoriesCount] = await Promise.all([
            Post_1.default.countDocuments({ categories: categoryId }),
            Page_1.default.countDocuments({ categories: categoryId }),
            Category_1.default.countDocuments({ parentId: categoryId })
        ]);
        await Category_1.default.findByIdAndUpdate(categoryId, {
            postCount: postsCount,
            pageCount: pagesCount
        });
        res.json({
            postsCount,
            pagesCount,
            subcategoriesCount,
            totalContent: postsCount + pagesCount
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching category stats', error: error instanceof Error ? error.message : 'Unknown error' });
    }
};
exports.getCategoryStats = getCategoryStats;
const moveCategory = async (req, res) => {
    try {
        const { newParentId } = req.body;
        const categoryId = req.params.id;
        if (newParentId === categoryId) {
            return res.status(400).json({ message: 'Category cannot be its own parent' });
        }
        if (newParentId) {
            const wouldCreateCircle = await checkCircularRelationship(categoryId, newParentId);
            if (wouldCreateCircle) {
                return res.status(400).json({ message: 'This move would create a circular parent-child relationship' });
            }
        }
        const category = await Category_1.default.findByIdAndUpdate(categoryId, { parentId: newParentId || null }, { new: true, runValidators: true }).populate('createdBy', 'username email firstName lastName');
        if (!category) {
            return res.status(404).json({ message: 'Category not found' });
        }
        res.json(category);
    }
    catch (error) {
        res.status(500).json({ message: 'Error moving category', error: error instanceof Error ? error.message : 'Unknown error' });
    }
};
exports.moveCategory = moveCategory;
async function checkCircularRelationship(categoryId, newParentId) {
    let currentParent = newParentId;
    const visited = new Set();
    while (currentParent) {
        if (visited.has(currentParent) || currentParent === categoryId) {
            return true;
        }
        visited.add(currentParent);
        const parent = await Category_1.default.findById(currentParent);
        currentParent = parent?.parentId?.toString();
    }
    return false;
}
