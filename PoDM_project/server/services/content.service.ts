import supabase from '../config/supabaseClient';
import * as ContentModel from '../models/content.model';
import * as ReportModel from '../models/report.model';
import * as SubscriptionModel from '../models/subscription.model';
import * as UserModel from '../models/user.model';
import * as TransactionModel from '../models/transaction.model';
import { AppError } from '../middleware/error.middleware';
import { Content, MediaFile } from '@common/types/Content';
import sharp from 'sharp';
import { User } from '@common/types/User';
import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { reshapeUserForApp } from '../utils/user.utils';
import { generateSignedUrlsForContent, enrichContentWithUnlockStatus } from '../utils/content.utils';
import * as StorageService from './storage.service';
import * as NotificationService from './notification.service';

// Set FFmpeg path explicitly
const ffmpegPath = path.join(os.homedir(), 'AppData', 'Local', 'Microsoft', 'WinGet', 'Packages', 'Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe', 'ffmpeg-8.0.1-full_build', 'bin', 'ffmpeg.exe');
ffmpeg.setFfmpegPath(ffmpegPath);


// Define a type for the query parameters for clarity
interface ContentQuery {
    type?: 'photo' | 'video' | 'text' | 'audio' | 'All';
    searchTerm?: string;
    sortKey?: string;
    sortDirection?: 'asc' | 'desc';
}


/**
 * Creates a watermarked version of an image for a specific fan.
 * @param content - The content object containing the image.
 * @param fan - The user object for the fan viewing the content.
 * @returns The path to the temporary, watermarked file in storage.
 */
const createWatermarkedImage = async (content: Content, fan: User) => {
    const originalFilePath = content.files[0]?.url;
    if (!originalFilePath || !content.files[0]?.mimeType.startsWith('image/')) {
        console.log(`[Watermark] Skipping watermark for non-image or missing file: ${content.title}`);
        return originalFilePath; // Return original path if not an image
    }

    try {

        // 1. Download the original image from R2 Storage into a buffer
        const { buffer: fileBuffer, error: downloadError } = await StorageService.downloadFromPrivate(originalFilePath);

        if (downloadError || !fileBuffer) {
            throw new Error(`Failed to download original file: ${downloadError?.message}`);
        }

        // 2. Define watermark properties
        const watermarkText = `@${fan.username}`; // Use the fan's username as the watermark
        const tempFileName = `wm-${fan.id}-${Date.now()}.webp`;
        const tempFilePath = `temp/${tempFileName}`;

        // 3. Use Sharp to composite the watermark text onto the image
        // Increased font size and opacity for better visibility
        const watermarkedBuffer = await sharp(fileBuffer)
            .composite([{
                input: Buffer.from(
                    `<svg xmlns="http://www.w3.org/2000/svg" width="500" height="120">
                        <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" 
                              font-size="10" fill="rgba(255, 255, 255, 0.25)" 
                              font-family="sans-serif" font-weight="bold">
                            ${watermarkText}
                        </text>
                    </svg>`
                ),
                tile: true, // Tile the watermark across the entire image
                gravity: 'center',
            }])
            .webp({ quality: 90 }) // Convert to WebP for efficient delivery
            .toBuffer();


        // 4. Upload the watermarked buffer to a temporary folder in R2 storage
        const { error: uploadError } = await StorageService.uploadToPrivate(
            tempFilePath,
            watermarkedBuffer,
            'image/webp',
            { cacheControl: 'max-age=300' }
        );

        if (uploadError) {
            throw new Error(`Failed to upload watermarked file: ${uploadError.message}`);
        }

        return tempFilePath;

    } catch (error) {
        return originalFilePath; // If anything fails, fall back to serving the original image
    }
};

/**
 * Generates a thumbnail from an image buffer.
 * @param buffer - The buffer of the original image file.
 * @returns A buffer of the extracted thumbnail image in JPG format.
 */
const generateThumbnail = async (buffer: Buffer): Promise<Buffer> => {
    return sharp(buffer)
        .resize(400, 400, { fit: 'inside' }) // Resize to a max of 400x400
        .webp({ quality: 80 }) // Convert to WebP for efficiency
        .toBuffer();
};

/**
 * Generates a thumbnail from a video buffer using FFmpeg.
 * @param videoBuffer - The buffer of the original video file.
 * @returns A buffer of the extracted thumbnail image in JPG format.
 */
const generateVideoThumbnail = async (videoBuffer: Buffer): Promise<Buffer> => {
    // FFmpeg CLI works with files, so we must write the buffer to a temporary file first.
    const tempVideoPath = path.join(os.tmpdir(), `temp-video-${Date.now()}.mp4`);
    const tempThumbPath = path.join(os.tmpdir(), `temp-thumb-${Date.now()}.jpg`);

    try {
        // 1. Write the video buffer to a temporary file on the server's disk.
        await fs.writeFile(tempVideoPath, videoBuffer);

        // 2. Use fluent-ffmpeg to run the command.
        await new Promise<void>((resolve, reject) => {
            ffmpeg(tempVideoPath)
                .on('end', () => resolve())
                .on('error', (err) => reject(new Error(`FFmpeg error: ${err.message}`)))
                // Take one screenshot at the 1-second mark.
                .screenshots({
                    timestamps: ['00:00:01.000'],
                    filename: path.basename(tempThumbPath),
                    folder: path.dirname(tempThumbPath),
                    size: '400x?' // Set width to 400px, maintain aspect ratio
                });
        });

        // 3. Read the generated thumbnail image file back into a buffer.
        const thumbBuffer = await fs.readFile(tempThumbPath);
        return thumbBuffer;

    } catch (error) {
        console.error("Error generating video thumbnail:", error);
        // If thumbnail generation fails, throw an error to be caught by the main service.
        throw new AppError('Could not generate video thumbnail.', 500);
    } finally {
        // 4. CRITICAL: Clean up the temporary files from the disk.
        try {
            await fs.unlink(tempVideoPath);
            await fs.unlink(tempThumbPath);
        } catch (cleanupError) {
            // Log cleanup errors but don't throw, as the primary operation might have succeeded.
            console.error("Error cleaning up temporary thumbnail files:", cleanupError);
        }
    }
};

/**
 * Handles the business logic for creating a new piece of content.
 * @param creator_id - The ID of the creator uploading the content.
 * @param contentData - The metadata for the content.
 * @param files - An array of files from Multer.
 * @returns The newly created content object.
 */
export const createNewContent = async (creator_id: string, contentData: Partial<Content>, files: Express.Multer.File[]) => {
    const uploadedFiles: MediaFile[] = [];
    const filePaths: string[] = [];

    for (const file of files) {
        const originalFileName = `${Date.now()}-${file.originalname}`;
        const filePath = `${creator_id}/${originalFileName}`;
        filePaths.push(filePath);

        // Upload the original file to R2 private storage
        const { error: uploadError } = await StorageService.uploadToPrivate(
            filePath,
            file.buffer,
            file.mimetype
        );

        if (uploadError) {
            console.error(`[ContentService] Upload failed for ${file.originalname}:`, uploadError);
            // If upload fails, attempt to clean up any files that might have been uploaded
            if (filePaths.length > 0) {
                await StorageService.deleteFromPrivate(filePaths);
            }
            throw new AppError(`Failed to upload file: ${file.originalname}`, 500);
        }

        // Default thumbnail path is the original file path (for videos, etc.)
        let thumbnailPath = filePath;
        let thumbnailMimeType = file.mimetype; // Default to original mime type

        // If it's an image, generate and upload a specific thumbnail
        if (file.mimetype.startsWith('image/')) {
            const thumbnailBuffer = await generateThumbnail(file.buffer);
            const thumbnailFileName = `thumb-${originalFileName}.webp`;
            thumbnailPath = `${creator_id}/${thumbnailFileName}`;
            thumbnailMimeType = 'image/webp';
            filePaths.push(thumbnailPath);

            const { error: thumbUploadError } = await StorageService.uploadToPrivate(
                thumbnailPath,
                thumbnailBuffer,
                thumbnailMimeType
            );

            if (thumbUploadError) {
                console.error(`Failed to upload thumbnail for ${file.originalname}, will use original file as thumbnail.`);
                // If thumbnail fails, revert to using the original file's path
                thumbnailPath = filePath;
                thumbnailMimeType = file.mimetype;
            }
        } else if (file.mimetype.startsWith('video/')) {
            // --- THIS IS THE NEW LOGIC FOR VIDEOS ---
            try {
                const thumbnailBuffer = await generateVideoThumbnail(file.buffer);
                const thumbnailFileName = `thumb-${originalFileName}.jpg`;
                thumbnailPath = `${creator_id}/${thumbnailFileName}`;
                thumbnailMimeType = 'image/jpeg';
                filePaths.push(thumbnailPath);

                const { error: thumbUploadError } = await StorageService.uploadToPrivate(
                    thumbnailPath,
                    thumbnailBuffer,
                    thumbnailMimeType
                );

                if (thumbUploadError) throw thumbUploadError;

            } catch (videoThumbError) {
                console.error(`Failed to generate or upload video thumbnail for ${file.originalname}.`, videoThumbError);
                // Fallback: The thumbnail path remains the video path itself, frontend will show a generic video icon.
                thumbnailPath = filePath;
                thumbnailMimeType = file.mimetype;
            }
            // --- END OF NEW LOGIC ---
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
        creator_id: creator_id,
        files: uploadedFiles,
        stats: { views: 0, galleryAdds: 0, tips: 0 },
        status: status,
        schedule: {
            isScheduled: contentData.schedule?.isScheduled || false,
            publishDate: publishDate,
        },
        min_tier_level: contentData.min_tier_level || 1,
    };

    // Fix: Remove camelCase property to avoid "column not found" error in Supabase
    // Using explicit snake_case above, so no need to delete min_tier_level.
    // delete (newContentData as any).min_tier_level;

    try {
        const newContent = await ContentModel.createContent(newContentData);
        if (!newContent) {
            throw new Error('Database insert returned null.');
        }

        // Trigger notifications for subscribers (async, don't wait)
        // Only notify if content is published immediately (not scheduled)
        if (newContent.status === 'published') {
            NotificationService.notifySubscribersOfNewContent(creator_id, Number(newContent.id))
                .catch(err => console.error('[ContentService] Failed to send notifications:', err));
        }

        return newContent;
    } catch (dbError) {
        console.error('Database insert failed. Cleaning up storage...', dbError);
        // If the database insert fails, we must remove the files we just uploaded
        if (filePaths.length > 0) {
            await StorageService.deleteFromPrivate(filePaths);
        }
        throw new AppError('Failed to save content to database after upload.', 500);
    }
};

/**
 * Fetches all content for a specific creator with optional filtering and sorting.
 * @param creator_id - The ID of the creator.
 * @param query - An object with filter and sort parameters.
 * @returns An array of content objects.
 */
export const getContentByCreatorId = async (creator_id: string, query: ContentQuery = {}) => {
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
        .eq('creator_id', creator_id);

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

    // Map the database 'id' to the frontend 'id' and generate signed URLs
    const contentWithUrls = await Promise.all(data.map(async (item) => {
        const signedItem = await generateSignedUrlsForContent(item);
        return {
            ...signedItem,
            id: signedItem.id.toString(),
            min_tier_level: signedItem.min_tier_level
        };
    }));

    return contentWithUrls;
};

/**
 * Fetches all content for a specific creator and shapes it for the frontend.
 * @param creatorName - The username of the creator.
 * @returns An array of content objects with 'id' instead of 'id'.
 */
export const getContentByCreatorName = async (creatorName: string) => {
    const creator = await UserModel.findUserByUsername(creatorName);
    if (!creator) {
        throw new AppError('Creator not found.', 404);
    }

    return getContentByCreatorId(creator.id);
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
        isSubscribed = subscriptions?.some(sub => sub.creator_id === creator.id) || false;
    }

    const content = await ContentModel.findContentByCreatorId(creator.id);
    if (!content) {
        return [];
    }

    // Fetch all successful PPV transactions for this viewer if they exist
    let unlockedContentIds = new Set<string>();
    if (viewerId) {
        const transactions = await TransactionModel.findTransactionsByUser(viewerId);
        if (transactions) {
            transactions.forEach(tx => {
                if (tx.status === 'Cleared' && (tx.type === 'PPV Post' || tx.type === 'PPV Message') && tx.related_content_id) {
                    unlockedContentIds.add(tx.related_content_id);
                }
            });
        }
    }

    // Process content: Determine lock status first, then sign URLs if unlocked
    const processedContent = await Promise.all(content.map(async (post) => {
        // Determine if the post is unlocked for this viewer
        const isUnlocked = viewerId ? unlockedContentIds.has(post.id.toString()) : false;

        // If it's PPV and unlocked, or Subscribers Only and subscribed, show the content.
        // Otherwise, show the placeholder.
        const shouldShowContent =
            post.visibility === 'pay_per_view' ? isUnlocked :
                post.visibility === 'subscribers_only' ? isSubscribed :
                    true; // 'unlisted' or public

        if (shouldShowContent) {
            // Generate signed URLs only if we are going to show the content
            const signedPost = await generateSignedUrlsForContent(post);
            return {
                ...signedPost,
                isUnlocked: true // Explicitly mark as unlocked for frontend
            };
        } else {
            return {
                ...post,
                isUnlocked: false,
                files: post.files.map((file: any) => ({
                    ...file,
                    url: 'https://placehold.co/600x400/1F2937/FFFFFF?text=Locked',
                    // Keep original extension hint if needed, or just partial data
                }))
            };
        }
    }));

    return processedContent;
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

    // Check against the camelCase property `creator_id` from the model.
    if (content.creator_id === fanId) {
        return content;
    }
    console.log("[ContentService] content.visibility: ", content.visibility);
    if (content.visibility === 'subscribers_only') {
        const subscriptions = await SubscriptionModel.findActiveSubscriptionsByFan(fanId);
        // FIX: Check against the snake_case property `creator_id`.
        const subscription = subscriptions?.find(sub => sub.creator_id === content.creator_id);
        const isSubscribed = !!subscription;

        console.log("[ContentService] isSubscribed: ", isSubscribed);
        if (!isSubscribed) {
            throw new AppError('You must be subscribed to view this content.', 403);
        }

        // Tier Level Check
        if (content.min_tier_level && content.min_tier_level > 1) {
            const creator = await UserModel.findUserById(content.creator_id);
            if (creator && creator.creator_data?.subscriptionTiers) {
                const fanTier = creator.creator_data.subscriptionTiers.find((t: any) => t.id === subscription?.tier_id);
                const fanTierLevel = fanTier?.level || 1; // Default to 1 if not found (legacy)

                if (fanTierLevel < content.min_tier_level) {
                    throw new AppError(`This content requires a Tier ${content.min_tier_level} subscription (You are Tier ${fanTierLevel}).`, 403);
                }
            }
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
 * @param creator_id - The ID of the creator making the request.
 * @param updates - The data to update.
 * @returns The updated content object.
 */
export const updateCreatorContent = async (contentId: string, creator_id: string, updates: Partial<Content>) => {
    const content = await ContentModel.findContentById(contentId);
    if (!content) {
        throw new AppError('Content not found.', 404);
    }
    if (content.creator_id !== creator_id) {
        throw new AppError('You are not authorized to update this content.', 403);
    }

    // Validate price for PPV content
    if (updates.visibility === 'pay_per_view') {
        if (!updates.price || isNaN(Number(updates.price)) || Number(updates.price) <= 0) {
            throw new AppError('A valid price is required for Pay-Per-View content.', 400);
        }
    } else if (updates.visibility === 'subscribers_only') {
        // If switching back to subscribers_only, nullify the price
        // If switching back to subscribers_only, nullify the price
        updates.price = null as any;
    }

    // Determine the content's new status based on scheduling updates
    if (updates.schedule) {
        if (updates.schedule.isScheduled && updates.schedule.publishDate) {
            updates.status = 'scheduled';
            updates.schedule.publishDate = new Date(updates.schedule.publishDate).toISOString();
        } else {
            // If scheduling is turned off, set status to published
            updates.status = 'published';
            updates.schedule.isScheduled = false;
            updates.schedule.publishDate = undefined;
        }
    }

    // Handle tier level updates and map to DB column
    // Fix: Do NOT delete min_tier_level, as it is a valid column.
    if (updates.min_tier_level !== undefined) {
        // Ensure it's treated as a number
        updates.min_tier_level = Number(updates.min_tier_level);
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
 * @param creator_id - The ID of the creator making the request.
 */
export const deleteCreatorContent = async (contentId: string, creator_id: string) => {
    const content = await ContentModel.findContentById(contentId);
    if (!content) {
        throw new AppError('Content not found.', 404);
    }

    if (content.creator_id !== creator_id) {
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
        const { error: storageError } = await StorageService.deleteFromPrivate(filePaths);
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

    const content = await ContentModel.findContentById(contentId);
    if (!content) {
        console.error(`[Service] Content not found in database for id="${contentId}"`);
        throw new AppError('Content not found.', 404);
    }

    // Owner check
    if (content.creator_id !== userId) {
        await getContentForFan(contentId, userId); // This function contains the permission logic
    }

    const fullThumbnailUrl = content.files?.[0]?.thumbnailUrl;
    if (!fullThumbnailUrl) {
        console.error(`[Service] Content id="${contentId}" is missing a thumbnailUrl path in its files array.`);
        throw new AppError('Content has no thumbnail file path.', 404);
    }

    const storedThumbnailPath = content.files?.[0]?.thumbnailUrl;
    if (!storedThumbnailPath) {
        throw new AppError('Content has no thumbnail file path.', 404);
    }

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

    // Generate signed URL from R2
    const { signedUrl, error } = await StorageService.getPrivateSignedUrl(relativePath, 60);

    if (error) {
        console.error(`[Service] R2 storage error for path "${relativePath}":`, error.message);
        throw new AppError('Could not generate secure URL from storage.', 500);
    }
    if (!signedUrl) {
        console.error(`[Service] R2 returned no signed URL for path "${relativePath}"`);
        throw new AppError('Storage did not return a signed URL.', 500);
    }


    return { secureUrl: signedUrl };
};

/**
 * Generates a secure, temporary URL for viewing a full-size content file.
 * It first verifies that the user has permission to access the content.
 * @param contentId The ID of the content.
 * @param userId The ID of the user requesting access.
 * @returns An object containing the secure URL and the content type.
 */
export const getSecureUrlForViewing = async (contentId: string, userId: string) => {
    // 1. Verify the fan has access to this content. This will throw an error if they don't.
    const content = await getContentForFan(contentId, userId);
    const fan = await UserModel.findUserById(userId);

    if (!fan) {
        throw new AppError('User not found.', 404);
    }

    let filePath = content.files?.[0]?.url;
    if (!filePath) {
        throw new AppError('Content file path not found.', 404);
    }

    // 2. If the content is a photo and the viewer is not the creator, create a watermark.
    if (content.type === 'photo' && content.creator_id !== userId) {
        filePath = await createWatermarkedImage(content, fan);
    }

    // 3. Generate a short-lived (60 seconds) signed URL for the file (original or watermarked).
    const { signedUrl, error } = await StorageService.getPrivateSignedUrl(filePath, 60);

    if (error || !signedUrl) {
        throw new AppError('Could not generate secure URL for content.', 500);
    }

    return {
        secureUrl: signedUrl,
        contentType: content.type // Return the content type ('photo' or 'video')
    };
};

/**
 * Fetches all data needed for the content viewer page.
 * @param contentId The ID of the content being viewed.
 * @param viewerId The ID of the user viewing the content.
 * @returns An object containing the content, its creator, and related content.
 */
export const getViewData = async (contentId: string, viewerId?: string) => {
    // 1. Fetch the main content
    const rawContent = await ContentModel.findContentById(contentId);
    if (!rawContent) {
        throw new AppError('Content not found.', 404);
    }

    // 2. Fetch the creator of the content
    const rawCreator = await UserModel.findUserById(rawContent.creator_id);
    if (!rawCreator) {
        throw new AppError('Creator not found.', 404);
    }

    // 3. Fetch related content from the same creator
    const rawRelatedContent = await ContentModel.findContentByCreatorId(
        rawContent.creator_id,
        4, // Limit to 4 related items for a 2x2 grid
    );

    // 4. Process and reshape all data before returning it
    // We first get signed URLs for everything
    const [
        contentWithUrls,
        relatedContentWithUrls
    ] = await Promise.all([
        generateSignedUrlsForContent(rawContent),
        Promise.all((rawRelatedContent || []).filter(c => c.id.toString() !== contentId).map(c => generateSignedUrlsForContent(c)))
    ]);

    // 5. Enrich with unlock status
    // We treat the main content as a single-item list to reuse the helper
    console.log('[ContentService] BEFORE enriching main content - exists:', !!contentWithUrls);
    const [enrichedContent] = await enrichContentWithUnlockStatus([contentWithUrls], viewerId);
    const enrichedRelatedContent = await enrichContentWithUnlockStatus(relatedContentWithUrls, viewerId);
    console.log('[ContentService] After enrichment - enrichedContent.isUnlocked:', enrichedContent?.isUnlocked, 'enrichedContent.isSubscribedToCreator:', enrichedContent?.isSubscribedToCreator);

    const creator = reshapeUserForApp(rawCreator);

    return {
        content: enrichedContent,
        creator,
        relatedContent: enrichedRelatedContent || [],
    };
};

/**
 * Reports a piece of content.
 * Auto-flags the content if the report count exceeds a threshold.
 */
export const reportContent = async (userId: string, contentId: string, reason: string): Promise<boolean> => {
    // 1. Create the report
    const report = await ReportModel.createReport(userId, contentId, reason);
    if (!report) {
        throw new AppError('Failed to create report.', 500);
    }

    // 2. Check if content should be auto-flagged
    const reports = await ReportModel.getReportsByContentId(contentId);
    if (reports && reports.length >= 3) {
        console.log(`[ContentService] Auto-flagging content ${contentId} due to ${reports.length} reports.`);
        await ContentModel.updateContent(contentId, { status: 'flagged' });
    }

    return true;
};
