import supabase from '../config/supabaseClient';

/**
 * Calculate platform fee percentage based on creator's monthly earnings
 * @param creatorId - Creator's user ID
 * @param isEnclaveMember - Whether creator is an Enclave member
 * @returns Platform fee percentage (e.g., 15 for 15%)
 */
export const calculatePlatformFeePercentage = async (
    creatorId: string,
    isEnclaveMember: boolean = false
): Promise<number> => {
    // Enclave members always get 10% fee
    if (isEnclaveMember) {
        return 10;
    }

    // Get creator's earnings for the current month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const { data, error } = await supabase
        .from('transactions')
        .select('amount, platform_fee')
        .eq('creator_id', creatorId)
        .gte('created_at', startOfMonth.toISOString());

    if (error) {
        console.error('Error fetching creator earnings:', error);
        // Default to highest tier if error
        return 15;
    }

    // Calculate total earnings this month (amount - platform_fee)
    const totalEarnings = data.reduce((sum, t) => {
        return sum + (t.amount - t.platform_fee);
    }, 0);

    // Convert from cents to dollars
    const earningsInDollars = totalEarnings / 100;

    // Determine tier based on monthly earnings
    if (earningsInDollars <= 5000) {
        return 15; // Tier 1: 0-$5,000/month
    } else if (earningsInDollars <= 10000) {
        return 12.5; // Tier 2: $5,001-$10,000/month
    } else {
        return 10; // Tier 3: $10,001+/month
    }
};

/**
 * Calculate platform fee amount in cents
 * @param amountInCents - Transaction amount in cents
 * @param feePercentage - Platform fee percentage (e.g., 15 for 15%)
 * @returns Platform fee in cents
 */
export const calculatePlatformFee = (amountInCents: number, feePercentage: number): number => {
    return Math.round(amountInCents * (feePercentage / 100));
};
