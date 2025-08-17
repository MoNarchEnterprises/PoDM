import { Request, Response, NextFunction } from 'express';
import * as ContentService from '../services/content.service';
import { AppError } from '../middleware/error.middleware';

/**
 * @desc    Create a new piece of content
 * @route   POST /api/v1/content
 * @access  Private (Creators only)
 */
export const createContent = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const creatorId = req.user?.id;
        if (!creatorId) {
            throw new AppError('Authentication error, user ID not found.', 401);
        }

        const { title, description, type, visibility, price, tags, schedule } = req.body;
        const files = req.files as Express.Multer.File[];

        if (!title || !type || !visibility || !files || files.length === 0) {
            throw new AppError('Title, type, visibility, and at least one file are required.', 400);
        }

        const newContent = await ContentService.createNewContent(
            creatorId,
            { title, description, type, visibility, price, tags, schedule },
            files
        );

        res.status(201).json({ success: true, data: newContent });
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
        
        const content = await ContentService.getContentByCreator(username);
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
        const fanId = req.user?.id;
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
        const creatorId = req.user?.id;
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
        const creatorId = req.user?.id;
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
