import supabase from '../config/supabaseClient';
import * as ContentModel from '../models/content.model';
import * as SubscriptionModel from '../models/subscription.model';
import * as UserModel from '../models/user.model';
import * as TransactionModel from '../models/transaction.model';
import { AppError } from '../middleware/error.middleware';
import { Content, MediaFile } from '@common/types/Content';
import sharp from 'sharp';

// Define a type for the query parameters for clarity
interface ContentQuery {
    type?: 'photo' | 'video' | 'text' | 'audio';
    searchTerm?: string;
    sortKey?: string;
    sortDirection?: 'asc' | 'desc';
}


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

    // 1. Determine the content's status based on scheduling
    let status: Content['status'] = 'published';
    let publishDate: string | undefined = undefined;

    if (contentData.schedule?.isScheduled && contentData.schedule?.publishDate) {
        status = 'scheduled';
        publishDate = new Date(contentData.schedule.publishDate).toISOString();
    }

    // 2. Validate price for PPV content
    if (contentData.visibility === 'pay_per_view') {
        if (!contentData.price || isNaN(Number(contentData.price)) || Number(contentData.price) <= 0) {
            throw new AppError('A valid price is required for Pay-Per-View content.', 400);
        }
    } else {
        // Ensure price is null if not PPV
        contentData.price = undefined;
    }

    // 3. Assemble the final data for the database
    const newContentData: Partial<Content> = {
        ...contentData,
        creator_id: creatorId,
        files: uploadedFiles,
        stats: { views: 0, galleryAdds: 0, tips: 0 },
        status: status,
        schedule: {
            isScheduled: contentData.schedule?.isScheduled || false,
            publishDate: publishDate,
        },
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
 * Fetches all content for a specific creator with optional filtering and sorting.
 * @param creatorId - The ID of the creator.
 * @param query - An object with filter and sort parameters.
 * @returns An array of content objects.
 */
export const getContentByCreatorId = async (creatorId: string, query: ContentQuery = {}) => {
    const { 
        type, 
        searchTerm, 
        sortKey = 'created_at', // Default sort key
        sortDirection = 'desc' // Default sort direction
    } = query;

    // Start building the query
    let queryBuilder = supabase
        .from('content')
        .select('*')
        .eq('creator_id', creatorId);

    // Apply filter by content type if provided
    if (type && type !== 'All') {
        queryBuilder = queryBuilder.eq('type', type);
    }

    // Apply search filter if a search term is provided
    if (searchTerm) {
        // 'ilike' is a case-insensitive "like" operator, perfect for searching
        queryBuilder = queryBuilder.ilike('title', `%${searchTerm}%`);
    }

    // Apply sorting
    queryBuilder = queryBuilder.order(sortKey, { ascending: sortDirection === 'asc' });

    // Execute the final query
    const { data, error } = await queryBuilder;

    if (error) {
        console.error('Error finding content by creator ID:', error.message);
        return null;
    }
    
    // Map the database 'id' to the frontend '_id'
    return data.map(item => ({
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

    // 3. Prevent certain fields from being updated directly via this endpoint
    delete updates.creator_id;
    delete updates.files;
    delete updates.stats;

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

    const filePaths: string[] = [];
    if (content.files && content.files.length > 0) {
        content.files.forEach((file: MediaFile) => {
            if (file.url) filePaths.push(file.url);
            if (file.thumbnailUrl && file.thumbnailUrl !== file.url) {
                filePaths.push(file.thumbnailUrl);
            }
        });
    }

    if (filePaths.length > 0) {
        const { error: storageError } = await supabase.storage.from('creator-content').remove(filePaths);
        if (storageError) {
            // Log the error but proceed to delete the DB record.
            // In a production system, you might add this to a retry queue.
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
    console.log(`[Service] getSecureUrlForThumbnail: Verifying access for userId="${userId}" to contentId="${contentId}"`);
    
    const content = await ContentModel.findContentById(contentId);
    if (!content) {
        console.error(`[Service] Content not found in database for id="${contentId}"`);
        throw new AppError('Content not found.', 404);
    }
    console.log(`[Service] Found content: ${content.title} (Creator ID: ${content.creator_id})`);

    // Owner check
    if (content.creator_id !== userId) {
        console.log('[Service] User is not owner, checking permissions...');
        await getContentForFan(contentId, userId); // This function contains the permission logic
        console.log('[Service] Permission check passed.');
    } else {
        console.log('[Service] User is the owner. Granting access.');
    }

    const fullThumbnailUrl = content.files?.[0]?.thumbnailUrl;
    if (!fullThumbnailUrl) {
        console.error(`[Service] Content id="${contentId}" is missing a thumbnailUrl path in its files array.`);
        throw new AppError('Content has no thumbnail file path.', 404);
    }
    console.log(`[Service] Full thumbnail URL from DB: ${fullThumbnailUrl}`);

    const storedThumbnailPath = content.files?.[0]?.thumbnailUrl;
    if (!storedThumbnailPath) {
        throw new AppError('Content has no thumbnail file path.', 404);
    }
    console.log(`[Service] Path from DB: ${storedThumbnailPath}`);

    let relativePath: string;
    const bucketName = 'creator-content';

    // Check if the stored path is a full URL or a relative path
    if (storedThumbnailPath.includes(bucketName)) {
        // It's a full URL, so we parse it
        const pathParts = storedThumbnailPath.split(`${bucketName}/`);
        relativePath = pathParts[1];
    } else {
        // It's already a relative path
        relativePath = storedThumbnailPath;
    }

    if (!relativePath) {
        console.error(`[Service] Could not determine a relative path from: ${storedThumbnailPath}`);
        throw new AppError('Could not determine a valid file path.', 500);
    }
    console.log(`[Service] Using relative path for Supabase: ${relativePath}`);
    
    const { data, error } = await supabase.storage
        .from(bucketName)
        .createSignedUrl(relativePath, 60);
    
    if (error) {
        console.error(`[Service] Supabase storage error for path "${relativePath}":`, error.message);
        throw new AppError('Could not generate secure URL from storage.', 500);
    }
    if (!data?.signedUrl) {
        console.error(`[Service] Supabase returned no data for signed URL for path "${relativePath}"`);
        throw new AppError('Storage did not return a signed URL.', 500);
    }

    console.log(`[Service] Generated signed URL successfully for path "${relativePath}"`);
    return { secureUrl: data.signedUrl };
};
