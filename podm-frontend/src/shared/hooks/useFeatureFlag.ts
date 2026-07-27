import { useState, useEffect } from 'react';
import { getUserFeatureFlags } from '../../lib/embeddedWalletApi';
import { useAuth } from '../../hooks/useAuth';

// Global cache to avoid refetching for every hook instance
let featureFlagsCache: Record<string, boolean> | null = null;
let isFetching = false;
let fetchPromise: Promise<Record<string, boolean>> | null = null;

export const useFeatureFlag = (flagKey: string) => {
    const { user } = useAuth();
    const [enabled, setEnabled] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    useEffect(() => {
        // Kill switch
        if (import.meta.env.VITE_ENABLE_EMBEDDED_WALLET !== 'true') {
            setEnabled(false);
            setIsLoading(false);
            return;
        }

        if (!user) {
            setEnabled(false);
            setIsLoading(false);
            return;
        }

        const fetchFlags = async () => {
            if (featureFlagsCache) {
                setEnabled(!!featureFlagsCache[flagKey]);
                setIsLoading(false);
                return;
            }

            if (!fetchPromise) {
                isFetching = true;
                fetchPromise = getUserFeatureFlags()
                    .then(res => {
                        const flags = res.data || {};
                        featureFlagsCache = flags;
                        return flags;
                    })
                    .catch(err => {
                        console.error('Failed to fetch feature flags:', err);
                        return {};
                    })
                    .finally(() => {
                        isFetching = false;
                        fetchPromise = null;
                    });
            }

            try {
                const flags = await fetchPromise;
                setEnabled(!!flags[flagKey]);
            } catch (err) {
                setEnabled(false);
            } finally {
                setIsLoading(false);
            }
        };

        fetchFlags();
    }, [flagKey, user]);

    return { enabled, isLoading };
};

export const useEmbeddedWalletEnabled = () => {
    return useFeatureFlag('embedded_wallet_enabled');
};
