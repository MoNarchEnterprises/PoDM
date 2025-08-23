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