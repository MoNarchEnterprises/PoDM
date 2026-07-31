import supabase from '../config/supabaseClient';
import { Transaction } from '../../common/types/Transaction';
import { handleQuery, handleCount, handleList } from '../utils/database';

export const createTransaction = async (transactionData: Partial<Transaction>): Promise<Transaction | null> => {
    return handleQuery<Transaction>(
        supabase.from('transactions').insert([transactionData]).select().single(),
        'create transaction'
    );
};

export const findTransactionById = async (id: string): Promise<Transaction | null> => {
    return handleQuery<Transaction>(
        supabase.from('transactions').select('*').eq('id', id).single(),
        'find transaction by ID', id
    );
};

export const findTransactionsByUser = async (userId: string): Promise<Transaction[] | null> => {
    return handleList<Transaction>(
        supabase.from('transactions').select('*').or(`fan_id.eq.${userId},creator_id.eq.${userId}`).order('created_at', { ascending: false }),
        'find transactions by user'
    );
};

export const updateTransactionStatus = async (blockchainTxHash: string, status: Transaction['status']): Promise<Transaction | null> => {
    return handleQuery<Transaction>(
        supabase.from('transactions').update({ status }).eq('blockchain_tx_hash', blockchainTxHash).select().single(),
        'update transaction status'
    );
};

export const findTransactionByBlockchainTxHash = async (blockchainTxHash: string): Promise<Transaction | null> => {
    return handleQuery<Transaction>(
        supabase.from('transactions').select('*').eq('blockchain_tx_hash', blockchainTxHash).single(),
        'find transaction by blockchain tx hash'
    );
};

export const findClearedSubscriptionByTxHash = async (blockchainTxHash: string, fanId: string, creatorId: string): Promise<Transaction | null> => {
    return handleQuery<Transaction>(
        supabase.from('transactions').select('*')
            .eq('blockchain_tx_hash', blockchainTxHash)
            .eq('fan_id', fanId)
            .eq('creator_id', creatorId)
            .eq('type', 'Subscription')
            .eq('status', 'Cleared')
            .maybeSingle(),
        'find cleared subscription transaction by hash'
    );
};

export const sumPlatformFeeForPeriod = async (days: number): Promise<number> => {
    const date = new Date();
    date.setDate(date.getDate() - days);
    const thirtyDaysAgo = date.toISOString();

    const data = await handleList<{ platform_fee: number }>(
        supabase.from('transactions').select('platform_fee').gte('created_at', thirtyDaysAgo).eq('status', 'Cleared'),
        'sum platform fee for period'
    );
    if (!data) return 0;

    return data.reduce((sum, transaction) => sum + transaction.platform_fee, 0);
};

export const sumCreatorEarningsForPeriod = async (creatorId: string, startDate: Date, endDate: Date): Promise<number> => {
    const data = await handleList<{ creator_payout: number }>(
        supabase.from('transactions').select('creator_payout').eq('creator_id', creatorId).in('status', ['Cleared', 'Pending']).gte('created_at', startDate.toISOString()).lte('created_at', endDate.toISOString()),
        'sum creator earnings for period'
    );
    if (!data) return 0;

    return data.reduce((sum, transaction) => sum + transaction.creator_payout, 0);
};

export const findSuccessfulTransactionByFanAndContent = async (fanId: string, contentId: string): Promise<Transaction | null> => {
    return handleQuery<Transaction>(
        supabase.from('transactions').select('*').eq('fan_id', fanId).eq('related_content_id', contentId).eq('status', 'Cleared').limit(1).maybeSingle(),
        'find successful transaction by fan and content'
    );
}

export const findAllReports = async (): Promise<any[] | null> => {
    return handleList<any>(
        supabase.from('saved_reports').select('*').order('created_at', { ascending: false }),
        'find all saved reports'
    );
}

export const saveReport = async (report: any): Promise<any | null> => {
    return handleQuery<any>(
        supabase.from('saved_reports').insert([{
            name: report.name,
            metrics: report.metrics,
            filters: report.filters,
            date_range: report.dateRange ? report.dateRange : null,
            data: report.data,
            created_at: report.lastRun
        }]).select().single(),
        'save report'
    );
};

export const countTransactionsByTypeAndPeriod = async (type: Transaction['type'], startDate: Date): Promise<number> => {
    return handleCount(
        supabase.from('transactions').select('*', { count: 'exact', head: true }).eq('type', type).eq('status', 'Cleared').gte('created_at', startDate.toISOString()),
        'count transactions by type and period'
    );
};

export const getTransactionStats = async (
    startDate: Date,
    endDate: Date,
    groupBy: 'month' | 'day' = 'month',
    creatorId?: string
) => {
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

    const transactions = await handleList<any>(query, 'get transaction stats');
    if (!transactions) return { revenueGrowth: [], engagement: [] };

    const revenueMap = new Map<string, number>();
    const engagementMap = new Map<string, { messages: number, unlocks: number }>();
    const dateKeys: string[] = [];

    if (groupBy === 'month') {
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        let current = new Date(startDate);
        current.setDate(1);

        const spansMultipleYears = startDate.getFullYear() !== endDate.getFullYear();

        while (current <= endDate) {
            const key = spansMultipleYears
                ? `${monthNames[current.getMonth()]} ${current.getFullYear()}`
                : monthNames[current.getMonth()];

            if (!dateKeys.includes(key)) dateKeys.push(key);

            if (!revenueMap.has(key)) revenueMap.set(key, 0);
            if (!engagementMap.has(key)) engagementMap.set(key, { messages: 0, unlocks: 0 });

            current.setMonth(current.getMonth() + 1);
        }
    } else {
        let current = new Date(startDate);
        while (current <= endDate) {
            const label = `${current.getDate()}`;
            if (!dateKeys.includes(label)) dateKeys.push(label);

            if (!revenueMap.has(label)) revenueMap.set(label, 0);
            if (!engagementMap.has(label)) engagementMap.set(label, { messages: 0, unlocks: 0 });

            current.setDate(current.getDate() + 1);
        }
    }

    const spansMultipleYears = startDate.getFullYear() !== endDate.getFullYear();

    transactions.forEach(t => {
        const d = new Date(t.created_at);
        let key = '';

        if (groupBy === 'month') {
            const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            key = spansMultipleYears
                ? `${monthNames[d.getMonth()]} ${d.getFullYear()}`
                : monthNames[d.getMonth()];
        } else {
            key = `${d.getDate()}`;
        }

        if (!revenueMap.has(key)) {
            if (groupBy === 'month') {
                if (!dateKeys.includes(key)) dateKeys.push(key);
                revenueMap.set(key, 0);
                engagementMap.set(key, { messages: 0, unlocks: 0 });
            }
        }

        if (revenueMap.has(key)) {
            revenueMap.set(key, (revenueMap.get(key) || 0) + (t.platform_fee || 0));

            const currentEng = engagementMap.get(key) || { messages: 0, unlocks: 0 };

            if (t.type === 'PPV Post') {
                currentEng.unlocks += 1;
            } else if (t.type === 'PPV Message') {
                currentEng.messages += 1;
                currentEng.unlocks += 1;
            }
        }
    });

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

export const getTopCreatorsByRevenue = async (limit: number, startDate: Date, endDate: Date): Promise<{ name: string; revenue: number }[]> => {
    const transactions = await handleList<{ creator_id: string; creator_payout: number }>(
        supabase.from('transactions').select('creator_id, creator_payout').eq('status', 'Cleared').gte('created_at', startDate.toISOString()).lte('created_at', endDate.toISOString()),
        'get top creators by revenue'
    );
    if (!transactions) return [];

    const creatorRevenueMap = new Map<string, number>();
    transactions.forEach(t => {
        if (t.creator_id) {
            creatorRevenueMap.set(t.creator_id, (creatorRevenueMap.get(t.creator_id) || 0) + t.creator_payout);
        }
    });

    const sortedCreators = Array.from(creatorRevenueMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit);

    const result: { name: string; revenue: number }[] = [];

    if (sortedCreators.length > 0) {
        const creatorIds = sortedCreators.map(c => c[0]);
        const { data: profiles, error } = await supabase
            .from('profiles')
            .select('id, username, full_name')
            .in('id', creatorIds);

        if (error) {
            console.error("ERROR fetching creator profiles:", error);
        }

        const nameMap = new Map<string, string>();
        profiles?.forEach(p => {
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
