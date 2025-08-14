/**
 * Formats a number representing cents into a standard currency string.
 * This is useful for logging or creating standardized transaction records.
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
 * This is useful for creating clean URLs from usernames or content titles.
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
