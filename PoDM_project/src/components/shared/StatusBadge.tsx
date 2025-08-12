import React from 'react';

// --- Import Shared Types ---
import { UserStatus } from '../../../common/types/User';
import { ContentStatus } from '../../../common/types/Content';

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
 */
const StatusBadge = ({ status, className = '' }: StatusBadgeProps) => {
    // This map now uses the lowercase, space-separated strings from your common types.
    const styleMap: { [key in BadgeStatus]: string } = {
        'active': 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
        'suspended': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
        'banned': 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
        'pending verification': 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
        'pending': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
        'published': 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
        'scheduled': 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
        'draft': 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
        'flagged': 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
    };

    const baseClasses = "px-2 py-1 text-xs font-medium rounded-full inline-block capitalize";
    const statusClasses = styleMap[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';

    return (
        <span className={`${baseClasses} ${statusClasses} ${className}`}>
            {status}
        </span>
    );
};

export default StatusBadge;
