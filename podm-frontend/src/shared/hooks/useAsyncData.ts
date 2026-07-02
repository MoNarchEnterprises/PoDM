import { useState, useEffect, useCallback, useRef } from 'react';

// --- Types ---

/**
 * The shape of the state returned by useAsyncData.
 */
export interface AsyncState<T> {
    data: T | null;
    isLoading: boolean;
    error: string | null;
}

export type AsyncDataResult<T> = AsyncState<T> & {
    /** Manually trigger a refetch. */
    refetch: () => void;
    /** Set data manually (e.g., after a mutation). */
    setData: React.Dispatch<React.SetStateAction<T | null>>;
    /** Reset to initial state. */
    reset: () => void;
};

// --- Hook ---

/**
 * A generic hook for async data fetching with loading/error/data state management.
 *
 * Eliminates the repetitive useState/useEffect/loading/error pattern seen in 15+ files.
 *
 * @example
 * \\\	sx
 * const { data: posts, isLoading, error, refetch } = useAsyncData(
 *   () => apiClient.getFanFeed(1),
 *   []
 * );
 * \\\
 *
 * @param fetchFn - An async function that returns the data (resolved from axios or similar).
 * @param deps - Dependency array for the underlying useEffect.
 * @param extractData - Optional function to extract data from the response (e.g., \es => res.data\).
 * @param initialData - Optional initial value for data.
 */
export function useAsyncData<T = any>(
    fetchFn: () => Promise<{ data: T } | T>,
    deps: React.DependencyList,
    extractData?: (response: any) => T,
    initialData: T | null = null,
): AsyncDataResult<T> {
    const [data, setData] = useState<T | null>(initialData);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const fetchCounter = useRef(0);

    const executeFetch = useCallback(async () => {
        const callId = ++fetchCounter.current;

        setIsLoading(true);
        setError(null);

        try {
            const response = await fetchFn();
            // Only update state if this is still the latest call
            if (callId === fetchCounter.current) {
                const result = extractData ? extractData(response) : response;
                setData(result as T);
            }
        } catch (err: any) {
            if (callId === fetchCounter.current) {
                const message =
                    err?.response?.data?.message ||
                    err?.message ||
                    'An unexpected error occurred.';
                setError(message);
                console.error('[useAsyncData] Fetch error:', err);
            }
        } finally {
            if (callId === fetchCounter.current) {
                setIsLoading(false);
            }
        }
    }, deps); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        executeFetch();
    }, [executeFetch]);

    const reset = useCallback(() => {
        setData(initialData);
        setError(null);
        setIsLoading(false);
    }, [initialData]);

    return { data, isLoading, error, refetch: executeFetch, setData, reset };
}

export default useAsyncData;
