import { useState, useCallback } from 'react';

// --- Types ---

export interface FormSubmissionState {
    isLoading: boolean;
    error: string | null;
}

export interface FormSubmissionResult<T = void> extends FormSubmissionState {
    /** Execute the async submission. Wraps try/catch and sets loading/error automatically. */
    submit: (...args: any[]) => Promise<T | undefined>;
    /** Reset error and loading state. */
    reset: () => void;
    /** Set error manually (e.g., from validation). */
    setError: React.Dispatch<React.SetStateAction<string | null>>;
}

// --- Hook ---

/**
 * A generic hook for form submission with loading/error state management.
 *
 * Eliminates the repetitive useState for isLoading/error in submit handlers.
 * Pattern seen in 5+ files: CreatorContent.tsx create/edit, CreatorEarnings.tsx WithdrawModal,
 * TipModal, UnlockModal, UpdatePaymentModal, etc.
 *
 * @example
 * \\\	sx
 * const { submit, isLoading, error } = useFormSubmission(async (amount: number) => {
 *   await apiClient.requestCreatorPayout(amount);
 * });
 * \\\
 *
 * @param mutationFn - The async function to execute on submit.
 */
export function useFormSubmission<T = void>(
    mutationFn: (...args: any[]) => Promise<T>,
): FormSubmissionResult<T> {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const submit = useCallback(async (...args: any[]): Promise<T | undefined> => {
        setIsLoading(true);
        setError(null);

        try {
            const result = await mutationFn(...args);
            return result;
        } catch (err: any) {
            const message =
                err?.response?.data?.message ||
                err?.message ||
                'An unexpected error occurred.';
            setError(message);
            console.error('[useFormSubmission] Error:', err);
            return undefined;
        } finally {
            setIsLoading(false);
        }
    }, [mutationFn]);

    const reset = useCallback(() => {
        setIsLoading(false);
        setError(null);
    }, []);

    return { isLoading, error, submit, reset, setError };
}

export default useFormSubmission;
