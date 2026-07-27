// PoDM_project/server/services/wallet.service.ts
import supabase from '../config/supabaseClient';

export const PLATFORM_TREASURY_ADDRESS = process.env.PLATFORM_TREASURY_ADDRESS || '0x71c3a2891A15245d2416C77eb460B274AB1C7903';

/**
 * Single canonical backend service method to resolve a user's crypto wallet address.
 * Automatically falls back to the Platform Treasury Wallet if unconfigured.
 */
export async function getCryptoWalletForUser(userId: string): Promise<string> {
    if (!userId) return PLATFORM_TREASURY_ADDRESS;

    try {
        const { data: profile } = await supabase
            .from('profiles')
            .select('crypto_wallet_address')
            .eq('id', userId)
            .maybeSingle();

        const address = profile?.crypto_wallet_address;
        if (address && address.trim().length > 0) {
            return address.trim();
        }
    } catch (err) {
        console.error(`[wallet.service] Failed to fetch wallet address for user ${userId}:`, err);
    }

    return PLATFORM_TREASURY_ADDRESS;
}
