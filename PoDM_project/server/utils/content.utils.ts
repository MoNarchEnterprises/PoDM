// server/utils/content.utils.ts

import { Content } from '@common/types/Content';
import { reshapeUserForApp } from './user.utils';
import * as SubscriptionModel from '../models/subscription.model';
import * as TransactionModel from '../models/transaction.model';
import * as StorageService from '../services/storage.service';

/**
 * A centralized utility to process a raw Content object from the database.
 * It converts private media paths into temporary, secure, public signed URLs.
 * This function is the single source of truth for making content viewable on the frontend.
 *
 * @param post - The raw content object from a Supabase query.
 * @returns A promise that resolves to a new Content object with a public `signedUrl` for its thumbnail.
 */
export const generateSignedUrlsForContent = async (post: any): Promise<any> => {
    // If there are no files, there's nothing to process.
    if (!post.files || post.files.length === 0) {
        return post;
    }

    const processedFiles = await Promise.all(
        post.files.map(async (file: any) => {
            let publicThumbnailUrl = 'https://placehold.co/600x400/1F2937/FFFFFF?text=Invalid+Path';
            let publicFullUrl = 'https://placehold.co/1200x800/1F2937/FFFFFF?text=Invalid+Path';

            // Generate signed URL for the main content file
            if (file.url) {
                const { signedUrl, error } = await StorageService.getPrivateSignedUrl(file.url, 60);

                if (!error && signedUrl) {
                    publicFullUrl = signedUrl;
                } else {
                    console.error(`Failed to sign full URL for path: ${file.url}`, error);
                }
            }

            // Generate signed URL for the thumbnail
            if (file.thumbnailUrl) {
                const { signedUrl, error } = await StorageService.getPrivateSignedUrl(file.thumbnailUrl, 60);

                if (!error && signedUrl) {
                    publicThumbnailUrl = signedUrl;
                } else {
                    console.error(`Failed to sign thumbnail URL for path: ${file.thumbnailUrl}`, error);
                }
            }

            // Return a new file object with the signed URLs
            return {
                ...file,
                url: publicFullUrl,
                thumbnailUrl: publicThumbnailUrl,
            };
        })
    );

    // Return a new post object with the updated files array
    return {
        ...post,
        files: processedFiles,
    };
};

/**
 * A utility to reshape a raw content object from a join query (like in the fan feed)
 * into the `ContentWithCreator` shape expected by the frontend's PostCard component.
 * @param post - The raw post object, including a nested `creator` profile object.
 */
export const reshapePostForFeed = async (post: any): Promise<any> => {
    // First, process the post to get signed URLs
    const postWithSignedUrls = await generateSignedUrlsForContent(post);

    const creatorProfile = post.creator ? reshapeUserForApp(post.creator) : null;

    const {
        id,
        creator_id,
        created_at,
        updated_at,
        ...restOfPost // Use object destructuring to gather all other properties
    } = postWithSignedUrls;

    return {
        ...restOfPost,
        id: post.id.toString(),       // Map id -> id (stringified)
        creator_id: creator_id,    // Keep creator_id as-is
        created_at: created_at,    // Keep created_at as-is
        updated_at: updated_at,
        creator: creatorProfile, // Nested creator profile
    };
};

/**
 * Enriches a list of content with unlock status for a specific viewer.
 * It checks active subscriptions and PPV purchase history to determine if content is unlocked.
 * @param contentList - The list of content to enrich.
 * @param viewerId - The ID of the user viewing the content.
 * @returns The enriched content list with `isUnlocked` property.
 */
export const enrichContentWithUnlockStatus = async (contentList: any[], viewerId: string | undefined): Promise<any[]> => {
    if (!contentList || contentList.length === 0) {
        return [];
    }

    // 1. If no viewer, everything is locked unless it's public
    if (!viewerId) {
        return contentList.map(post => ({
            ...post,
            isUnlocked: false, // Default to locked for guests
            isSubscribedToCreator: false,
            // If it's public/unlisted, the frontend might still show it, but explicit 'isUnlocked' is false
        }));
    }

    // 2. Fetch Viewer's Access Data
    // We fetch this ONCE for the whole list to avoid N+1 queries
    const [activeSubs, transactions] = await Promise.all([
        SubscriptionModel.findActiveSubscriptionsByFan(viewerId),
        TransactionModel.findTransactionsByUser(viewerId)
    ]);
    console.log("[ContentUtils] activeSubs: ", activeSubs);
    // console.log("[ContentUtils] transactions: ", transactions);
    const subscribedCreatorIds = new Set(activeSubs?.map(sub => String(sub.creator_id)));
    console.log("[ContentUtils] subscribedCreatorIds: ", Array.from(subscribedCreatorIds));

    const unlockedContentIds = new Set<string>();
    if (transactions) {
        transactions.forEach(tx => {
            if (tx.status === 'Cleared' &&
                (tx.type === 'PPV Post' || tx.type === 'PPV Message') &&
                tx.related_content_id) {
                unlockedContentIds.add(String(tx.related_content_id));
            }
        });
    }
    // console.log("[ContentUtils] unlockedContentIds: ", unlockedContentIds);
    // 3. Enrich each post
    return contentList.map(post => {
        // A. Creator always unlocks their own content
        if (post.creator_id === viewerId) {
            return { ...post, isUnlocked: true, isSubscribedToCreator: true };
        }

        // B. Check specific unlock conditions
        let isUnlocked = false;
        const isSubscribedToCreator = subscribedCreatorIds.has(String(post.creator_id));
        console.log(`[ContentUtils] Checking post ${post.id} (creator: ${post.creator_id}), isSubscribed: ${isSubscribedToCreator}`);

        if (post.visibility === 'pay_per_view') {
            // Unlocked if purchased
            // We check both string and number ID formats to be safe
            isUnlocked = unlockedContentIds.has(post.id?.toString());
        } else if (post.visibility === 'subscribers_only') {
            // Unlocked if subscribed to creator
            isUnlocked = isSubscribedToCreator;
        } else {
            // Public or Unlisted content is always "unlocked" in terms of visibility
            isUnlocked = true;
        }

        return {
            ...post,
            isUnlocked,
            isSubscribedToCreator
        };
    });
};