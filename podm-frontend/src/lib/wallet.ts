// podm-frontend/src/lib/wallet.ts

export const PLATFORM_TREASURY_ADDRESS = '0x71c3a2891A15245d2416C77eb460B274AB1C7903';

type WalletHolder = {
    crypto_wallet_address?: string;
    cryptoWalletAddress?: string;
    profile?: {
        crypto_wallet_address?: string;
        cryptoWalletAddress?: string;
    };
};

/**
 * Single canonical function to extract a crypto wallet address from any user or creator object shape.
 * Returns empty string if no wallet is configured — never falls back to treasury.
 */
export function getCryptoWallet(target?: unknown): string {
    if (!target || typeof target !== 'object') return '';
    const obj = target as WalletHolder;

    const address = obj.crypto_wallet_address ||
        obj.profile?.crypto_wallet_address ||
        obj.cryptoWalletAddress ||
        obj.profile?.cryptoWalletAddress;

    return (address && address.trim().length > 0) ? address.trim() : '';
}

/**
 * Checks whether a user or creator has explicitly configured a custom crypto wallet address.
 */
export function hasConfiguredCryptoWallet(target?: unknown): boolean {
    if (!target || typeof target !== 'object') return false;
    const obj = target as WalletHolder;
    const address = obj.crypto_wallet_address ||
        obj.profile?.crypto_wallet_address ||
        obj.cryptoWalletAddress ||
        obj.profile?.cryptoWalletAddress;
    return !!(address && address.trim().length > 0);
}
