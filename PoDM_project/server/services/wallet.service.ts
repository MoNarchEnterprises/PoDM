// PoDM_project/server/services/wallet.service.ts
import supabase from '../config/supabaseClient';
import { PrivyWalletProvider } from './embeddedWallet.provider';
import { getOrCreateSmartAccount } from './smartAccount.service';

export const PLATFORM_TREASURY_ADDRESS = process.env.PLATFORM_TREASURY_ADDRESS || '0x71c3a2891A15245d2416C77eb460B274AB1C7903';

/**
 * Single canonical backend service method to resolve a user's crypto wallet address.
 * Returns an empty string if unconfigured (never falls back to treasury).
 */
export async function getCryptoWalletForUser(userId: string): Promise<string> {
    if (!userId) return '';

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

    return '';
}

/**
 * Ensures an embedded wallet is provisioned for a user, setting it as default ('embedded' type, 'debit_card' preference).
 */
export async function ensureEmbeddedWalletForUser(userId: string): Promise<string> {
    if (!userId) return '';

    try {
        const { data: profile } = await supabase
            .from('profiles')
            .select('crypto_wallet_address, smart_account_address, wallet_status, crypto_wallet_type')
            .eq('id', userId)
            .maybeSingle();

        if (profile?.crypto_wallet_address && profile?.wallet_status === 'active') {
            if (!profile.crypto_wallet_type) {
                await supabase.from('profiles').update({ crypto_wallet_type: 'embedded' }).eq('id', userId);
            }
            return profile.crypto_wallet_address;
        }

        const walletProvider = new PrivyWalletProvider();
        const result = await walletProvider.createWallet(userId);
        const smartAccount = await getOrCreateSmartAccount(userId, result.address);

        await supabase.from('profiles').update({
            crypto_wallet_address: result.address,
            crypto_wallet_provider_id: result.providerWalletId,
            smart_account_address: smartAccount.address,
            crypto_wallet_type: 'embedded',
            crypto_wallet_payout_preference: 'debit_card',
            wallet_provider: 'privy',
            wallet_status: 'active',
            wallet_created_at: new Date().toISOString()
        }).eq('id', userId);

        await supabase.from('wallet_events').insert({
            user_id: userId,
            event: 'WalletCreated',
            wallet_address: result.address,
            smart_account_address: smartAccount.address
        });

        return result.address;
    } catch (err) {
        console.error(`[wallet.service] Failed to ensure embedded wallet for user ${userId}:`, err);
        return '';
    }
}

