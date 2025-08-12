/**
 * Formats a number representing cents into a standard currency string.
 * @param amountInCents - The amount in cents (e.g., 1999).
 * @returns A formatted string (e.g., "$19.99").
 */
export const formatCurrency = (amountInCents: number): string => {
    const amountInDollars = amountInCents / 100;
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
    }).format(amountInDollars);
};

/**
 * Formats an ISO 8601 date string into a more readable format.
 * @param isoString - The date string to format (e.g., "2025-08-11T10:30:00Z").
 * @returns A formatted date string (e.g., "August 11, 2025").
 */
export const formatDate = (isoString: string): string => {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    }).format(date);
};

/**
 * Calculates a relative time string from an ISO date string.
 * @param isoString - The date string to compare against the current time.
 * @returns A relative time string (e.g., "2 hours ago", "3 days ago").
 */
export const timeAgo = (isoString: string): string => {
    const date = new Date(isoString);
    const now = new Date();
    const seconds = Math.round((now.getTime() - date.getTime()) / 1000);
    const minutes = Math.round(seconds / 60);
    const hours = Math.round(minutes / 60);
    const days = Math.round(hours / 24);

    if (seconds < 60) {
        return "Just now";
    } else if (minutes < 60) {
        return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else if (hours < 24) {
        return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else {
        return `${days} day${days > 1 ? 's' : ''} ago`;
    }
};

/**
 * Truncates a string to a specified length and adds an ellipsis.
 * @param text - The string to truncate.
 * @param maxLength - The maximum length of the string before truncation.
 * @returns The truncated string.
 */
export const truncateText = (text: string, maxLength: number): string => {
    if (text.length <= maxLength) {
        return text;
    }
    return text.substring(0, maxLength) + '...';
};
