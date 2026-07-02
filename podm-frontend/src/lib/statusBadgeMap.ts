// --- Status Badge Style Map ---
//
// Centralized color map for status badges across the application.
// Eliminates the duplicate inline maps in:
// - StatusBadge.tsx (lines 31-41)
// - SupportTicketsPanel.tsx (lines 10-18 - TicketStatusBadge)
// - VerificationBanner.tsx (lines 36-40)
// - CreatorContestList.tsx (lines 74-77 - inline status colors)

export type StatusVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral';

/**
 * Maps a status string to Tailwind CSS classes for badge styling.
 *
 * @param status - The status string (e.g., 'active', 'pending', 'draft').
 * @param baseClasses - Optional base classes to include (default: badge base).
 * @returns A string of Tailwind CSS classes.
 */
export function getStatusBadgeClasses(
    status: string,
    baseClasses: string = 'px-2 py-1 text-xs font-medium rounded-full inline-block capitalize',
): string {
    const variant = getStatusVariant(status);
    const colorClasses = STATUS_VARIANT_CLASSES[variant];
    return `${baseClasses} ${colorClasses}`;
}

/**
 * Returns the StatusVariant for a given status string.
 */
export function getStatusVariant(status: string): StatusVariant {
    const lower = status.toLowerCase().trim();

    if (LOWER_TO_VARIANT[lower]) {
        return LOWER_TO_VARIANT[lower];
    }

    // Fallback: heuristic matching
    if (/^(active|published|completed|success|verified|paid)$/.test(lower)) return 'success';
    if (/^(pending|scheduled|in_progress|processing)$/.test(lower)) return 'warning';
    if (/^(banned|flagged|suspended|failed|rejected|error|cancelled)$/.test(lower)) return 'error';
    if (/^(pending verification|review|draft)$/.test(lower)) return 'info';
    return 'neutral';
}

/**
 * Tailwind classes per status variant.
 */
export const STATUS_VARIANT_CLASSES: Record<StatusVariant, string> = {
    success: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
    warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
    error: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
    info: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
    neutral: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
};

/**
 * Direct mapping of common status strings to their StatusVariant.
 */
export const LOWER_TO_VARIANT: Record<string, StatusVariant> = {
    'active': 'success',
    'published': 'success',
    'completed': 'success',
    'success': 'success',
    'verified': 'success',
    'paid': 'success',
    'pending': 'warning',
    'scheduled': 'warning',
    'in_progress': 'warning',
    'processing': 'warning',
    'pending verification': 'info',
    'review': 'info',
    'draft': 'info',
    'banned': 'error',
    'flagged': 'error',
    'suspended': 'error',
    'failed': 'error',
    'rejected': 'error',
    'error': 'error',
    'cancelled': 'error',
};
