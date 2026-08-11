import Button from '../ui/Button';

interface ContentLockOverlayProps {
    /** Whether the content is unlocked for the current user */
    isUnlocked: boolean;
    /** Whether the content is locked specifically due to insufficient tier level */
    isLockedByTier?: boolean;
    /** Price in cents for PPV content */
    price?: number;
    /** Minimum tier level required for tier-locked content */
    minTierLevel?: number;
    /** Whether the user is subscribed to the creator */
    isSubscribedToCreator?: boolean;
    /** Creator's username for navigation */
    creatorUsername: string;
    /** Callback when unlock button is clicked (for PPV content) */
    onUnlock?: () => void;
    /** Additional CSS classes for styling */
    className?: string;
    /** Whether to show as a card (grid) or full-size viewer */
    variant?: 'card' | 'viewer';
}

/**
 * Reusable overlay component that handles content locking states:
 * - Tier-insufficient: Blur only, no lock icon
 * - PPV: Blur + lock icon + price
 * - Not subscribed: Blur + lock icon + subscribe button
 */
const ContentLockOverlay: React.FC<ContentLockOverlayProps> = ({
    isUnlocked,
    isLockedByTier = false,
    price,
    minTierLevel,
    isSubscribedToCreator = false,
    creatorUsername,
    onUnlock,
    className = '',
    variant = 'card',
}) => {
    // If content is unlocked, don't show any overlay
    if (isUnlocked) {
        return null;
    }

    // Determine the overlay styling based on variant
    const overlayBaseClasses = variant === 'viewer'
        ? 'absolute inset-0 backdrop-blur-md z-10 flex items-center justify-center'
        : 'absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center text-white p-4';

    // For tier-locked content: Show blur WITHOUT lock icon
    if (isLockedByTier) {
        return (
            <div className={`${overlayBaseClasses} ${className}`}>
                {variant === 'card' && (
                    <div className="flex flex-col items-center space-y-2">
                        <h3 className="font-bold text-lg text-center">Higher Tier Required</h3>
                        <Button
                            className="mt-4 bg-blue-600 hover:bg-blue-700"
                            onClick={(e) => {
                                e.stopPropagation();
                                window.location.href = `/creator/${creatorUsername}?tab=subscribe`;
                            }}
                        >
                            Upgrade to Tier {minTierLevel}
                        </Button>
                    </div>
                )}
            </div>
        );
    }

    // For PPV or non-subscribed content: Show blur WITH lock icon
    return (
        <div className={`${overlayBaseClasses} ${className}`}>
            <div className="text-white text-center">
                <svg className="w-16 h-16 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
                {variant === 'card' && <h3 className="font-bold text-lg mb-2">Content Locked</h3>}
                {price && price > 0 && (
                    <p className="text-xl font-bold mb-4">${(price / 100).toFixed(2)}</p>
                )}

                <div className="flex flex-col items-center space-y-2">
                    {!isSubscribedToCreator ? (
                        <Button
                            className="mt-4 bg-purple-600 hover:bg-purple-700"
                            onClick={(e) => {
                                e.stopPropagation();
                                window.location.href = `/creator/${creatorUsername}`;
                            }}
                        >
                            Subscribe to Unlock
                        </Button>
                    ) : price && price > 0 ? (
                        <Button
                            className="mt-4"
                            onClick={(e) => {
                                e.stopPropagation();
                                onUnlock?.();
                            }}
                        >
                            Unlock for ${(price / 100).toFixed(2)}
                        </Button>
                    ) : (
                        <Button
                            className="mt-4"
                            onClick={(e) => {
                                e.stopPropagation();
                                window.location.href = `/creator/${creatorUsername}`;
                            }}
                        >
                            Subscribe to view
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ContentLockOverlay;
