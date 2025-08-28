import supabase from '../config/supabaseClient';
import * as ContentModel from '../models/content.model';
import * as SubscriptionModel from '../models/subscription.model';
import * as UserModel from '../models/user.model';
import * as TransactionModel from '../models/transaction.model';
import { AppError } from '../middleware/error.middleware';
import { Content, MediaFile } from '@common/types/Content';
import sharp from 'sharp';

/**
 * Generates a thumbnail from an image buffer.
 * @param buffer - The buffer of the original image file.
 * @returns A buffer of the resized thumbnail image in WebP format.
 */
const generateThumbnail = async (buffer: Buffer): Promise<Buffer> => {
    return sharp(buffer)
        .resize(400, 400, { fit: 'inside' }) // Resize to a max of 400x400
        .webp({ quality: 80 }) // Convert to WebP for efficiency
        .toBuffer();
};

/**
 * Handles the business logic for creating a new piece of content.
 * @param creatorId - The ID of the creator uploading the content.
 * @param contentData - The metadata for the content.
 * @param files - An array of files from Multer.
 * @returns The newly created content object.
 */
export const createNewContent = async (creatorId: string, contentData: Partial<Content>, files: Express.Multer.File[]) => {
    const uploadedFiles: MediaFile[] = [];
    const filePaths: string[] = [];

    for (const file of files) {
        const originalFileName = `${Date.now()}-${file.originalname}`;
        const filePath = `${creatorId}/${originalFileName}`;
        filePaths.push(filePath);

        // Upload the original file to the private 'creator-content' bucket
        const { error: uploadError } = await supabase.storage
            .from('creator-content')
            .upload(filePath, file.buffer, { contentType: file.mimetype });

        if (uploadError) {
            // If upload fails, attempt to clean up any files that might have been uploaded
            if (filePaths.length > 0) {
                await supabase.storage.from('creator-content').remove(filePaths);
            }
            throw new AppError(`Failed to upload file: ${file.originalname}`, 500);
        }

        // Default thumbnail path is the original file path (for videos, etc.)
        let thumbnailPath = filePath;

        // If it's an image, generate and upload a specific thumbnail
        if (file.mimetype.startsWith('image/')) {
            const thumbnailBuffer = await generateThumbnail(file.buffer);
            const thumbnailFileName = `thumb-${originalFileName}.webp`;
            thumbnailPath = `${creatorId}/${thumbnailFileName}`;
            filePaths.push(thumbnailPath);

            const { error: thumbUploadError } = await supabase.storage
                .from('creator-content')
                .upload(thumbnailPath, thumbnailBuffer, { contentType: 'image/webp' });

            if (thumbUploadError) {
                console.error(`Failed to upload thumbnail for ${file.originalname}, will use original file as thumbnail.`);
                // If thumbnail fails, revert to using the original file's path
                thumbnailPath = filePath; 
            }
        }

        uploadedFiles.push({
            id: originalFileName,
            url: filePath, // Store the path, NOT the public URL
            thumbnailUrl: thumbnailPath, // Store the path, NOT the public URL
            size: file.size,
            mimeType: file.mimetype,
        });
    }

    const newContentData: Partial<Content> = {
        ...contentData,
        creator_id: creatorId,
        files: uploadedFiles,
        stats: { views: 0, galleryAdds: 0, tips: 0 },
    };

    try {
        const newContent = await ContentModel.createContent(newContentData);
        if (!newContent) {
            throw new Error('Database insert returned null.');
        }
        return newContent;
    } catch (dbError) {
        console.error('Database insert failed. Cleaning up storage...', dbError);
        // If the database insert fails, we must remove the files we just uploaded
        if (filePaths.length > 0) {
            await supabase.storage.from('creator-content').remove(filePaths);
        }
        throw new AppError('Failed to save content to database after upload.', 500);
    }
};

/**
 * Fetches all content for a specific creator and shapes it for the frontend.
 * @param creatorId - The ID of the creator.
 * @returns An array of content objects with '_id' instead of 'id'.
 */
export const getContentByCreatorId = async (creatorId: string) => {
    const contentFromDb = await ContentModel.findContentByCreatorId(creatorId);
    if (!contentFromDb) {
        return [];
    }
    // Map the database 'id' to the frontend '_id'
    return contentFromDb.map(item => ({
        ...item,
        _id: item.id.toString(),
    }));
};

/**
 * Fetches all content for a specific creator and shapes it for the frontend.
 * @param creatorName - The username of the creator.
 * @returns An array of content objects with '_id' instead of 'id'.
 */
export const getContentByCreatorName = async (creatorName: string) => {
    const creator = await UserModel.findUserByUsername(creatorName);
    if (!creator) {
        throw new AppError('Creator not found.', 404);
    }

    return getContentByCreatorId(creator._id);
};

/**
 * Fetches content for a creator's public profile, blurring if necessary.
 * @param username - The username of the creator.
 * @param viewerId - The ID of the person viewing the profile (optional).
 * @returns An array of content, potentially with blurred URLs.
 */
export const getContentForPublicProfile = async (username: string, viewerId?: string) => {
    const creator = await UserModel.findUserByUsername(username);
    if (!creator) {
        throw new AppError('Creator not found.', 404);
    }

    let isSubscribed = false;
    if (viewerId) {
        const subscriptions = await SubscriptionModel.findActiveSubscriptionsByFan(viewerId);
        isSubscribed = subscriptions?.some(sub => sub.creatorId === creator._id) || false;
    }

    const content = await ContentModel.findContentByCreatorId(creator._id);
    if (!content) {
        return [];
    }

    if (!isSubscribed) {
        return content.map(post => ({
            ...post,
            files: post.files.map(file => ({
                ...file,
                url: 'https://placehold.co/600x400/1F2937/FFFFFF?text=Locked',
            }))
        }));
    }

    return content;
};


/**
 * Retrieves a single piece of content, ensuring the viewer has permission.
 * @param contentId - The ID of the content to retrieve.
 * @param fanId - The ID of the user attempting to view the content.
 * @returns The full content object if access is granted.
 */
export const getContentForFan = async (contentId: string, fanId: string) => {
    const content = await ContentModel.findContentById(contentId);
    if (!content) {
        throw new AppError('Content not found.', 404);
    }

    // FIX: Check against the snake_case property `creator_id` from the database.
    if (content.creator_id === fanId) {
        return content;
    }

    if (content.visibility === 'subscribers_only') {
        const subscriptions = await SubscriptionModel.findActiveSubscriptionsByFan(fanId);
        // FIX: Check against the snake_case property `creator_id`.
        const isSubscribed = subscriptions?.some(sub => sub.creator_id === content.creator_id);
        if (!isSubscribed) {
            throw new AppError('You must be subscribed to view this content.', 403);
        }
    }

    if (content.visibility === 'pay_per_view') {
        const purchase = await TransactionModel.findSuccessfulTransactionByFanAndContent(fanId, contentId);
        if (!purchase) {
            throw new AppError('You must purchase this content to view it.', 403);
        }
    }

    return content;
};

/**
 * Updates a creator's content.
 * @param contentId - The ID of the content to update.
 * @param creatorId - The ID of the creator making the request.
 * @param updates - The data to update.
 * @returns The updated content object.
 */
export const updateCreatorContent = async (contentId: string, creatorId: string, updates: Partial<Content>) => {
    const content = await ContentModel.findContentById(contentId);
    if (!content) {
        throw new AppError('Content not found.', 404);
    }
    if (content.creator_id !== creatorId) {
        throw new AppError('You are not authorized to update this content.', 403);
    }

    const updatedContent = await ContentModel.updateContent(contentId, updates);
    if (!updatedContent) {
        throw new AppError('Failed to update content.', 500);
    }
    return updatedContent;
};


/**
 * Deletes a piece of content, including its files from storage.
 * @param contentId - The ID of the content to delete.
 * @param creatorId - The ID of the creator making the request.
 */
export const deleteCreatorContent = async (contentId: string, creatorId: string) => {
    const content = await ContentModel.findContentById(contentId);
    if (!content) {
        throw new AppError('Content not found.', 404);
    }

    if (content.creator_id !== creatorId) {
        throw new AppError('You are not authorized to delete this content.', 403);
    }

    const filePaths = content.files.map(file => `${creatorId}/${file.id}`);
    if (filePaths.length > 0) {
        const { error: storageError } = await supabase.storage.from('creator-content').remove(filePaths);
        if (storageError) {
            console.error('Error deleting files from storage:', storageError.message);
        }
    }

    const deletedContent = await ContentModel.deleteContent(contentId);
    if (!deletedContent) {
        throw new AppError('Failed to delete content from database.', 500);
    }

    return deletedContent;
};

/**
 * Generates a secure URL for a content thumbnail, giving the owner automatic access.
 * For other users, it falls back to the standard access check.
 * @param contentId The ID of the content.
 * @param userId The ID of the user requesting access.
 */
export const getSecureUrlForThumbnail = async (contentId: string, userId: string) => {
    const content = await ContentModel.findContentById(contentId);
    if (!content) {
        throw new AppError('Content not found.', 404);
    }

    // If the user requesting the URL is NOT the owner of the content,
    // run the standard permission check (are they subscribed?).
    if (content.creator_id !== userId) {
        await getContentForFan(contentId, userId);
    }
    // If they ARE the owner, we skip the check and proceed.

    const fullThumbnailUrl = content.files?.[0]?.thumbnailUrl;
    if (!fullThumbnailUrl) {
        throw new AppError('Content has no thumbnail file path.', 404);
    }

    // --- FIX STARTS HERE ---
    // The database stores the full URL, but createSignedUrl needs the relative path.
    // We parse the relative path from the full URL.
    const bucketName = 'creator-content';
    const thumbnailPath = fullThumbnailUrl.split(`${bucketName}/`)[1];

    if (!thumbnailPath) {
        throw new AppError('Could not parse a valid thumbnail path from the URL.', 500);
    }
    // --- FIX ENDS HERE ---

    const { data, error } = await supabase.storage
        .from(bucketName)
        .createSignedUrl(thumbnailPath, 60); // Use the parsed relative path

    if (error || !data) {
        throw new AppError('Could not generate secure URL.', 500);
    }

    return { secureUrl: data.signedUrl };
};
