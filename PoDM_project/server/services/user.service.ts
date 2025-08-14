import * as UserModel from '../models/user.model';
import * as GalleryModel from '../models/gallery.model';
import { AppError } from '../middleware/error.middleware';
import { UserProfile } from '@common/types/User';
import { GalleryItem } from '@common/types/Gallery';

/**
 * Handles the business logic for fetching a user's public profile.
 * @param username - The username of the profile to fetch.
 * @returns The user's public profile data.
 */
export const getPublicUserProfile = async (username: string) => {
    const user = await UserModel.findUserByUsername(username);
    if (!user) {
        throw new AppError('User not found.', 404);
    }
    // In a real app, you would filter out sensitive data before returning
    return user;
};

/**
 * Handles the business logic for updating a user's profile.
 * @param userId - The ID of the user to update.
 * @param profileUpdates - The profile data to update.
 * @returns The updated user profile.
 */
export const updateUserProfile = async (userId: string, profileUpdates: Partial<UserProfile>) => {
    const updatedUser = await UserModel.updateProfile(userId, profileUpdates);
    if (!updatedUser) {
        throw new AppError('Failed to update user profile.', 500);
    }
    return updatedUser;
};

/**
 * Handles the business logic for adding content to a fan's gallery.
 * @param fanId - The ID of the fan.
 * @param contentId - The ID of the content to add.
 * @returns The updated gallery object.
 */
export const addToUserGallery = async (fanId: string, contentId: string) => {
    // In a real app, you'd first verify that the fan has access to this content.
    
    const newItem: GalleryItem = {
        contentId,
        addedDate: new Date().toISOString(),
        isAccessible: true, // Assuming they have access when they add it
    };

    const updatedGallery = await GalleryModel.addItemToGallery(fanId, newItem);

    if (!updatedGallery) {
        throw new AppError('Failed to add item to gallery.', 500);
    }

    return updatedGallery;
};

/**
 * Handles the business logic for removing content from a fan's gallery.
 * @param fanId - The ID of the fan.
 * @param contentId - The ID of the content to remove.
 * @returns The updated gallery object.
 */
export const removeFromUserGallery = async (fanId: string, contentId: string) => {
    const updatedGallery = await GalleryModel.removeItemFromGallery(fanId, contentId);

    if (!updatedGallery) {
        throw new AppError('Failed to remove item from gallery.', 500);
    }

    return updatedGallery;
};
