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
        const creatorId = req.user?._id; // Changed from .id
        if (!creatorId) {
            throw new AppError('Authentication error, user ID not found.', 401);
        }

        const { title, description, type, visibility, tags } = req.body;
        const price = req.body.price ? Number(req.body.price) : undefined;
        const scheduleIsScheduled = req.body.scheduleIsScheduled === 'true';
        const schedulePublishDate = req.body.schedulePublishDate || undefined;

        const files = req.files as Express.Multer.File[];

        console.log('[Controller] createContent: Processing request body:', {
            title, description, type, visibility, price, tags, scheduleIsScheduled, schedulePublishDate
        });
        console.log('[Controller] createContent: Files received:', files ? files.length : 0);

        if (!title || !type || !visibility || !files || files.length === 0) {
            throw new AppError('Title, type, visibility, and at least one file are required.', 400);
        }

        const schedule = {
            isScheduled: scheduleIsScheduled,
            publishDate: schedulePublishDate,
        };

        const newContent = await ContentService.createNewContent(
            creatorId,
            // --- MODIFICATION: Pass the new fields to the service ---
            { title, description, type, visibility, price, tags, schedule, minTierLevel: req.body.minTierLevel ? Number(req.body.minTierLevel) : undefined },
            files
        );

        res.status(201).json({ success: true, data: newContent });
    } catch (error) {
        console.error('Error creating content:', error);

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
        console.log(`[Controller] getMyContent: Fetching content for creatorId=${creatorId}`);
        const content = await ContentService.getContentByCreatorId(creatorId, req.query);
        console.log(`[Controller] getMyContent: Found ${content?.length || 0} items`);
        if (content && content.length > 0) {
            console.log('[Controller] getMyContent: Titles:', content.map(c => c.title).join(', '));
            console.log('[Controller] First Item Full:', JSON.stringify(content[0], null, 2));
        }

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
        const viewerId = req.user?._id; // Extracted from optionalProtect middleware

        const content = await ContentService.getContentForPublicProfile(username, viewerId);
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

        // The updateContent payload coming from apiClient is a JSON object, not FormData.
        // It has scheduleIsScheduled and schedulePublishDate properties if present.
        if (updates.scheduleIsScheduled !== undefined) {
            updates.schedule = {
                isScheduled: updates.scheduleIsScheduled, // This is already a boolean from apiClient
                publishDate: updates.schedulePublishDate,
            };
            delete updates.scheduleIsScheduled;
            delete updates.schedulePublishDate;
        }

        // --- Added for updateContent consistency ---
        if (updates.type === undefined || updates.type === null || updates.type === '') {
            updates.type = 'photo'; // Default to photo if type is missing or empty
        }
        if (updates.visibility === undefined || updates.visibility === null || updates.visibility === '') {
            updates.visibility = 'subscribers_only'; // Default visibility
        }
        // --- End additions for updateContent consistency ---

        const updatedContent = await ContentService.updateCreatorContent(contentId, creatorId, updates);
        res.status(200).json({ success: true, data: updatedContent });
    }
    catch (error) {
        console.error('Error updating content:', error);
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

/**

 * @desc    Get a secure URL for viewing a full-size content file

 * @route   GET /api/v1/content/:id/view

 * @access  Private (Requires fan access)

 */

export const getContentView = async (req: Request, res: Response, next: NextFunction) => {

    try {

        const userId = req.user?._id;

        const { id: contentId } = req.params;



        if (!userId) {

            return next(new AppError('Authentication error.', 401));

        }



        const result = await ContentService.getSecureUrlForViewing(contentId, userId);

        res.status(200).json({ success: true, data: result });



    } catch (error) {

        next(error);

    }

};



/**

 * @desc    Get all data for the content viewer page

 * @route   GET /api/v1/content/:id/viewer-data

 * @access  Public

 */

export const getContentViewerData = async (req: Request, res: Response, next: NextFunction) => {

    try {
        const userId = req.user?._id;
        const { id: contentId } = req.params;

        const data = await ContentService.getViewData(contentId, userId);

        res.status(200).json({ success: true, data });

    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Report a piece of content
 * @route   POST /api/v1/content/:id/report
 * @access  Private
 */
export const reportContent = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?._id;
        const { id: contentId } = req.params;
        const { reason } = req.body;

        if (!userId) {
            throw new AppError('Authentication error, user ID not found.', 401);
        }

        if (!reason) {
            throw new AppError('Reason is required.', 400);
        }

        await ContentService.reportContent(userId, contentId, reason);

        res.status(200).json({ success: true, message: 'Content reported successfully.' });
    } catch (error) {
        next(error);
    }
};
