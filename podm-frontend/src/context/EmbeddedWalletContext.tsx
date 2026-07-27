import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { createEmbeddedWallet, getWalletStatus, getWalletBalance, EmbeddedWalletState } from '../lib/embeddedWalletApi';
import { useEmbeddedWalletEnabled } from '../shared/hooks/useFeatureFlag';
import { useAuth } from '../hooks/useAuth';

interface EmbeddedWalletContextState extends EmbeddedWalletState {
    isLoading: boolean;
    error: string | null;
    refreshBalance: () => Promise<void>;
}

const defaultState: EmbeddedWalletContextState = {
    walletAddress: null,
    smartAccountAddress: null,
    walletProvider: 'none',
    walletStatus: 'none',
    usdcBalance: 0,
    isReady: false,
    isLoading: false,
    error: null,
    refreshBalance: async () => {},
};

const EmbeddedWalletContext = createContext<EmbeddedWalletContextState>(defaultState);

export const useEmbeddedWallet = () => useContext(EmbeddedWalletContext);

export const EmbeddedWalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const { enabled: isFeatureEnabled, isLoading: isFlagLoading } = useEmbeddedWalletEnabled();
    const [state, setState] = useState<Omit<EmbeddedWalletContextState, 'refreshBalance'>>({
        walletAddress: null,
        smartAccountAddress: null,
        walletProvider: 'none',
        walletStatus: 'none',
        usdcBalance: 0,
        isReady: false,
        isLoading: true,
        error: null,
    });

    const refreshBalance = useCallback(async () => {
        if (!state.walletAddress && !state.smartAccountAddress) return;
        try {
            const res = await getWalletBalance();
            setState(prev => ({ ...prev, usdcBalance: res.data?.balance ?? 0 }));
        } catch (err) {
            console.error('Failed to fetch wallet balance', err);
        }
    }, [state.walletAddress, state.smartAccountAddress]);

    useEffect(() => {
        let mounted = true;
        let balanceInterval: ReturnType<typeof setInterval>;

        const initializeWallet = async () => {
            if (isFlagLoading) return;

            const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
            if (!token || !user || !isFeatureEnabled) {
                if (mounted) setState(prev => ({ ...prev, isLoading: false }));
                return;
            }

            try {
                if (mounted) setState(prev => ({ ...prev, isLoading: true, error: null }));
                
                // First check status
                let statusRes = await getWalletStatus();
                let walletData = statusRes.data;

                // If no wallet exists, create one
                if (walletData.walletStatus === 'none' || (!walletData.walletAddress && !walletData.smartAccountAddress)) {
                    const createRes = await createEmbeddedWallet();
                    walletData = createRes.data;
                }

                if (mounted) {
                    setState({
                        walletAddress: walletData.walletAddress,
                        smartAccountAddress: walletData.smartAccountAddress,
                        walletProvider: walletData.walletProvider,
                        walletStatus: walletData.walletStatus,
                        usdcBalance: walletData.usdcBalance ?? 0,
                        isReady: walletData.isReady ?? false,
                        isLoading: false,
                        error: null,
                    });

                    // Start polling balance every 30 seconds
                    balanceInterval = setInterval(() => {
                        refreshBalance();
                    }, 30000);
                }
            } catch (err: any) {
                console.error('Embedded wallet initialization error:', err);
                if (mounted) {
                    setState(prev => ({ 
                        ...prev, 
                        isLoading: false, 
                        error: err.response?.data?.error || err.message || 'Failed to initialize wallet' 
                    }));
                }
            }
        };

        initializeWallet();

        return () => {
            mounted = false;
            if (balanceInterval) clearInterval(balanceInterval);
        };
    }, [user, isFeatureEnabled, isFlagLoading]);

    return (
        <EmbeddedWalletContext.Provider value={{ ...state, refreshBalance }}>
            {children}
        </EmbeddedWalletContext.Provider>
    );
};
