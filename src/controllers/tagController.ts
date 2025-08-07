import { Request, Response } from 'express';
import Tag from '../models/Tag';
import Post from '../models/Post';
import Page from '../models/Page';

// Get all tags
export const getTags = async (req: Request, res: Response) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      search = '',
      isActive,
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

    const sortOptions: any = {};
    
    if (sortBy === 'usage') {
      sortOptions.postCount = sortOrder === 'desc' ? -1 : 1;
    } else {
      sortOptions[sortBy as string] = sortOrder === 'desc' ? -1 : 1;
    }

    const tags = await Tag.find(filter)
      .populate('createdBy', 'username email firstName lastName')
      .sort(sortOptions)
      .limit(parseInt(limit as string))
      .skip((parseInt(page as string) - 1) * parseInt(limit as string));

    const total = await Tag.countDocuments(filter);

    res.json({
      tags,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        totalPages: Math.ceil(total / parseInt(limit as string))
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching tags', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

// Get popular tags
export const getPopularTags = async (req: Request, res: Response) => {
  try {
    const { limit = 20 } = req.query;

    const tags = await Tag.find({ isActive: true })
      .sort({ postCount: -1, pageCount: -1 })
      .limit(parseInt(limit as string))
      .select('name slug color postCount pageCount');

    res.json(tags);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching popular tags', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

// Get single tag
export const getTag = async (req: Request, res: Response) => {
  try {
    const tag = await Tag.findById(req.params.id)
      .populate('createdBy', 'username email firstName lastName');

    if (!tag) {
      return res.status(404).json({ message: 'Tag not found' });
    }

    res.json(tag);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching tag', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

// Get tag by slug
export const getTagBySlug = async (req: Request, res: Response) => {
  try {
    const tag = await Tag.findOne({ slug: req.params.slug })
      .populate('createdBy', 'username email firstName lastName');

    if (!tag) {
      return res.status(404).json({ message: 'Tag not found' });
    }

    res.json(tag);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching tag', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

// Create new tag
export const createTag = async (req: Request, res: Response) => {
  try {
    const { name, description, color } = req.body;
    const userId = (req as any).user.id;

    // Check if tag with same name exists
    const existingTag = await Tag.findOne({ 
      name: { $regex: new RegExp(`^${name}$`, 'i') } 
    });

    if (existingTag) {
      return res.status(400).json({ message: 'Tag with this name already exists' });
    }

    const tag = new Tag({
      name,
      description,
      color,
      createdBy: userId
    });

    await tag.save();
    await tag.populate('createdBy', 'username email firstName lastName');

    res.status(201).json(tag);
  } catch (error) {
    res.status(500).json({ message: 'Error creating tag', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

// Update tag
export const updateTag = async (req: Request, res: Response) => {
  try {
    const { name, description, color, isActive } = req.body;

    // Check if updating name to existing name
    if (name) {
      const existingTag = await Tag.findOne({ 
        name: { $regex: new RegExp(`^${name}$`, 'i') },
        _id: { $ne: req.params.id }
      });

      if (existingTag) {
        return res.status(400).json({ message: 'Tag with this name already exists' });
      }
    }

    const tag = await Tag.findByIdAndUpdate(
      req.params.id,
      { name, description, color, isActive },
      { new: true, runValidators: true }
    ).populate('createdBy', 'username email firstName lastName');

    if (!tag) {
      return res.status(404).json({ message: 'Tag not found' });
    }

    res.json(tag);
  } catch (error) {
    res.status(500).json({ message: 'Error updating tag', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

// Delete tag
export const deleteTag = async (req: Request, res: Response) => {
  try {
    const tag = await Tag.findById(req.params.id);
    
    if (!tag) {
      return res.status(404).json({ message: 'Tag not found' });
    }

    // Check if tag is used by posts or pages
    const [postsCount, pagesCount] = await Promise.all([
      Post.countDocuments({ tags: req.params.id }),
      Page.countDocuments({ tags: req.params.id })
    ]);

    if (postsCount > 0 || pagesCount > 0) {
      return res.status(400).json({ 
        message: `Cannot delete tag. It is used by ${postsCount} posts and ${pagesCount} pages.` 
      });
    }

    await Tag.findByIdAndDelete(req.params.id);
    res.json({ message: 'Tag deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting tag', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

// Bulk create tags
export const bulkCreateTags = async (req: Request, res: Response) => {
  try {
    const { tags } = req.body;
    const userId = (req as any).user.id;

    if (!tags || !Array.isArray(tags) || tags.length === 0) {
      return res.status(400).json({ message: 'Tags array is required' });
    }

    const createdTags = [];
    const errors = [];

    for (const tagData of tags) {
      try {
        const { name, description, color } = tagData;

        // Check if tag already exists
        const existingTag = await Tag.findOne({ 
          name: { $regex: new RegExp(`^${name}$`, 'i') } 
        });

        if (existingTag) {
          errors.push(`Tag "${name}" already exists`);
          continue;
        }

        const tag = new Tag({
          name,
          description,
          color,
          createdBy: userId
        });

        await tag.save();
        createdTags.push(tag);
      } catch (error) {
        errors.push(`Error creating tag "${tagData.name}": ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    res.status(201).json({
      message: `${createdTags.length} tags created successfully`,
      createdTags,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    res.status(500).json({ message: 'Error creating tags', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

// Bulk delete tags
export const bulkDeleteTags = async (req: Request, res: Response) => {
  try {
    const { tagIds } = req.body;

    if (!tagIds || !Array.isArray(tagIds) || tagIds.length === 0) {
      return res.status(400).json({ message: 'Tag IDs are required' });
    }

    // Check if tags are used by posts or pages
    const [postsCount, pagesCount] = await Promise.all([
      Post.countDocuments({ tags: { $in: tagIds } }),
      Page.countDocuments({ tags: { $in: tagIds } })
    ]);

    if (postsCount > 0 || pagesCount > 0) {
      return res.status(400).json({ 
        message: `Cannot delete tags. They are used by ${postsCount} posts and ${pagesCount} pages.` 
      });
    }

    const result = await Tag.deleteMany({ _id: { $in: tagIds } });
    res.json({ 
      message: `${result.deletedCount} tags deleted successfully`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting tags', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

// Merge tags
export const mergeTags = async (req: Request, res: Response) => {
  try {
    const { sourceTagIds, targetTagId } = req.body;

    if (!sourceTagIds || !Array.isArray(sourceTagIds) || !targetTagId) {
      return res.status(400).json({ message: 'Source tag IDs and target tag ID are required' });
    }

    const targetTag = await Tag.findById(targetTagId);
    if (!targetTag) {
      return res.status(404).json({ message: 'Target tag not found' });
    }

    // Update all posts and pages to use target tag instead of source tags
    await Promise.all([
      Post.updateMany(
        { tags: { $in: sourceTagIds } },
        { 
          $pull: { tags: { $in: sourceTagIds } },
          $addToSet: { tags: targetTagId }
        }
      ),
      Page.updateMany(
        { tags: { $in: sourceTagIds } },
        { 
          $pull: { tags: { $in: sourceTagIds } },
          $addToSet: { tags: targetTagId }
        }
      )
    ]);

    // Delete source tags
    const deleteResult = await Tag.deleteMany({ _id: { $in: sourceTagIds } });

    // Update target tag counts
    const [newPostCount, newPageCount] = await Promise.all([
      Post.countDocuments({ tags: targetTagId }),
      Page.countDocuments({ tags: targetTagId })
    ]);

    await Tag.findByIdAndUpdate(targetTagId, {
      postCount: newPostCount,
      pageCount: newPageCount
    });

    res.json({
      message: `Successfully merged ${deleteResult.deletedCount} tags into "${targetTag.name}"`,
      mergedCount: deleteResult.deletedCount,
      targetTag: targetTag.name
    });
  } catch (error) {
    res.status(500).json({ message: 'Error merging tags', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

// Get tag statistics
export const getTagStats = async (req: Request, res: Response) => {
  try {
    const tagId = req.params.id;

    const [postsCount, pagesCount] = await Promise.all([
      Post.countDocuments({ tags: tagId }),
      Page.countDocuments({ tags: tagId })
    ]);

    // Update the counts in the tag document
    await Tag.findByIdAndUpdate(tagId, {
      postCount: postsCount,
      pageCount: pagesCount
    });

    res.json({
      postsCount,
      pagesCount,
      totalContent: postsCount + pagesCount
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching tag stats', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

// Auto-suggest tags based on content
export const suggestTags = async (req: Request, res: Response) => {
  try {
    const { content, title } = req.body;
    
    if (!content && !title) {
      return res.status(400).json({ message: 'Content or title is required' });
    }

    const text = `${title || ''} ${content || ''}`.toLowerCase();
    const words: string[] = text.match(/\b\w{3,}\b/g) || [];
    
    // Get frequency of words
    const wordFreq = words.reduce((acc: Record<string, number>, word: string) => {
      acc[word] = (acc[word] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Find existing tags that match frequent words
    const frequentWords = Object.keys(wordFreq)
      .sort((a, b) => wordFreq[b] - wordFreq[a])
      .slice(0, 20);

    const matchingTags = await Tag.find({
      name: { $in: frequentWords },
      isActive: true
    }).select('name slug color postCount').sort({ postCount: -1 });

    // Also suggest new tag names from frequent words
    const existingTagNames = matchingTags.map(tag => tag.name.toLowerCase());
    const suggestedNewTags = frequentWords
      .filter(word => 
        !existingTagNames.includes(word) && 
        word.length >= 3 && 
        wordFreq[word] >= 2
      )
      .slice(0, 5);

    res.json({
      existingTags: matchingTags,
      suggestedNewTags
    });
  } catch (error) {
    res.status(500).json({ message: 'Error suggesting tags', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

// Update tag usage counts (maintenance endpoint)
export const updateTagUsageCounts = async (req: Request, res: Response) => {
  try {
    const tags = await Tag.find();
    let updatedCount = 0;

    for (const tag of tags) {
      const [postsCount, pagesCount] = await Promise.all([
        Post.countDocuments({ tags: tag._id }),
        Page.countDocuments({ tags: tag._id })
      ]);

      if (tag.postCount !== postsCount || tag.pageCount !== pagesCount) {
        await Tag.findByIdAndUpdate(tag._id, {
          postCount: postsCount,
          pageCount: pagesCount
        });
        updatedCount++;
      }
    }

    res.json({
      message: `Updated usage counts for ${updatedCount} tags`,
      totalTags: tags.length,
      updatedCount
    });
  } catch (error) {
    res.status(500).json({ message: 'Error updating tag counts', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};