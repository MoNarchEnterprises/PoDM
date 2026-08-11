import { useState, useCallback, useEffect } from 'react';

const BASE_SEPOLIA_CHAIN_ID = '0x14a34';
const BASE_SEPOLIA_CHAIN_ID_NUM = 84532;

const USDC_ADDRESSES: Record<number, string> = {
    84532: '0x036CbD53842c5426634e7929541eC2318F3dCF7e',
    8453: '0x833589fCD6eDb6E08f4c7C32D4f71b54bda02913',
};

const ERC20_BALANCE_OF_ABI = '0x70a08231';

function getRpcUrl(): string {
    return import.meta.env.VITE_BASE_RPC_URL || import.meta.env.VITE_BASE_TESTNET_RPC_URL || 'https://sepolia.base.org';
}

function getUsdcAddress(): string {
    const chainId = Number(window.ethereum?.chainId) || BASE_SEPOLIA_CHAIN_ID_NUM;
    return USDC_ADDRESSES[chainId] || USDC_ADDRESSES[BASE_SEPOLIA_CHAIN_ID_NUM];
}

export const useCryptoWallet = () => {
    const [isConnected, setIsConnected] = useState<boolean>(false);
    const [walletAddress, setWalletAddress] = useState<string | null>(null);
    const [balance, setBalance] = useState<number>(0);
    const [chainId, setChainId] = useState<number>(0);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const fetchUsdcBalance = useCallback(async (address: string): Promise<number> => {
        try {
            const usdcAddress = getUsdcAddress();
            const data = ERC20_BALANCE_OF_ABI + address.slice(2).toLowerCase().padStart(64, '0');

            const eth = window.ethereum;
            if (eth) {
                try {
                    const result = await eth.request({
                        method: 'eth_call',
                        params: [{ to: usdcAddress, data }, 'latest'],
                    });
                    if (result && result !== '0x') {
                        return Number(BigInt(result as string)) / 1e6;
                    }
                } catch {
                    // Fall back to HTTP RPC below
                }
            }

            // Direct HTTP RPC fetch (works for manual wallet addresses without extension)
            const rpcUrl = getRpcUrl();
            const response = await fetch(rpcUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    id: 1,
                    method: 'eth_call',
                    params: [{ to: usdcAddress, data }, 'latest'],
                }),
            });
            const resJson = await response.json();
            if (resJson.result && resJson.result !== '0x') {
                return Number(BigInt(resJson.result)) / 1e6;
            }
            return 0;
        } catch (err) {
            console.error('[useCryptoWallet] Error fetching USDC balance:', err);
            return 0;
        }
    }, []);

    const switchToBaseSepolia = useCallback(async (eth: { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> }): Promise<void> => {
        try {
            await eth.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: BASE_SEPOLIA_CHAIN_ID }],
            });
        } catch (switchError: unknown) {
            const err = switchError as { code?: number; message?: string };
            if (err.code === 4902) {
                await eth.request({
                    method: 'wallet_addEthereumChain',
                    params: [{
                        chainId: BASE_SEPOLIA_CHAIN_ID,
                        chainName: 'Base Sepolia Testnet',
                        nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
                        rpcUrls: [getRpcUrl()],
                        blockExplorerUrls: ['https://sepolia.basescan.org'],
                    }],
                });
            } else {
                throw new Error('Please switch your wallet to Base Sepolia to continue.');
            }
        }
    }, []);

    const connectWallet = useCallback(async (type: 'embedded' | 'custom', customAddress?: string) => {
        setIsLoading(true);
        setError(null);
        try {
            if (customAddress && customAddress.startsWith('0x') && customAddress.length === 42) {
                setWalletAddress(customAddress);
                setChainId(Number(import.meta.env.VITE_CHAIN_ID) || 84532);
                setIsConnected(true);
                const usdcBalance = await fetchUsdcBalance(customAddress);
                setBalance(usdcBalance);
                setIsLoading(false);
                return;
            }

            const eth = window.ethereum;
            if (!eth) {
                setError('No browser extension wallet detected. Use Credit Card (Coinbase On-Ramp) or enter your wallet address below.');
                setIsLoading(false);
                return;
            }

            const accounts = (await eth.request({ method: 'eth_requestAccounts' })) as string[];
            if (!accounts || accounts.length === 0) {
                throw new Error('No accounts returned from wallet.');
            }

            await switchToBaseSepolia(eth);

            const hexChainId = (await eth.request({ method: 'eth_chainId' })) as string;
            const currentChainId = Number(hexChainId);

            setWalletAddress(accounts[0]);
            setChainId(currentChainId);
            setIsConnected(true);

            const usdcBalance = await fetchUsdcBalance(accounts[0]);
            setBalance(usdcBalance);
        } catch (err: unknown) {
            const errorObj = err as { message?: string };
            setError(errorObj.message || 'Failed to connect wallet.');
        } finally {
            setIsLoading(false);
        }
    }, [fetchUsdcBalance, switchToBaseSepolia]);

    const disconnectWallet = useCallback(async () => {
        setIsConnected(false);
        setWalletAddress(null);
        setBalance(0);
        setChainId(0);
        setError(null);
    }, []);

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
            const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
            };
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const response = await fetch('/api/v1/payments/crypto/verify', {
                method: 'POST',
                headers,
                body: JSON.stringify(params),
            });

            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.message || 'Payment verification failed.');
            }
            return result.data;
        } catch (err: unknown) {
            const errorObj = err as { message?: string };
            setError(errorObj.message || 'An error occurred during verification.');
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        const eth = window.ethereum;
        if (!eth) return;

        const handleAccountsChanged = (accounts: string[]) => {
            if (accounts.length === 0) {
                disconnectWallet();
            } else {
                setWalletAddress(accounts[0]);
                fetchUsdcBalance(accounts[0]).then(setBalance);
            }
        };

        const handleChainChanged = () => {
            window.location.reload();
        };

        eth.on('accountsChanged', handleAccountsChanged);
        eth.on('chainChanged', handleChainChanged);

        return () => {
            eth.removeListener('accountsChanged', handleAccountsChanged);
            eth.removeListener('chainChanged', handleChainChanged);
        };
    }, [disconnectWallet, fetchUsdcBalance]);

    return {
        isConnected,
        walletAddress,
        balance,
        chainId,
        isLoading,
        error,
        connectWallet,
        disconnectWallet,
        verifyTransactionOnBackend,
    };
};

export default useCryptoWallet;
