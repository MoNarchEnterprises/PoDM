// src/components/shared/ContentLockManager.tsx

import React from 'react';
import { Content } from '@common/types/Content';
import { Creator } from '@common/types/Creator';

/**
 * Centralized interface for content locking state.
 * This represents all the information needed to determine if content is locked
 * and what type of lock it has.
 */
export interface ContentLockState {
    /** Whether the content is currently unlocked for the viewer */
    isUnlocked: boolean;
    /** The type of lock preventing access */
    lockType: 'none' | 'subscription' | 'tier' | 'ppv';
    /** Price in cents for PPV content */
    price?: number;
    /** Minimum tier level required (1, 2, 3, etc.) */
    minTierLevel?: number;
    /** Whether the viewer is subscribed at any tier */
    isSubscribedToCreator: boolean;
    /** The viewer's current tier level (if subscribed) */
    viewerTierLevel?: number;
    /** Creator's username for navigation */
    creatorUsername: string;
    /** Creator's profile name for display */
    creatorName: string;
}

/**
 * Determines the lock state for a piece of content.
 * This is the single source of truth for content locking logic.
 * 
 * @param content - The content object from the API
 * @param creator - The creator object (can be nested in content or separate)
 * @param viewerSubscription - Optional subscription info for the current viewer
 * @returns ContentLockState object with all lock information
 */
export function getContentLockState(
    content: Content,
    creator: Pick<Creator, 'username' | 'profile'>,
    viewerSubscription?: {
        isSubscribed: boolean;
        tierLevel?: number;
    }
): ContentLockState {
    const isSubscribed = viewerSubscription?.isSubscribed ?? content.isSubscribedToCreator ?? false;
    const viewerTier = viewerSubscription?.tierLevel;

    // If content has explicit unlock status, trust it
    const isUnlocked = content.isUnlocked ?? false;

    // Determine lock type based on content properties
    let lockType: ContentLockState['lockType'] = 'none';

    if (!isUnlocked) {
        if (content.isLockedByTier && content.min_tier_level) {
            // Content is locked because viewer's tier is too low
            lockType = 'tier';
        } else if (content.price && content.price > 0) {
            // Content is PPV (pay-per-view)
            lockType = 'ppv';
        } else if (!isSubscribed) {
            // Content requires subscription
            lockType = 'subscription';
        } else {
            // Content is locked for some other reason (shouldn't happen often)
            lockType = 'subscription';
        }
    }

    return {
        isUnlocked,
        lockType,
        price: content.price,
        minTierLevel: content.min_tier_level,
        isSubscribedToCreator: isSubscribed,
        viewerTierLevel: viewerTier,
        creatorUsername: creator.username,
        creatorName: creator.profile.name,
    };
}

/**
 * Hook to manage content lock state with local unlocking.
 * Use this when content can be unlocked during the session (e.g., after PPV purchase).
 */
export function useContentLock(
    content: Content,
    creator: Pick<Creator, 'username' | 'profile'>,
    viewerSubscription?: {
        isSubscribed: boolean;
        tierLevel?: number;
    }
) {
    const [localIsUnlocked, setLocalIsUnlocked] = React.useState(content.isUnlocked ?? false);

    // Create lock state with local unlock status
    const lockState = getContentLockState(
        { ...content, isUnlocked: localIsUnlocked },
        creator,
        viewerSubscription
    );

    /**
     * Mark content as unlocked locally (e.g., after successful PPV purchase)
     */
    const markAsUnlocked = React.useCallback(() => {
        setLocalIsUnlocked(true);
    }, []);

    return {
        lockState,
        markAsUnlocked,
    };
}

/**
 * Utility function to get a human-readable lock message
 */
export function getLockMessage(lockState: ContentLockState): string {
    switch (lockState.lockType) {
        case 'none':
            return '';
        case 'subscription':
            return `Subscribe to ${lockState.creatorName} to unlock`;
        case 'tier':
            return `Upgrade to Tier ${lockState.minTierLevel} to unlock`;
        case 'ppv':
            if (lockState.isSubscribedToCreator) {
                return `Unlock for $${((lockState.price || 0) / 100).toFixed(2)}`;
            }
            return `Subscribe and unlock for $${((lockState.price || 0) / 100).toFixed(2)}`;
        default:
            return 'Content locked';
    }
}

/**
 * Utility function to get the primary action for a locked content
 */
export function getLockAction(lockState: ContentLockState): {
    label: string;
    action: 'subscribe' | 'upgrade' | 'unlock' | 'none';
    url?: string;
} {
    switch (lockState.lockType) {
        case 'none':
            return { label: '', action: 'none' };
        case 'subscription':
            return {
                label: 'Subscribe to Unlock',
                action: 'subscribe',
                url: `/creator/${lockState.creatorUsername}`,
            };
        case 'tier':
            return {
                label: `Upgrade to Tier ${lockState.minTierLevel}`,
                action: 'upgrade',
                url: `/creator/${lockState.creatorUsername}?tab=subscribe`,
            };
        case 'ppv':
            if (lockState.isSubscribedToCreator) {
                return {
                    label: `Unlock for $${((lockState.price || 0) / 100).toFixed(2)}`,
                    action: 'unlock',
                };
            }
            return {
                label: 'Subscribe to Unlock',
                action: 'subscribe',
                url: `/creator/${lockState.creatorUsername}`,
            };
        default:
            return { label: 'Unlock', action: 'none' };
    }
}

/**
 * Utility to determine if content should show blur effect
 */
export function shouldBlurContent(lockState: ContentLockState): boolean {
    return lockState.lockType !== 'none';
}

/**
 * Utility to determine if lock icon should be shown
 */
export function shouldShowLockIcon(lockState: ContentLockState): boolean {
    // Show lock icon for subscription and PPV, but NOT for tier locks
    return lockState.lockType === 'subscription' || lockState.lockType === 'ppv';
}

/**
 * Example usage in components:
 * 
 * // In FanFeed or any content list:
 * const lockState = getContentLockState(post, post.creator);
 * 
 * // In ContentViewer with local unlock capability:
 * const { lockState, markAsUnlocked } = useContentLock(content, creator);
 * 
 * // In CreatorProfile with known subscription status:
 * const lockState = getContentLockState(
 *   post, 
 *   creator, 
 *   { isSubscribed: true, tierLevel: userTierLevel }
 * );
 */
