import supabase from '../config/supabaseClient';
import * as ContentModel from '../models/content.model';
import * as SubscriptionModel from '../models/subscription.model';
import { AppError } from '../middleware/error.middleware';
import { Content, MediaFile } from '@common/types/Content';

/**
 * Handles the business logic for creating a new piece of content.
 * This includes uploading files to storage and saving metadata to the database.
 * @param creatorId - The ID of the creator uploading the content.
 * @param contentData - The metadata for the content (title, description, etc.).
 * @param files - An array of files to be uploaded.
 * @returns The newly created content object.
 */
export const createNewContent = async (creatorId: string, contentData: Partial<Content>, files: Express.Multer.File[]) => {
    // Step 1: Upload files to Supabase Storage
    const uploadedFiles: MediaFile[] = [];

    for (const file of files) {
        const fileName = `${Date.now()}-${file.originalname}`;
        const filePath = `${creatorId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('creator-content')
            .upload(filePath, file.buffer, {
                contentType: file.mimetype,
            });

        if (uploadError) {
            throw new AppError(`Failed to upload file: ${file.originalname}`, 500);
        }

        // Get the public URL for the uploaded file
        const { data: { publicUrl } } = supabase.storage
            .from('creator-content')
            .getPublicUrl(filePath);

        uploadedFiles.push({
            id: fileName,
            url: publicUrl,
            thumbnailUrl: publicUrl, // In a real app, you'd generate a separate thumbnail
            size: file.size,
            mimeType: file.mimetype,
        });
    }

    // Step 2: Create the content record in the database
    const newContentData: Partial<Content> = {
        ...contentData,
        creatorId,
        files: uploadedFiles,
        stats: { views: 0, galleryAdds: 0, tips: 0 }, // Initialize stats
    };

    const newContent = await ContentModel.createContent(newContentData);

    if (!newContent) {
        // In a real app, you might want to delete the uploaded files if the DB insert fails.
        throw new AppError('Failed to save content to database.', 500);
    }

    return newContent;
};

/**
 * Handles the business logic for retrieving a single piece of content,
 * ensuring the viewer has the correct permissions.
 * @param contentId - The ID of the content to retrieve.
 * @param fanId - The ID of the user attempting to view the content.
 * @returns The full content object if access is granted.
 */
export const getContentForFan = async (contentId: string, fanId: string) => {
    const content = await ContentModel.findContentById(contentId);

    if (!content) {
        throw new AppError('Content not found.', 404);
    }

    // Allow the creator to always view their own content
    if (content.creatorId === fanId) {
        return content;
    }

    // Check access for subscribers
    if (content.visibility === 'subscribers_only') {
        const activeSubscriptions = await SubscriptionModel.findActiveSubscriptionsByFan(fanId);
        const isSubscribed = activeSubscriptions?.some(sub => sub.creatorId === content.creatorId);

        if (!isSubscribed) {
            throw new AppError('You must be subscribed to this creator to view this content.', 403);
        }
    }

    // In a real app, you would also check for PPV purchases here by looking at the 'transactions' table.

    return content;
};

/**
 * Handles the business logic for deleting a piece of content.
 * This includes deleting files from storage and the record from the database.
 * @param contentId - The ID of the content to delete.
 * @param creatorId - The ID of the creator making the request.
 */
export const deleteCreatorContent = async (contentId: string, creatorId: string) => {
    const content = await ContentModel.findContentById(contentId);

    if (!content) {
        throw new AppError('Content not found.', 404);
    }

    // Verify that the user making the request is the owner of the content
    if (content.creatorId !== creatorId) {
        throw new AppError('You are not authorized to delete this content.', 403);
    }

    // Step 1: Delete files from Supabase Storage
    const filePaths = content.files.map(file => `${creatorId}/${file.id}`);
    const { error: storageError } = await supabase.storage
        .from('creator-content')
        .remove(filePaths);

    if (storageError) {
        // Log the error but proceed to delete the DB record anyway
        console.error('Error deleting files from storage:', storageError.message);
    }

    // Step 2: Delete the content record from the database
    const deletedContent = await ContentModel.deleteContent(contentId);

    if (!deletedContent) {
        throw new AppError('Failed to delete content from database.', 500);
    }

    return deletedContent;
};
