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
        const originalFilePath = `${creatorId}/${originalFileName}`;
        filePaths.push(originalFilePath);

        // Upload the original file
        const { error: uploadError } = await supabase.storage
            .from('creator-content')
            .upload(originalFilePath, file.buffer, { contentType: file.mimetype });

        if (uploadError) {
            throw new AppError(`Failed to upload file: ${file.originalname}`, 500);
        }

        const { data: { publicUrl: originalUrl } } = supabase.storage.from('creator-content').getPublicUrl(originalFilePath);
        let thumbnailUrl = originalUrl; // Default for non-image files

        // If it's an image, generate and upload a thumbnail
        if (file.mimetype.startsWith('image/')) {
            const thumbnailBuffer = await generateThumbnail(file.buffer);
            const thumbnailFileName = `thumb-${originalFileName}.webp`;
            const thumbnailFilePath = `${creatorId}/${thumbnailFileName}`;
            filePaths.push(thumbnailFilePath);

            const { error: thumbUploadError } = await supabase.storage
                .from('creator-content')
                .upload(thumbnailFilePath, thumbnailBuffer, { contentType: 'image/webp' });

            if (thumbUploadError) {
                console.error(`Failed to upload thumbnail for ${file.originalname}`);
            } else {
                thumbnailUrl = supabase.storage.from('creator-content').getPublicUrl(thumbnailFilePath).data.publicUrl;
            }
        }

        uploadedFiles.push({
            id: originalFileName,
            url: originalUrl,
            thumbnailUrl: thumbnailUrl,
            size: file.size,
            mimeType: file.mimetype,
        });
    }

    const newContentData: Partial<Content> = {
        ...contentData,
        creatorId,
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
        await supabase.storage.from('creator-content').remove(filePaths);
        throw new AppError('Failed to save content to database after upload.', 500);
    }
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

    if (content.creatorId === fanId) {
        return content;
    }

    if (content.visibility === 'subscribers_only') {
        const subscriptions = await SubscriptionModel.findActiveSubscriptionsByFan(fanId);
        const isSubscribed = subscriptions?.some(sub => sub.creatorId === content.creatorId);
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
    if (content.creatorId !== creatorId) {
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

    if (content.creatorId !== creatorId) {
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
