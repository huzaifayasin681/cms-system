"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMediaStats = exports.bulkDeleteMedia = exports.deleteMedia = exports.updateMedia = exports.getMediaById = exports.getMedia = exports.uploadMedia = void 0;
const cloudinary_1 = require("cloudinary");
const Media_1 = __importDefault(require("../models/Media"));
cloudinary_1.v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});
const uploadMedia = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No file provided'
            });
        }
        const { alt, caption, folder = 'cms-uploads' } = req.body;
        const result = await new Promise((resolve, reject) => {
            const uploadStream = cloudinary_1.v2.uploader.upload_stream({
                folder,
                resource_type: 'auto',
                quality: 'auto',
                fetch_format: 'auto',
            }, (error, result) => {
                if (error)
                    reject(error);
                else
                    resolve(result);
            });
            uploadStream.end(req.file.buffer);
        });
        const media = new Media_1.default({
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
    }
    catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error uploading file'
        });
    }
};
exports.uploadMedia = uploadMedia;
const getMedia = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;
        const { folder, mimeType, search, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
        const filter = {};
        if (folder) {
            filter.folder = folder;
        }
        if (mimeType) {
            if (mimeType === 'image') {
                filter.mimeType = { $regex: '^image/', $options: 'i' };
            }
            else if (mimeType === 'video') {
                filter.mimeType = { $regex: '^video/', $options: 'i' };
            }
            else {
                filter.mimeType = mimeType;
            }
        }
        if (search) {
            filter.$or = [
                { originalName: { $regex: search, $options: 'i' } },
                { alt: { $regex: search, $options: 'i' } },
                { caption: { $regex: search, $options: 'i' } },
                { tags: { $in: [new RegExp(search, 'i')] } }
            ];
        }
        const sort = {};
        sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
        const [mediaFiles, total] = await Promise.all([
            Media_1.default.find(filter)
                .populate('uploadedBy', 'username email')
                .sort(sort)
                .skip(skip)
                .limit(limit),
            Media_1.default.countDocuments(filter)
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
    }
    catch (error) {
        console.error('Get media error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching media'
        });
    }
};
exports.getMedia = getMedia;
const getMediaById = async (req, res) => {
    try {
        const { id } = req.params;
        const media = await Media_1.default.findById(id)
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
    }
    catch (error) {
        console.error('Get media by ID error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching media file'
        });
    }
};
exports.getMediaById = getMediaById;
const updateMedia = async (req, res) => {
    try {
        const { id } = req.params;
        const { alt, caption, tags } = req.body;
        const media = await Media_1.default.findById(id);
        if (!media) {
            return res.status(404).json({
                success: false,
                message: 'Media file not found'
            });
        }
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
    }
    catch (error) {
        console.error('Update media error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error updating media file'
        });
    }
};
exports.updateMedia = updateMedia;
const deleteMedia = async (req, res) => {
    try {
        const { id } = req.params;
        const media = await Media_1.default.findById(id);
        if (!media) {
            return res.status(404).json({
                success: false,
                message: 'Media file not found'
            });
        }
        if (media.uploadedBy.toString() !== req.user._id.toString() && req.user.role !== 'admin' && req.user.role !== 'superadmin') {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to delete this media file'
            });
        }
        if (media.cloudinaryId) {
            try {
                await cloudinary_1.v2.uploader.destroy(media.cloudinaryId);
            }
            catch (cloudinaryError) {
                console.error('Cloudinary deletion error:', cloudinaryError);
            }
        }
        await Media_1.default.findByIdAndDelete(id);
        res.json({
            success: true,
            message: 'Media file deleted successfully'
        });
    }
    catch (error) {
        console.error('Delete media error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error deleting media file'
        });
    }
};
exports.deleteMedia = deleteMedia;
const bulkDeleteMedia = async (req, res) => {
    try {
        const { mediaIds } = req.body;
        if (!Array.isArray(mediaIds) || mediaIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Media IDs array is required'
            });
        }
        const mediaFiles = await Media_1.default.find({ _id: { $in: mediaIds } });
        if (mediaFiles.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No media files found'
            });
        }
        const unauthorizedFiles = mediaFiles.filter(media => media.uploadedBy.toString() !== req.user._id.toString() && req.user.role !== 'admin' && req.user.role !== 'superadmin');
        if (unauthorizedFiles.length > 0) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to delete some media files'
            });
        }
        const cloudinaryDeletions = mediaFiles
            .filter(media => media.cloudinaryId)
            .map(media => cloudinary_1.v2.uploader.destroy(media.cloudinaryId));
        try {
            await Promise.all(cloudinaryDeletions);
        }
        catch (cloudinaryError) {
            console.error('Bulk Cloudinary deletion error:', cloudinaryError);
        }
        await Media_1.default.deleteMany({ _id: { $in: mediaIds } });
        res.json({
            success: true,
            message: `${mediaFiles.length} media files deleted successfully`
        });
    }
    catch (error) {
        console.error('Bulk delete media error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error bulk deleting media files'
        });
    }
};
exports.bulkDeleteMedia = bulkDeleteMedia;
const getMediaStats = async (req, res) => {
    try {
        const stats = await Media_1.default.aggregate([
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
    }
    catch (error) {
        console.error('Get media stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching media statistics'
        });
    }
};
exports.getMediaStats = getMediaStats;
