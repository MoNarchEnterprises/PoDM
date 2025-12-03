import supabase from '../config/supabaseClient';
import { Transaction } from '../../common/types/Transaction';

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
 * Finds a transaction by its payment gateway ID (e.g., Stripe PaymentIntent ID).
 * @param paymentGatewayId - The ID from the payment processor.
 * @returns The transaction object or null if not found.
 */
export const findTransactionByPaymentGatewayId = async (paymentGatewayId: string): Promise<Transaction | null> => {
    const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('payment_gateway_id', paymentGatewayId)
        .single();

    if (error) {
        if (error.code !== 'PGRST116') {
            console.error('Error finding transaction by gateway ID:', error.message);
        }
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
 * Calculates the sum of a creator's payouts over a given period.
 * @param creatorId - The UUID of the creator.
 * @param startDate - The start of the date range.
 * @param endDate - The end of the date range.
 * @returns The total payout amount in cents.
 */
export const sumCreatorEarningsForPeriod = async (creatorId: string, startDate: Date, endDate: Date): Promise<number> => {
    const { data, error } = await supabase
        .from('transactions')
        .select('creator_payout')
        .eq('creator_id', creatorId)
        .in('status', ['Cleared', 'Pending']) // Sum both cleared and pending for total earnings
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

    if (error) {
        console.error('Error summing creator earnings:', error.message);
        return 0;
    }

    return data.reduce((sum, transaction) => sum + transaction.creator_payout, 0);
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
        .eq('related_content_id', contentId)
        .eq('status', 'Cleared')
        .single();

    if (error) {
        console.error('Error finding successful transaction by fan and content:', error.message);
        return null;
    }
    return data as Transaction;
}

/**
 * Find all reports saved by the admin.
 */
export const findAllReports = async (): Promise<Transaction[] | null> => {
    const { data, error } = await supabase
        .from('reports')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error finding all reports:', error.message);
        return null;
    }
    return data as Transaction[];
}