import { api } from './apiClient';

export interface PaymentIntent {
    type: 'Tip' | 'Subscription' | 'PPV Post' | 'PPV Message';
    amountInCents: number;
    creatorId: string;
    relatedId?: string;
    message?: string;
}

export interface PaymentIntentResult {
    success: boolean;
    transactionId?: string;
    txHash?: string;
    userOpHash?: string;
    error?: string;
}

export interface EmbeddedWalletState {
    walletAddress: string | null;
    smartAccountAddress: string | null;
    walletProvider: string;
    walletStatus: string;
    usdcBalance: number;
    isReady: boolean;
}

export const createEmbeddedWallet = () => api<{ status: string; data: EmbeddedWalletState }>('post', '/wallet/create');
export const getWalletStatus = () => api<{ status: string; data: EmbeddedWalletState }>('get', '/wallet/status');
export const getWalletBalance = () => api<{ status: string; data: { balance: number } }>('get', '/wallet/balance');
export const signPaymentOperation = (intent: PaymentIntent) => api<{ status: string; data: PaymentIntentResult }>('post', '/wallet/sign-operation', intent);
export const recoverWallet = () => api('post', '/wallet/recover');
export const transferUsdcToSmartAccount = () => api<{ status: string; message: string; data: { txHash: string; amount: number } }>('post', '/wallet/transfer-to-smart-account');

export const getFeatureFlags = () => api('get', '/feature-flags');
export const getUserFeatureFlags = () => api<{ status: string; data: Record<string, boolean> }>('get', '/feature-flags/user');
