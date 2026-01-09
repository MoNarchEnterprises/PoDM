// server/utils/content.utils.ts

import { Content } from '@common/types/Content';
import { reshapeUserForApp } from './user.utils';
import * as SubscriptionModel from '../models/subscription.model';
import * as TransactionModel from '../models/transaction.model';
import * as UserModel from '../models/user.model';
import * as StorageService from '../services/storage.service';
import supabase from '../config/supabaseClient';

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
                // Prevent double-signing if it's already a full URL
                if (file.url.startsWith('http')) {
                    publicFullUrl = file.url;
                } else {
                    const { signedUrl, error } = await StorageService.getPrivateSignedUrl(file.url, 3600);
                    if (!error && signedUrl) {
                        publicFullUrl = signedUrl;
                    } else {
                        console.error(`Failed to sign full URL for path: ${file.url}`, error);
                    }
                }
            }

            // Generate signed URL for the thumbnail
            if (file.thumbnailUrl) {
                // Prevent double-signing if it's already a full URL
                if (file.thumbnailUrl.startsWith('http')) {
                    publicThumbnailUrl = file.thumbnailUrl;
                } else {
                    const { signedUrl, error } = await StorageService.getPrivateSignedUrl(file.thumbnailUrl, 3600);

                    if (!error && signedUrl) {
                        publicThumbnailUrl = signedUrl;
                    } else {
                        console.error(`Failed to sign thumbnail URL for path: ${file.thumbnailUrl}`, error);
                    }
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
    // console.log(`[ContentUtils] enrichContentWithUnlockStatus called - contentList length: ${contentList?.length1}, viewerId: ${viewerId}`);
    if (!contentList || contentList.length === 0) {
        return [];
    }

    // --- FIX: SIGN URLS FIRST (FOR EVERYONE) ---
    // We must sign URLs for BOTH guests and logged-in users.
    // We map over the content list and sign each one.
    const signedContentList = await Promise.all(contentList.map(async (post) => {
        return await generateSignedUrlsForContent(post);
    }));

    // 1. If no viewer, everything is locked unless it's public
    if (!viewerId) {
        return signedContentList.map(post => ({
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
    // console.log("[ContentUtils] activeSubs: ", activeSubs);
    // console.log("[ContentUtils] transactions: ", transactions);
    const subscribedCreatorIds = new Set(activeSubs?.map(sub => String(sub.creator_id)));
    // console.log("[ContentUtils] subscribedCreatorIds: ", Array.from(subscribedCreatorIds));

    // 2b. Build a map of creator IDs to the fan's tier level for that creator
    // We'll need to fetch creator data to get their subscription tiers
    const subscribedCreatorTierLevels = new Map<string, number>();
    if (activeSubs && activeSubs.length > 0) {
        // Get all unique creator IDs from subscriptions
        const creatorIds = [...new Set(activeSubs.map(sub => String(sub.creator_id)))];

        // Fetch creator data for all subscribed creators
        const creators = await Promise.all(
            creatorIds.map(creatorId => UserModel.findUserById(creatorId))
        );

        // For each subscription, find the tier level
        activeSubs.forEach(sub => {
            const creator = creators.find(c => c?.id === sub.creator_id);
            if (creator?.creator_data?.subscriptionTiers) {
                const tier = creator.creator_data.subscriptionTiers.find((t: any) => t.id === sub.tier_id);
                const tierLevel = tier?.level || 1; // Default to level 1 if not found
                subscribedCreatorTierLevels.set(String(sub.creator_id), tierLevel);
            }
        });
    }
    // console.log("[ContentUtils] subscribedCreatorTierLevels: ", Array.from(subscribedCreatorTierLevels.entries()));

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
    return Promise.all(signedContentList.map(async post => {
        // A. Creator always unlocks their own content
        if (post.creator_id === viewerId) {
            return { ...post, isUnlocked: true, isSubscribedToCreator: true };
        }

        // B. Check specific unlock conditions
        let isUnlocked = false;
        let isLockedByTier = false; // New property to track tier-based locking
        const isSubscribedToCreator = subscribedCreatorIds.has(String(post.creator_id));
        // console.log(`[ContentUtils] Checking post ${post.id} (creator: ${post.creator_id}, type: ${typeof post.creator_id}), isSubscribed: ${isSubscribedToCreator}, subscribedSet has: [${Array.from(subscribedCreatorIds)}]`);

        if (post.visibility === 'pay_per_view') {
            // Unlocked if purchased
            // We check both string and number ID formats to be safe
            isUnlocked = unlockedContentIds.has(post.id?.toString());
        } else if (post.visibility === 'subscribers_only') {
            // Check if subscribed AND tier level is sufficient
            if (isSubscribedToCreator) {
                // Check tier level requirement
                if (post.min_tier_level && post.min_tier_level > 1) {
                    const fanTierLevel = subscribedCreatorTierLevels.get(String(post.creator_id)) || 1;
                    // console.log(`[ContentUtils] Post ${post.id} requires tier ${post.min_tier_level}, fan has tier ${fanTierLevel}`);

                    if (fanTierLevel >= post.min_tier_level) {
                        // Fan's tier is sufficient
                        isUnlocked = true;
                    } else {
                        // Fan is subscribed but tier is insufficient
                        isUnlocked = false;
                        isLockedByTier = true;
                    }
                } else {
                    // No tier requirement or tier level 1, just needs subscription
                    isUnlocked = true;
                }
            } else {
                // Not subscribed at all
                isUnlocked = false;
            }
        } else {
            // Public or Unlisted content is usually unlocked, UNLESS it has a price (Hidden PPV)
            if (post.visibility === 'unlisted' && post.price && post.price > 0) {
                isUnlocked = unlockedContentIds.has(post.id?.toString());
            } else {
                isUnlocked = true;
            }
        }

        // C. Check if content is in the viewer's gallery
        let inGallery = false;
        if (viewerId && post.id) {
            try {
                const { data: galleryData } = await supabase
                    .from('galleries')
                    .select('content')
                    .eq('fan_id', viewerId)
                    .single();

                if (galleryData?.content && Array.isArray(galleryData.content)) {
                    inGallery = galleryData.content.some((item: any) =>
                        item.contentId === post.id?.toString() ||
                        item.contentId === parseInt(post.id)
                    );
                }
            } catch (error) {
                // Gallery doesn't exist yet or other error - that's okay
                inGallery = false;
            }
        }

        // console.log(`[ContentUtils] About to return post ${post.id} with isUnlocked=${isUnlocked}, isSubscribedToCreator=${isSubscribedToCreator}, isLockedByTier=${isLockedByTier}, inGallery=${inGallery}`);
        return {
            ...post,
            isUnlocked,
            isSubscribedToCreator,
            isLockedByTier,
            inGallery
        };
    }));
};