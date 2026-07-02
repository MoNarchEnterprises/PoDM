import { useState, useEffect, useCallback } from 'react';

interface UseAsyncDataResult<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useAsyncData<T>(
  fetchFn: () => Promise<T>,
  deps: any[] = [],
  options?: { onError?: (err: any) => string; debounceMs?: number }
): UseAsyncDataResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refetch = useCallback(() => setRefreshKey(k => k + 1), []);

  useEffect(() => {
    let cancelled = false;
    const execute = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await fetchFn();
        if (!cancelled) setData(result);
      } catch (err: any) {
        if (!cancelled) {
          const message = options?.onError?.(err) || err?.message || 'An error occurred';
          setError(message);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    if (options?.debounceMs) {
      const timer = setTimeout(execute, options.debounceMs);
      return () => { cancelled = true; clearTimeout(timer); };
    } else {
      execute();
      return () => { cancelled = true; };
    }
  }, [...deps, refreshKey]);

  return { data, isLoading, error, refetch };
}

export function useFeedback(autoClearMs = 5000) {
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showFeedback = useCallback((type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    if (autoClearMs > 0) {
      setTimeout(() => setFeedback(null), autoClearMs);
    }
  }, [autoClearMs]);

  return { feedback, showFeedback, setFeedback };
}

export function useAsyncAction() {
  const [isLoading, setIsLoading] = useState(false);
  const execute = useCallback(async <T>(fn: () => Promise<T>): Promise<T | undefined> => {
    setIsLoading(true);
    try { return await fn(); }
    finally { setIsLoading(false); }
  }, []);
  return { isLoading, execute };
}
