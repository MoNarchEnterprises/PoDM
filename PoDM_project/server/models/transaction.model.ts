import supabase from '../config/supabaseClient';
import { Transaction } from '@common/types/Transaction';

/**
 * Creates a new transaction record in the database.
 * This should be called after a successful payment event from Stripe.
 * @param transactionData - The data for the new transaction.
 * @returns The newly created transaction object.
 */
export const createTransaction = async (transactionData: Partial<Transaction>): Promise<Transaction | null> => {
    const { data, error } = await supabase
        .from('transactions')
        .insert([transactionData])
        .select()
        .single();

    if (error) {
        console.error('Error creating transaction:', error.message);
        return null;
    }
    return data as Transaction;
};

/**
 * Finds a transaction by its unique ID.
 * @param id - The ID of the transaction to find.
 * @returns The transaction object or null if not found.
 */
export const findTransactionById = async (id: string): Promise<Transaction | null> => {
    const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        console.error('Error finding transaction by ID:', error.message);
        return null;
    }
    return data as Transaction;
};

/**
 * Finds all transactions for a specific user (either as a fan or creator).
 * @param userId - The UUID of the user.
 * @returns An array of transaction objects.
 */
export const findTransactionsByUser = async (userId: string): Promise<Transaction[] | null> => {
    const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .or(`fan_id.eq.${userId},creator_id.eq.${userId}`)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error finding transactions by user:', error.message);
        return null;
    }
    return data as Transaction[];
};

/**
 * Updates the status of a transaction, typically based on a webhook from Stripe.
 * @param paymentGatewayId - The ID of the transaction from the payment processor (e.g., Stripe).
 * @param status - The new status of the transaction.
 * @returns The updated transaction object.
 */
export const updateTransactionStatus = async (paymentGatewayId: string, status: Transaction['status']): Promise<Transaction | null> => {
    const { data, error } = await supabase
        .from('transactions')
        .update({ status })
        .eq('payment_gateway_id', paymentGatewayId)
        .select()
        .single();

    if (error) {
        console.error('Error updating transaction status:', error.message);
        return null;
    }
    return data as Transaction;
};

/**
 * Calculates the sum of the platform fee over a given number of days.
 * @param days - The number of days to look back.
 * @returns The total platform fee in cents.
 */
export const sumPlatformFeeForPeriod = async (days: number): Promise<number> => {
    const date = new Date();
    date.setDate(date.getDate() - days);
    const thirtyDaysAgo = date.toISOString();

    const { data, error } = await supabase
        .from('transactions')
        .select('platform_fee')
        .gte('created_at', thirtyDaysAgo)
        .eq('status', 'Cleared');

    if (error) {
        console.error('Error summing platform fee:', error.message);
        return 0;
    }

    return data.reduce((sum, transaction) => sum + transaction.platform_fee, 0);
};

/**
 * Find successful transaction by fan and content ID.
 * @param fanId - The ID of the fan.
 * @param contentId - The ID of the content.
 * 
 */
export const findSuccessfulTransactionByFanAndContent = async (fanId: string, contentId: string): Promise<Transaction | null> => {
    const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('fan_id', fanId)
        .eq('content_id', contentId)
        .eq('status', 'Cleared')
        .single();

    if (error) {
        console.error('Error finding successful transaction by fan and content:', error.message);
        return null;
    }
    return data as Transaction;
}