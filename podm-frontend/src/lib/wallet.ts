// podm-frontend/src/lib/wallet.ts

export const PLATFORM_TREASURY_ADDRESS = '0x71c3a2891A15245d2416C77eb460B274AB1C7903';

/**
 * Single canonical function to extract a crypto wallet address from any user or creator object shape.
 * Returns empty string if no wallet is configured — never falls back to treasury.
 */
export function getCryptoWallet(target?: any): string {
    if (!target) return '';

    const address = target.crypto_wallet_address ||
        target.profile?.crypto_wallet_address ||
        target.cryptoWalletAddress ||
        target.profile?.cryptoWalletAddress;

    return (address && address.trim().length > 0) ? address.trim() : '';
}

/**
 * Checks whether a user or creator has explicitly configured a custom crypto wallet address.
 */
export function hasConfiguredCryptoWallet(target?: any): boolean {
    if (!target) return false;
    const address = target.crypto_wallet_address ||
        target.profile?.crypto_wallet_address ||
        target.cryptoWalletAddress ||
        target.profile?.cryptoWalletAddress;
    return !!(address && address.trim().length > 0);
}
