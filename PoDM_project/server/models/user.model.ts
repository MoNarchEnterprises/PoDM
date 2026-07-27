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
    const data = await handleList<User>(
        supabase.rpc('get_all_users_details'),
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
    startDate.setMonth(startDate.getMonth() - months);
    startDate.setDate(1);

    const allUsers: any[] = [];
    let page = 1;
    let hasMore = true;
    const PER_PAGE = 50;

    while (hasMore) {
        const { data, error } = await supabase.auth.admin.listUsers({
            page: page,
            perPage: PER_PAGE
        });

        if (error) {
            console.error('Error fetching users from auth admin:', error.message);
            hasMore = false;
            break;
        }

        if (data && data.users.length > 0) {
            allUsers.push(...data.users);
            if (data.users.length < PER_PAGE) {
                hasMore = false;
            } else {
                page++;
            }
        } else {
            hasMore = false;
        }
    }

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const statsMap = new Map<string, number>();

    for (let i = 0; i < months; i++) {
        const d = new Date();
        d.setMonth(d.getMonth() - (months - 1 - i));
        const key = monthNames[d.getMonth()];
        if (!statsMap.has(key)) {
            statsMap.set(key, 0);
        }
    }

    allUsers.forEach(u => {
        const createdAt = new Date(u.created_at);
        if (createdAt >= startDate) {
            const key = monthNames[createdAt.getMonth()];
            if (statsMap.has(key)) {
                statsMap.set(key, (statsMap.get(key) || 0) + 1);
            }
        }
    });

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
