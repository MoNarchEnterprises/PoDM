import React from 'react';

// --- Import Shared Types ---
import { UserStatus } from '@common/types/User';
import { ContentStatus } from '@common/types/Content';
import { getStatusBadgeClasses } from '../../lib/statusBadgeMap';

// --- Type Definitions ---

/**
 * A union of all possible statuses from your data models that the badge can display.
 */
export type BadgeStatus = UserStatus | ContentStatus;

// --- Main StatusBadge Component ---
interface StatusBadgeProps {
    /**
     * The status to display. This determines the color and text of the badge.
     */
    status: BadgeStatus;
    /**
     * Optional additional CSS classes to apply to the badge.
     */
    className?: string;
}

/**
 * A reusable component to display a colored badge for different statuses.
 * Uses the centralized statusBadgeMap utility for consistent styling.
 */
const StatusBadge = ({ status, className = '' }: StatusBadgeProps) => {
    const baseClasses = 'px-2 py-1 text-xs font-medium rounded-full inline-block capitalize';
    const statusClasses = getStatusBadgeClasses(status, '');

    return (
        <span className={`${baseClasses} ${statusClasses} ${className}`}>
            {status}
        </span>
    );
};

export default StatusBadge;