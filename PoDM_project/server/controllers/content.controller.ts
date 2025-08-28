import { Request, Response, NextFunction } from 'express';
import * as ContentService from '../services/content.service';
import { AppError } from '../middleware/error.middleware';
import { getSecureContentUrl as getSecureContentUrlController } from '../controllers/content.controller'; // Renaming for clarity

/**
 * @desc    Create a new piece of content
 * @route   POST /api/v1/content
 * @access  Private (Creators only)
 */
export const createContent = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const creatorId = req.user?._id; // Changed from .id
        if (!creatorId) {
            throw new AppError('Authentication error, user ID not found.', 401);
        }

        // Multer handles the files, other data is in the body
        const { title, description, type, visibility, price, tags, scheduleIsScheduled, schedulePublishDate } = req.body;
        const files = req.files as Express.Multer.File[];

        if (!title || !type || !visibility || !files || files.length === 0) {
            throw new AppError('Title, type, visibility, and at least one file are required.', 400);
        }

        // --- MODIFICATION: Assemble the schedule object ---
        const schedule = {
            isScheduled: scheduleIsScheduled === 'true', // FormData sends booleans as strings
            publishDate: schedulePublishDate,
        };

        const newContent = await ContentService.createNewContent(
            creatorId,
            // --- MODIFICATION: Pass the new fields to the service ---
            { title, description, type, visibility, price, tags, schedule },
            files
        );

        res.status(201).json({ success: true, data: newContent });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get all content for the currently logged-in creator
 * @route   GET /api/v1/content/my-content
 * @access  Private (Creators only)
 */
export const getMyContent = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const creatorId = req.user?._id;
        if (!creatorId) {
            throw new AppError('Authentication error, user ID not found.', 401);
        }

        // Pass the request query object directly to the service
        const content = await ContentService.getContentByCreatorId(creatorId, req.query);
        
        res.status(200).json({ success: true, data: content });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get all content for a specific creator (public view)
 * @route   GET /api/v1/content/creator/:username
 * @access  Public
 */
export const getContentByCreator = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { username } = req.params;
        
        const content = await ContentService.getContentByCreatorName(username);
        res.status(200).json({ success: true, data: content });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get a single piece of content by its ID
 * @route   GET /api/v1/content/:id
 * @access  Private (Fan must be subscribed or have purchased)
 */
export const getContentById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const fanId = req.user?._id;
        const { id: contentId } = req.params;

        if (!fanId) {
            throw new AppError('Authentication error, user ID not found.', 401);
        }

        const content = await ContentService.getContentForFan(contentId, fanId);
        res.status(200).json({ success: true, data: content });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Update a piece of content
 * @route   PUT /api/v1/content/:id
 * @access  Private (Owner only)
 */
export const updateContent = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const creatorId = req.user?._id;
        const { id: contentId } = req.params;
        const updates = req.body;

        if (!creatorId) {
            throw new AppError('Authentication error, user ID not found.', 401);
        }

        const updatedContent = await ContentService.updateCreatorContent(contentId, creatorId, updates);
        res.status(200).json({ success: true, data: updatedContent });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Delete a piece of content
 * @route   DELETE /api/v1/content/:id
 * @access  Private (Owner only)
 */
export const deleteContent = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const creatorId = req.user?._id;
        const { id: contentId } = req.params;

        if (!creatorId) {
            throw new AppError('Authentication error, user ID not found.', 401);
        }

        const deletedContent = await ContentService.deleteCreatorContent(contentId, creatorId);
        res.status(200).json({ success: true, data: deletedContent });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get a secure, temporary URL for a content file
 * @route   GET /api/v1/content/:id/secure-url
 * @access  Private (Subscribers, Admins, or Owner)
 */
export const getSecureContentUrl = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?._id;
        const { id: contentId } = req.params;

        console.log(`[Controller] getSecureContentUrl: Request for contentId="${contentId}" by userId="${userId}"`);

        if (!userId) {
            return next(new AppError('Authentication error, user ID not found on request.', 401));
        }
        if (!contentId) {
            return next(new AppError('Content ID is missing from request parameters.', 400));
        }

        const { secureUrl } = await ContentService.getSecureUrlForThumbnail(contentId, userId);
        
        console.log(`[Controller] Successfully generated secure URL for contentId="${contentId}"`);
        res.status(200).json({ success: true, data: { secureUrl } });

    } catch (error) {
        console.error(`[Controller] ERROR in getSecureContentUrl for contentId="${req.params.id}":`, error);
        next(error);
    }
};