import { useState, useCallback } from 'react';

interface WalletConfig {
    walletAddress: string | null;
    walletType: 'none' | 'embedded' | 'custom';
    payoutPreference: 'debit_card' | 'on_chain';
}

export const useCryptoWallet = () => {
    const [isConnected, setIsConnected] = useState<boolean>(false);
    const [walletAddress, setWalletAddress] = useState<string | null>(null);
    const [balance, setBalance] = useState<number>(0); // USDC balance
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    /**
     * Connects an embedded Privy/Web3Auth wallet or custom browser extension wallet (MetaMask, Phantom)
     */
    const connectWallet = useCallback(async (type: 'embedded' | 'custom') => {
        setIsLoading(true);
        setError(null);
        try {
            // Simulated connection delay
            await new Promise((resolve) => setTimeout(resolve, 800));
            
            let mockAddress = '';
            if (type === 'embedded') {
                mockAddress = '0x84f2A18DbcF34E8f75b7b64C094B1B3De5F78453'; // System embedded Address on Base
            } else {
                mockAddress = '0x5C3Cb6a26E543aB6d71bB1D50fE32724D3De5F78'; // Custom creator address
            }
            
            setWalletAddress(mockAddress);
            setIsConnected(true);
            setBalance(1250.00); // Set mock balance for initial demonstration
        } catch (err: any) {
            setError(err.message || 'Failed to connect wallet.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    /**
     * Disconnects the connected wallet session
     */
    const disconnectWallet = useCallback(async () => {
        setIsConnected(false);
        setWalletAddress(null);
        setBalance(0);
    }, []);

    /**
     * Submits a transaction hash to the backend for validation on the blockchain
     */
    const verifyTransactionOnBackend = useCallback(async (params: {
        txHash: string;
        creatorId: string;
        amountInCents: number;
        transactionType: 'Tip' | 'PPV Message' | 'PPV Post' | 'Subscription';
        relatedId?: string;
    }) => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await fetch('/api/v1/payments/crypto/verify', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    // Note: Auth token is usually attached by apiClient or fetch interceptors
                },
                body: JSON.stringify(params),
            });

            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.message || 'Payment verification failed.');
            }
            return result.data;
        } catch (err: any) {
            setError(err.message || 'An error occurred during verification.');
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, []);

    return {
        isConnected,
        walletAddress,
        balance,
        isLoading,
        error,
        connectWallet,
        disconnectWallet,
        verifyTransactionOnBackend
    };
};
export default useCryptoWallet;
