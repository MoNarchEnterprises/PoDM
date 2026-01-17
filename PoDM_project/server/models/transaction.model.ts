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
        .limit(1)
        .maybeSingle();

    if (error) {
        console.error('Error finding successful transaction by fan and content:', error.message);
        return null;
    }
    return data as Transaction;
}

/**
 * Find all reports saved by the admin.
 */
/**
 * Find all saved analytics reports.
 */
export const findAllReports = async (): Promise<any[] | null> => {
    const { data, error } = await supabase
        .from('saved_reports')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error finding saved reports:', error.message);
        return null;
    }
    return data;
}

/**
 * Saves a generated report to the database.
 */
export const saveReport = async (report: any): Promise<any | null> => {
    const { data, error } = await supabase
        .from('saved_reports')
        .insert([{
            name: report.name,
            metrics: report.metrics,
            filters: report.filters,
            date_range: report.dateRange ? report.dateRange : null,
            data: report.data,
            created_at: report.lastRun
        }])
        .select()
        .single();

    if (error) {
        console.error('Error saving report:', error.message);
        return null;
    }
    return data;
};

/**
 * Counts transactions by type (e.g., 'tip', 'unlock') within a given date range.
 * @param type - The type of transaction.
 * @param startDate - The start of the date range.
 * @returns The count of transactions.
 */
export const countTransactionsByTypeAndPeriod = async (type: Transaction['type'], startDate: Date): Promise<number> => {
    const { count, error } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('type', type)
        .eq('status', 'Cleared')
        .gte('created_at', startDate.toISOString());

    if (error) {
        console.error('Error counting transactions by type:', error.message);
        return 0;
    }
    return count || 0;
};

/**
 * Fetches transaction statistics (Revenue and Engagement) for a specific period.
 * Supports grouping by 'month' or 'day'.
 */
export const getTransactionStats = async (
    startDate: Date,
    endDate: Date,
    groupBy: 'month' | 'day' = 'month',
    creatorId?: string
) => {
    // 1. Build Query
    let query = supabase
        .from('transactions')
        .select('created_at, platform_fee, type, creator_id')
        .eq('status', 'Cleared')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: true });

    if (creatorId) {
        query = query.eq('creator_id', creatorId);
    }

    const { data: transactions, error } = await query;

    if (error) {
        console.error('Error fetching transaction stats:', error.message);
        return { revenueGrowth: [], engagement: [] };
    }

    if (!transactions) return { revenueGrowth: [], engagement: [] };

    // 2. Initialize Stats Maps
    const revenueMap = new Map<string, number>();
    const engagementMap = new Map<string, { messages: number, unlocks: number }>();
    const dateKeys: string[] = [];

    // Helper to generate keys and initialize maps based on grouping
    if (groupBy === 'month') {
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        // Iterate through months between start and end
        let current = new Date(startDate);
        // Set to first of month to avoid slippage issues
        current.setDate(1);

        // Check if date range spans multiple years
        const spansMultipleYears = startDate.getFullYear() !== endDate.getFullYear();

        while (current <= endDate) {
            // Use "Month Year" if spanning years, otherwise just "Month"
            const key = spansMultipleYears
                ? `${monthNames[current.getMonth()]} ${current.getFullYear()}`
                : monthNames[current.getMonth()];

            // To ensure order, we push to a keys array
            if (!dateKeys.includes(key)) dateKeys.push(key);

            if (!revenueMap.has(key)) revenueMap.set(key, 0);
            if (!engagementMap.has(key)) engagementMap.set(key, { messages: 0, unlocks: 0 });

            current.setMonth(current.getMonth() + 1);
        }
    } else {
        // Group by Day
        let current = new Date(startDate);
        while (current <= endDate) {
            const label = `${current.getDate()}`; // Just the day number "1", "2" etc.
            if (!dateKeys.includes(label)) dateKeys.push(label);

            if (!revenueMap.has(label)) revenueMap.set(label, 0);
            if (!engagementMap.has(label)) engagementMap.set(label, { messages: 0, unlocks: 0 });

            current.setDate(current.getDate() + 1);
        }
    }

    // Determine if we're spanning multiple years for consistent key generation
    const spansMultipleYears = startDate.getFullYear() !== endDate.getFullYear();

    // 3. Process Transactions
    transactions.forEach(t => {
        const d = new Date(t.created_at);
        let key = '';

        if (groupBy === 'month') {
            const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            // CHANGE: Must match the initialization format
            key = spansMultipleYears
                ? `${monthNames[d.getMonth()]} ${d.getFullYear()}`
                : monthNames[d.getMonth()];
        } else {
            key = `${d.getDate()}`;
        }

        // Just in case transaction falls outside initialized buckets (shouldn't happen with correct query)
        if (!revenueMap.has(key)) {
            if (groupBy === 'month') {
                if (!dateKeys.includes(key)) dateKeys.push(key);
                revenueMap.set(key, 0);
                engagementMap.set(key, { messages: 0, unlocks: 0 });
            }
        }

        if (revenueMap.has(key)) {
            // Revenue (Platform Fee)
            revenueMap.set(key, (revenueMap.get(key) || 0) + (t.platform_fee || 0));

            // Engagement
            const currentEng = engagementMap.get(key) || { messages: 0, unlocks: 0 };

            if (t.type === 'PPV Post') {
                currentEng.unlocks += 1;
            } else if (t.type === 'PPV Message') {
                currentEng.messages += 1;
                currentEng.unlocks += 1;
            }
        }
    });

    // 4. Build Result Arrays
    const revenueGrowth = dateKeys.map(key => ({
        name: key,
        Revenue: revenueMap.get(key) || 0
    }));

    const engagement = dateKeys.map(key => {
        const eng = engagementMap.get(key) || { messages: 0, unlocks: 0 };
        return {
            name: key,
            'Messages Sent': eng.messages,
            'Content Unlocked': eng.unlocks
        };
    });

    return { revenueGrowth, engagement };
};

/**
 * Fetches top creators by revenue (creator payout) for a specific period.
 */
export const getTopCreatorsByRevenue = async (limit: number, startDate: Date, endDate: Date): Promise<{ name: string; revenue: number }[]> => {

    // 2. Fetch transactions
    const { data: transactions, error } = await supabase
        .from('transactions')
        .select('creator_id, creator_payout')
        .eq('status', 'Cleared')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

    if (error) {
        console.error('Error fetching top creators:', error.message);
        return [];
    }

    if (!transactions) return [];

    // 3. Aggregate
    const creatorRevenueMap = new Map<string, number>();
    transactions.forEach(t => {
        if (t.creator_id) {
            creatorRevenueMap.set(t.creator_id, (creatorRevenueMap.get(t.creator_id) || 0) + t.creator_payout);
        }
    });

    // 4. Sort and Slice
    const sortedCreators = Array.from(creatorRevenueMap.entries())
        .sort((a, b) => b[1] - a[1]) // Descending revenue
        .slice(0, limit);

    // 5. Fetch User Names
    const result: { name: string; revenue: number }[] = [];

    if (sortedCreators.length > 0) {
        const creatorIds = sortedCreators.map(c => c[0]);
        // Query only standard columns
        const { data: profiles, error } = await supabase
            .from('profiles')
            .select('id, username, full_name')
            .in('id', creatorIds);

        if (error) {
            console.error("ERROR fetching creator profiles:", error);
        }

        // Map ID to Name
        const nameMap = new Map<string, string>();
        profiles?.forEach(p => {
            // Use full_name if available, otherwise username
            const displayName = p.full_name || p.username || 'Unknown';
            nameMap.set(p.id, displayName);
        });

        sortedCreators.forEach(([id, revenue]) => {
            result.push({
                name: nameMap.get(id) || 'Unknown',
                revenue: revenue
            });
        });
    }

    return result;
};