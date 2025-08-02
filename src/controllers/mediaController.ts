import { Request, Response } from 'express';
import { v2 as cloudinary } from 'cloudinary';
import Media from '../models/Media';
import { AuthRequest } from '../middleware/auth';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const uploadMedia = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file provided'
      });
    }

    const { alt, caption, folder = 'cms-uploads' } = req.body;
    
    // Upload to Cloudinary
    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'auto',
          quality: 'auto',
          fetch_format: 'auto',
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      uploadStream.end(req.file!.buffer);
    }) as any;

    // Save to database
    const media = new Media({
      fileName: result.public_id,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      url: result.secure_url,
      cloudinaryId: result.public_id,
      alt,
      caption,
      uploadedBy: req.user._id,
      folder,
      width: result.width,
      height: result.height,
    });

    await media.save();
    await media.populate('uploadedBy', 'username email');

    res.status(201).json({
      success: true,
      message: 'File uploaded successfully',
      media
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error uploading file'
    });
  }
};

export const getMedia = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;
    
    const { folder, mimeType, search, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    
    // Build filter object
    const filter: any = {};
    
    if (folder) {
      filter.folder = folder;
    }
    
    if (mimeType) {
      if (mimeType === 'image') {
        filter.mimeType = { $regex: '^image/', $options: 'i' };
      } else if (mimeType === 'video') {
        filter.mimeType = { $regex: '^video/', $options: 'i' };
      } else {
        filter.mimeType = mimeType;
      }
    }
    
    if (search) {
      filter.$or = [
        { originalName: { $regex: search, $options: 'i' } },
        { alt: { $regex: search, $options: 'i' } },
        { caption: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search as string, 'i')] } }
      ];
    }
    
    // Build sort object
    const sort: any = {};
    sort[sortBy as string] = sortOrder === 'desc' ? -1 : 1;
    
    const [mediaFiles, total] = await Promise.all([
      Media.find(filter)
        .populate('uploadedBy', 'username email')
        .sort(sort)
        .skip(skip)
        .limit(limit),
      Media.countDocuments(filter)
    ]);
    
    const totalPages = Math.ceil(total / limit);
    
    res.json({
      success: true,
      media: mediaFiles,
      pagination: {
        currentPage: page,
        totalPages,
        totalFiles: total,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('Get media error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching media'
    });
  }
};

export const getMediaById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const media = await Media.findById(id)
      .populate('uploadedBy', 'username email firstName lastName');
    
    if (!media) {
      return res.status(404).json({
        success: false,
        message: 'Media file not found'
      });
    }
    
    res.json({
      success: true,
      media
    });

  } catch (error) {
    console.error('Get media by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching media file'
    });
  }
};

export const updateMedia = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { alt, caption, tags } = req.body;
    
    const media = await Media.findById(id);
    
    if (!media) {
      return res.status(404).json({
        success: false,
        message: 'Media file not found'
      });
    }
    
    // Check permissions (only uploader or admin can update)
    if (media.uploadedBy.toString() !== req.user._id.toString() && req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this media file'
      });
    }
    
    media.alt = alt;
    media.caption = caption;
    media.tags = tags || [];
    
    await media.save();
    await media.populate('uploadedBy', 'username email');
    
    res.json({
      success: true,
      message: 'Media file updated successfully',
      media
    });

  } catch (error) {
    console.error('Update media error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating media file'
    });
  }
};

export const deleteMedia = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    const media = await Media.findById(id);
    
    if (!media) {
      return res.status(404).json({
        success: false,
        message: 'Media file not found'
      });
    }
    
    // Check permissions (only uploader or admin can delete)
    if (media.uploadedBy.toString() !== req.user._id.toString() && req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this media file'
      });
    }
    
    // Delete from Cloudinary
    if (media.cloudinaryId) {
      try {
        await cloudinary.uploader.destroy(media.cloudinaryId);
      } catch (cloudinaryError) {
        console.error('Cloudinary deletion error:', cloudinaryError);
        // Continue with database deletion even if Cloudinary deletion fails
      }
    }
    
    await Media.findByIdAndDelete(id);
    
    res.json({
      success: true,
      message: 'Media file deleted successfully'
    });

  } catch (error) {
    console.error('Delete media error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting media file'
    });
  }
};

export const bulkDeleteMedia = async (req: AuthRequest, res: Response) => {
  try {
    const { mediaIds } = req.body;
    
    if (!Array.isArray(mediaIds) || mediaIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Media IDs array is required'
      });
    }
    
    const mediaFiles = await Media.find({ _id: { $in: mediaIds } });
    
    if (mediaFiles.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No media files found'
      });
    }
    
    // Check permissions for each file
    const unauthorizedFiles = mediaFiles.filter(media => 
      media.uploadedBy.toString() !== req.user._id.toString() && req.user.role !== 'admin' && req.user.role !== 'superadmin'
    );
    
    if (unauthorizedFiles.length > 0) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete some media files'
      });
    }
    
    // Delete from Cloudinary
    const cloudinaryDeletions = mediaFiles
      .filter(media => media.cloudinaryId)
      .map(media => cloudinary.uploader.destroy(media.cloudinaryId!));
    
    try {
      await Promise.all(cloudinaryDeletions);
    } catch (cloudinaryError) {
      console.error('Bulk Cloudinary deletion error:', cloudinaryError);
      // Continue with database deletion even if some Cloudinary deletions fail
    }
    
    await Media.deleteMany({ _id: { $in: mediaIds } });
    
    res.json({
      success: true,
      message: `${mediaFiles.length} media files deleted successfully`
    });

  } catch (error) {
    console.error('Bulk delete media error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error bulk deleting media files'
    });
  }
};

export const getMediaStats = async (req: Request, res: Response) => {
  try {
    const stats = await Media.aggregate([
      {
        $group: {
          _id: null,
          totalFiles: { $sum: 1 },
          totalSize: { $sum: '$size' },
          imageCount: {
            $sum: {
              $cond: [{ $regexMatch: { input: '$mimeType', regex: /^image\// } }, 1, 0]
            }
          },
          videoCount: {
            $sum: {
              $cond: [{ $regexMatch: { input: '$mimeType', regex: /^video\// } }, 1, 0]
            }
          },
          documentCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $not: { $regexMatch: { input: '$mimeType', regex: /^image\// } } },
                    { $not: { $regexMatch: { input: '$mimeType', regex: /^video\// } } }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      }
    ]);
    
    const result = stats[0] || {
      totalFiles: 0,
      totalSize: 0,
      imageCount: 0,
      videoCount: 0,
      documentCount: 0
    };
    
    res.json({
      success: true,
      stats: result
    });

  } catch (error) {
    console.error('Get media stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching media statistics'
    });
  }
};