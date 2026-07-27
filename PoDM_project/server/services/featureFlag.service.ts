import supabase from '../config/supabaseClient';
import { AppError } from '../middleware/error.middleware';
import crypto from 'crypto';
import { WalletFeatureFlag } from '../../common/types/EmbeddedWallet';

const MASTER_KILL_SWITCH = process.env.ENABLE_EMBEDDED_WALLET === 'true';

export const isFeatureEnabled = async (flagKey: WalletFeatureFlag | string, userId?: string): Promise<boolean> => {
    // 1. Env Master Kill Switch check
    if (flagKey.startsWith('embedded_wallet') || flagKey.startsWith('gas_sponsorship') || flagKey.startsWith('smart_account') || flagKey.startsWith('wallet_recovery')) {
        if (!MASTER_KILL_SWITCH && process.env.ENABLE_EMBEDDED_WALLET !== undefined) {
             return false;
        }
    }

    // 2. User override check
    if (userId) {
        const { data: overrideData, error: overrideError } = await supabase
            .from('user_feature_flag_overrides')
            .select('enabled')
            .eq('user_id', userId)
            .eq('flag_key', flagKey)
            .maybeSingle();

        if (overrideError) {
             console.error('[FeatureFlagService] Error fetching user override:', overrideError);
        }
        if (overrideData) {
            return overrideData.enabled;
        }
    }

    // 3. DB Flag & Percentage Rollout
    const { data: flagData, error: flagError } = await supabase
        .from('feature_flags')
        .select('enabled, rollout_percentage')
        .eq('key', flagKey)
        .maybeSingle();
        
    if (flagError) {
        console.error('[FeatureFlagService] Error fetching flag:', flagError);
        return false;
    }
    
    if (!flagData) {
        return false;
    }

    if (!flagData.enabled) {
        return false;
    }

    if (flagData.rollout_percentage < 100 && userId) {
        const hash = crypto.createHash('sha256').update(userId + flagKey).digest('hex');
        const hashNum = parseInt(hash.substring(0, 8), 16);
        return (hashNum % 100) < flagData.rollout_percentage;
    }

    return true;
};

export const getAllFlags = async () => {
    const { data, error } = await supabase
        .from('feature_flags')
        .select('*');
        
    if (error) {
        throw new AppError(`Failed to fetch feature flags: ${error.message}`, 500);
    }
    return data;
};

export const updateFlag = async (flagKey: string, updates: any) => {
    const { data, error } = await supabase
        .from('feature_flags')
        .update(updates)
        .eq('key', flagKey)
        .select()
        .single();
        
    if (error) {
        throw new AppError(`Failed to update feature flag: ${error.message}`, 500);
    }
    return data;
};

export const setUserOverride = async (userId: string, flagKey: string, enabled: boolean, reason?: string) => {
    const { data, error } = await supabase
        .from('user_feature_flag_overrides')
        .upsert({ user_id: userId, flag_key: flagKey, enabled, reason }, { onConflict: 'user_id, flag_key' })
        .select()
        .single();
        
    if (error) {
        throw new AppError(`Failed to set user override: ${error.message}`, 500);
    }
    return data;
};

export const getUserOverrides = async (userId: string) => {
    const { data, error } = await supabase
        .from('user_feature_flag_overrides')
        .select('*')
        .eq('user_id', userId);
        
    if (error) {
        throw new AppError(`Failed to fetch user overrides: ${error.message}`, 500);
    }
    return data;
};
