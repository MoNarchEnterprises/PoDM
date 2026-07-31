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
 * Generates a URL-friendly "slug" from a string.
 * @param text - The string to slugify (e.g., "My New Post!").
 * @returns A slugified string (e.g., "my-new-post").
 */
export const slugify = (text: string): string => {
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')           // Replace spaces with -
        .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
        .replace(/\-\-+/g, '-');        // Replace multiple - with single -
};

/**
 * Parses a date string (typically from the database) into a Date object.
 * Normalizes Supabase's space-separated timestamps (e.g., "2025-08-15 05:43:39.618559+00")
 * to a reliable ISO 8601 format. Returns null for missing or unparseable input.
 * @param dbString - The date string to parse.
 * @returns A valid Date, or null if the input is missing or invalid.
 */
const parseDbDate = (dbString: string | null | undefined): Date | null => {
    if (!dbString) return null;
    try {
        const date = new Date(dbString.replace(' ', 'T'));
        return isNaN(date.getTime()) ? null : date;
    } catch {
        return null;
    }
};

/**
 * Formats a date string from the database into a readable date (in the viewer's local timezone).
 * @param dbString - The date string to format (e.g., "2025-08-15 05:43:39.618559+00").
 * @returns A formatted date string (e.g., "August 15, 2025"), or "—" when unparseable.
 */
export const formatDate = (dbString: string | null | undefined): string => {
    const date = parseDbDate(dbString);
    if (!date) return '—';
    return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    }).format(date);
};

/**
 * Formats a date string from the database into a date and time (in the viewer's local timezone).
 * @param dbString - The date string to format.
 * @returns A formatted date-time string (e.g., "August 15, 2025, 3:45 PM"), or "—" when unparseable.
 */
export const formatDateTime = (dbString: string | null | undefined): string => {
    const date = parseDbDate(dbString);
    if (!date) return '—';
    return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    }).format(date);
};

/**
 * Formats a date string into a short time string in the viewer's local timezone (e.g., "3:45 PM").
 * @param dbString - The date string to format.
 * @returns A formatted time string, or '' when unparseable.
 */
export const formatMessageTimestamp = (dbString: string | null | undefined): string => {
    const date = parseDbDate(dbString);
    if (!date) return '';
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
};

/**
 * Calculates a relative time string from a date string.
 * @param dbString - The date string to compare against the current time.
 * @returns A relative time string (e.g., "2 hours ago", "3 days ago"), or "—" when unparseable.
 */
export const timeAgo = (dbString: string | null | undefined): string => {
    const date = parseDbDate(dbString);
    if (!date) return '—';

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