import supabase from '../config/supabaseClient';
import { User, UserProfile } from '@common/types/User';
import { handleQuery, handleCount, handleList } from '../utils/database';

export const findUserById = async (id: string): Promise<User | null> => {
    return handleQuery<User>(
        supabase.from('profiles').select('*').eq('id', id).single(),
        'find user by ID', id
    );
};

export const findUserByUsername = async (username: string): Promise<User | null> => {
    return handleQuery<User>(
        supabase.from('profiles').select('*').eq('username', username).single(),
        'find user by username'
    );
};

export const findUserByEmail = async (email: string): Promise<User | null> => {
    return handleQuery<User>(
        supabase.from('profiles').select('*').eq('email', email).single(),
        'find user by email'
    );
};

export const findUsersByIds = async (ids: string[]): Promise<User[]> => {
    if (ids.length === 0) return [];

    const data = await handleList<User>(
        supabase.from('profiles').select('*').in('id', ids),
        'find users by IDs'
    );
    return data || [];
};

export const createProfile = async (profileData: Partial<User>): Promise<User | null> => {
    return handleQuery<User>(
        supabase.from('profiles').insert([profileData]).select().single(),
        'create profile'
    );
};

export const updateProfile = async (id: string, updates: Record<string, any>): Promise<User | null> => {
    return handleQuery<User>(
        supabase.from('profiles').update(updates).eq('id', id).select().single(),
        'update profile', id
    );
};

export const countAllUsers = async (): Promise<number> => {
    return handleCount(
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        'count all users'
    );
};

export const countActiveUsers = async (): Promise<number> => {
    return handleCount(
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        'count active users'
    );
};

export const findAll = async (): Promise<User[] | null> => {
    // Select directly from profiles (service-role client bypasses RLS).
    // The get_all_users_details RPC omits columns like is_enclave_member,
    // which the admin panel needs for the Enclave badge and locked commission.
    const data = await handleList<User>(
        supabase.from('profiles').select('*'),
        'find all users'
    );
    return data || [];
}

export const countActiveCreators = async (): Promise<number> => {
    return handleCount(
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'creator').eq('status', 'active'),
        'count active creators'
    );
};

export const findAdmins = async (): Promise<User[] | null> => {
    return handleList<User>(
        supabase.from('profiles').select('*').eq('role', 'admin'),
        'find admin users'
    );
};

export const getNewUsersOverTime = async (months: number): Promise<{ name: string; Users: number }[]> => {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - (months - 1));
    startDate.setDate(1);
    startDate.setHours(0, 0, 0, 0);

    // Efficiently query created_at timestamps from profiles table using database helper
    const profiles = await handleList<{ created_at: string }>(
        supabase.from('profiles').select('created_at').gte('created_at', startDate.toISOString()),
        'get new users created dates'
    );

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const statsMap = new Map<string, number>();

    for (let i = 0; i < months; i++) {
        const d = new Date();
        d.setMonth(d.getMonth() - (months - 1 - i));
        const key = monthNames[d.getMonth()];
        statsMap.set(key, 0);
    }

    if (profiles) {
        profiles.forEach(p => {
            const createdAt = new Date(p.created_at);
            if (createdAt >= startDate) {
                const key = monthNames[createdAt.getMonth()];
                if (statsMap.has(key)) {
                    statsMap.set(key, (statsMap.get(key) || 0) + 1);
                }
            }
        });
    }

    const result: { name: string; Users: number }[] = [];
    for (let i = 0; i < months; i++) {
        const d = new Date();
        d.setMonth(d.getMonth() - (months - 1 - i));
        const key = monthNames[d.getMonth()];
        result.push({
            name: key,
            Users: statsMap.get(key) || 0
        });
    }

    return result;
};
