import { Request, Response, NextFunction } from 'express';
import { AppError } from '../middleware/error.middleware';

// --- Import Service Functions ---
import * as UserService from '../services/user.service';

/**
 * @desc    Get the profile of the currently logged-in user
 * @route   GET /api/v1/users/me
 * @access  Private
 */
export const getMe = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // The 'protect' middleware has already attached the full user profile.
        // We can just send it back to the client.
        const user = req.user;

        if (!user) {
            throw new AppError('Authentication error, user not found in request.', 401);
        }

        res.status(200).json({ success: true, data: user });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Update the profile of the currently logged-in user
 * @route   PUT /api/v1/users/me
 * @access  Private
 */
export const updateMe = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?._id;
        const profileUpdates = req.body;

        if (!userId) {
            throw new AppError('Authentication error, user ID not found.', 401);
        }

        const updatedUser = await UserService.updateUserProfile(userId, profileUpdates);
        res.status(200).json({ success: true, data: updatedUser });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Update the avatar of the currently logged-in user
 * @route   PUT /api/v1/users/me/avatar
 * @access  Private
 */
export const updateMyAvatar = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?._id;
        const file = req.file; // From the uploadAvatar middleware

        if (!userId) {
            throw new AppError('Authentication error, user ID not found.', 401);
        }
        if (!file) {
            throw new AppError('No file uploaded.', 400);
        }

        const updatedUser = await UserService.uploadUserAvatar(userId, file);
        res.status(200).json({ success: true, data: updatedUser });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Add a piece of content to the current user's gallery
 * @route   POST /api/v1/users/me/gallery
 * @access  Private
 */
export const addToGallery = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const fanId = req.user?._id;
        const { contentId } = req.body;

        if (!fanId) {
            throw new AppError('Authentication error, user ID not found.', 401);
        }
        if (!contentId) {
            throw new AppError('Content ID is required to add an item to the gallery.', 400);
        }

        const updatedGallery = await UserService.addToUserGallery(fanId, contentId);
        res.status(200).json({ success: true, data: updatedGallery });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Remove a piece of content from the current user's gallery
 * @route   DELETE /api/v1/users/me/gallery/:contentId
 * @access  Private
 */
export const removeFromGallery = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const fanId = req.user?._id;
        const { contentId } = req.params;

        if (!fanId) {
            throw new AppError('Authentication error, user ID not found.', 401);
        }

        const updatedGallery = await UserService.removeFromUserGallery(fanId, contentId);
        res.status(200).json({ success: true, data: updatedGallery });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get a user's public profile by their username
 * @route   GET /api/v1/users/:username
 * @access  Public
 */
export const getPublicProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { username } = req.params;
        const userProfile = await UserService.getPublicUserProfile(username);
        res.status(200).json({ success: true, data: userProfile });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Complete the onboarding process for a new creator
 * @route   POST /api/v1/users/me/onboarding
 * @access  Private (Creators only)
 */
export const completeOnboarding = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?._id;

        if (!userId) {
            throw new AppError('Authentication error, user ID not found.', 401);
        }

        const updatedUser = await UserService.onboardCreator(userId, req.body);
        res.status(200).json({ success: true, data: updatedUser });

    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Submit documents for creator verification
 * @route   POST /api/v1/users/me/verification
 * @access  Private (Creators only)
 */
export const submitVerification = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?._id;
        const files = req.files as { [fieldname: string]: Express.Multer.File[] };
        const { signature } = req.body;

        if (!userId) {
            throw new AppError('Authentication error, user ID not found.', 401);
        }

        const result = await UserService.submitVerificationDocs(userId, files, signature);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get a creator's full public profile data (profile, tiers, content)
 * @route   GET /api/v1/users/profile/:username
 * @access  Public
 */
export const getFullPublicProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { username } = req.params;
        const profileData = await UserService.getFullPublicProfile(username);
        res.status(200).json({ success: true, data: profileData });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get the personalized content feed for the logged-in fan
 * @route   GET /api/v1/users/me/feed
 * @access  Private
 */
export const getMyFeed = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const fanId = req.user?._id;
        if (!fanId) {
            throw new AppError('Authentication error, user ID not found.', 401);
        }

        const page = parseInt(req.query.page as string) || 1;
        const feed = await UserService.generateFanFeed(fanId, page);
        
        res.status(200).json({ success: true, data: feed });
    } catch (error) {
        next(error);
    }
};