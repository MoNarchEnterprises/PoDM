import supabase from '../config/supabaseClient';
import { AppError } from '../middleware/error.middleware';
import * as TransactionModel from './transaction.model';

export interface Contest {
    id: string;
    creator_id: string;
    title: string;
    description: string;
    start_date: string;
    end_date: string;
    entry_requirements: Record<string, any>;
    prize_description: string;
    status: 'draft' | 'active' | 'completed' | 'canceled';
    winner_id?: string;
    entry_type: 'standard' | 'weighted_spend';
    entry_multiplier?: number; // Deprecated
    spend_threshold?: number;
    additional_entries?: number;
    created_at: string;
    winner_details?: {
        username: string;
        avatar_url?: string;
    };
}

export interface ContestEntry {
    id: string;
    contest_id: string;
    fan_id: string;
    entered_at: string;
}

export const createContest = async (contestData: Partial<Contest>): Promise<Contest> => {
    const { data, error } = await supabase
        .from('contests')
        .insert([contestData])
        .select()
        .single();

    if (error) throw new Error(error.message);
    return data;
};

export const getContestById = async (id: string): Promise<Contest | null> => {
    const { data, error } = await supabase
        .from('contests')
        .select('*')
        .eq('id', id)
        .single();

    if (error) return null;
    return data;
};

export const getContestsByCreator = async (creatorId: string): Promise<Contest[]> => {
    const { data, error } = await supabase
        .from('contests')
        .select('*')
        .eq('creator_id', creatorId)
        .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);

    // Enrich with winner details manually to avoid complex join syntax guessing
    const contests = await Promise.all(data.map(async (contest) => {
        if (contest.winner_id) {
            const { data: winner } = await supabase
                .from('profiles')
                .select('username, avatar_url')
                .eq('id', contest.winner_id)
                .single();

            if (winner) {
                return { ...contest, winner_details: winner };
            }
        }
        return contest;
    }));

    return contests || [];
};

export const getActiveContestsForFan = async (): Promise<Contest[]> => {
    const now = new Date().toISOString();
    const { data, error } = await supabase
        .from('contests')
        .select('*')
        .eq('status', 'active')
        .lte('start_date', now)
        .gte('end_date', now)
        .order('end_date', { ascending: true });

    if (error) throw new Error(error.message);
    return data || [];
};

export const updateContest = async (id: string, updates: Partial<Contest>): Promise<Contest> => {
    const { data, error } = await supabase
        .from('contests')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    if (error) throw new Error(error.message);
    return data;
};

export const createEntry = async (contestId: string, fanId: string): Promise<ContestEntry> => {
    const { data, error } = await supabase
        .from('contest_entries')
        .insert([{ contest_id: contestId, fan_id: fanId }])
        .select()
        .single();

    if (error) {
        if (error.code === '23505') { // Unique violation
            throw new AppError('You have already entered this contest.', 400);
        }
        throw new Error(error.message);
    }
    return data;
};

export const getEntriesForContest = async (contestId: string): Promise<ContestEntry[]> => {
    const { data, error } = await supabase
        .from('contest_entries')
        .select('*')
        .eq('contest_id', contestId);

    if (error) throw new Error(error.message);
    return data || [];
};

/**
 * Validates if a user has entered a contest.
 */
export const hasUserEntered = async (contestId: string, fanId: string): Promise<boolean> => {
    const { data, error } = await supabase
        .from('contest_entries')
        .select('id')
        .eq('contest_id', contestId)
        .eq('fan_id', fanId)
        .maybeSingle();

    if (error) return false;
    return !!data;
};

/**
 * Picks a winner based on the contest type.
 */
export const pickWinner = async (contestId: string): Promise<string> => {
    const contest = await getContestById(contestId);
    if (!contest) throw new AppError('Contest not found', 404);

    // 1. Get all entries (manual entries)
    // Note: For 'weighted_spend', we assume all eligible people HAVE to click "Enter" 
    // to verify age/consent, even if entries are calculated dynamically. 
    // Or we can auto-enter everyone. For this MVP, let's assume "Opt-in" via contest_entries table is required.
    const entries = await getEntriesForContest(contestId);

    if (entries.length === 0) {
        throw new AppError('No entries found for this contest.', 400);
    }

    let winnerFanId = '';

    if (contest.entry_type === 'standard') {
        // Simple random draw
        const randomIndex = Math.floor(Math.random() * entries.length);
        winnerFanId = entries[randomIndex].fan_id;
    }
    else if (contest.entry_type === 'weighted_spend') {
        // Weighted draw based on spend
        const pool: { fanId: string; tickets: number }[] = [];
        let totalTickets = 0;

        // Configuration for weights
        const spendThresholdCents = contest.spend_threshold || 100; // Default $1.00
        const entriesPerThreshold = contest.additional_entries || 1; // Default 1 ticket per $1

        // Fetch transactions for all entrants within the window
        // Optimization: In production, do this in SQL or Batch. Here we loop (MVP).
        for (const entry of entries) {
            const startDate = new Date(contest.start_date);
            const endDate = new Date(contest.end_date);

            // Get user's spend on THIS creator
            // Note: transaction model helper needed "sumFanSpendForCreator(fanId, creatorId, start, end)"
            // implementing inline query here for speed
            const { data: transactions } = await supabase
                .from('transactions')
                .select('amount')
                .eq('fan_id', entry.fan_id)
                .eq('creator_id', contest.creator_id)
                .in('status', ['Cleared'])
                .gte('created_at', startDate.toISOString())
                .lte('created_at', endDate.toISOString());

            const totalSpendCents = transactions?.reduce((sum: number, t: { amount: number }) => sum + t.amount, 0) || 0;

            // Formula: 1 Base Entry + (Spend / Threshold * Multiplier)
            // e.g. Threshold 500 ($5), Entries 2. Spend 1200 ($12). 
            // 1 + floor(1200 / 500) * 2 = 1 + 2 * 2 = 5 tickets.
            const additionalTickets = Math.floor(totalSpendCents / spendThresholdCents) * entriesPerThreshold;
            const entriesCount = 1 + additionalTickets;

            pool.push({ fanId: entry.fan_id, tickets: entriesCount });
            totalTickets += entriesCount;
        }

        // Pick a winning ticket number
        let winningTicket = Math.floor(Math.random() * totalTickets);

        // Find which user holds that ticket
        for (const player of pool) {
            winningTicket -= player.tickets;
            if (winningTicket < 0) {
                winnerFanId = player.fanId;
                break;
            }
        }
    }

    // Update contest with winner
    await updateContest(contestId, {
        status: 'completed',
        winner_id: winnerFanId
    });

    return winnerFanId;
};
