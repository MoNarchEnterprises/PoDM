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
 * A constant for a fallback date to be used when a valid date is not available.
 */
const LOWDATE = new Date('1801-01-01T00:00:00Z');

/**
 * Formats a date string from Supabase into a more readable format.
 * @param dbString - The date string to format (e.g., "2025-08-15 05:43:39.618559+00").
 * @returns A formatted date string (e.g., "August 15, 2025").
 */
export const formatDate = (dbString: string): string => {
    let dateToFormat = LOWDATE; // Default to the fallback date

    if (dbString) {
        try {
            // Convert Supabase timestamp to a reliable ISO 8601 format by replacing the space with a 'T'.
            const isoString = dbString.replace(' ', 'T');
            const parsedDate = new Date(isoString);
            
            // Check if the parsed date is valid
            if (!isNaN(parsedDate.getTime())) {
                dateToFormat = parsedDate;
            }
        } catch (error) {
            console.error("Error parsing date:", error);
            // If parsing fails, it will fall back to LOWDATE
        }
    }

    return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    }).format(dateToFormat);
};

/**
 * Calculates a relative time string from a date string.
 * @param dbString - The date string to compare against the current time.
 * @returns A relative time string (e.g., "2 hours ago", "3 days ago").
 */
export const timeAgo = (dbString: string): string => {
    if (!dbString) return formatDate(LOWDATE.toISOString()); // Return formatted LOWDATE if no string
    
    try {
        const isoString = dbString.replace(' ', 'T');
        const date = new Date(isoString);
        if (isNaN(date.getTime())) return formatDate(LOWDATE.toISOString());
        
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
    } catch (error) {
        console.error("Error calculating time ago:", error);
        return formatDate(LOWDATE.toISOString());
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
