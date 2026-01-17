import supabase from '../config/supabaseClient';
import { User, UserProfile } from '@common/types/User';

/**
 * Finds a user's complete profile by their unique ID using an RPC.
 * @param id - The UUID of the user to find.
 * @returns The user's profile object or null if not found.
 */
export const findUserById = async (id: string): Promise<User | null> => {
    const { data, error } = await supabase
        .rpc('get_user_details', { user_id: id }) // Call the new database function
        .single();
    if (error) {
        console.error('Error finding user by ID via RPC:', error.message);
        return null;
    }

    // The RPC returns a single JSON object, which is our data
    return data as User;
};

/**
 * Finds a user's public profile by their username.
 * @param username - The username to search for.
 * @returns The user's profile object or null if not found.
 */
export const findUserByUsername = async (username: string): Promise<User | null> => {
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', username)
        .single();
    if (error) {
        console.error('Error finding user by username:', error.message);
        return null;
    }
    return data as User;
};

/**
 * Finds a user by their email address.
 * @param email - The email address to search for.
 * @returns The user's profile object or null if not found.
 */
export const findUserByEmail = async (email: string): Promise<User | null> => {
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', email)
        .single();
    if (error) {
        console.error('Error finding user by email:', error.message);
        return null;
    }
    return data as User;
};

/**
 * Finds users by an array of IDs.
 * @param ids - Array of user UUIDs.
 * @returns An array of user profile objects.
 */
export const findUsersByIds = async (ids: string[]): Promise<User[]> => {
    if (ids.length === 0) return [];

    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .in('id', ids);

    if (error) {
        console.error('Error finding users by IDs:', error.message);
        return [];
    }
    return data as User[];
};

/**
 * Creates a new public profile for a user after they have signed up.
 * This is typically called right after the user is created in Supabase Auth.
 * @param profileData - The data for the new profile.
 * @returns The newly created profile object.
 */
export const createProfile = async (profileData: Partial<User>): Promise<User | null> => {
    const { data, error } = await supabase
        .from('profiles')
        .insert([profileData])
        .select()
        .single();

    if (error) {
        console.error('Error creating profile:', error.message);
        return null;
    }
    return data as User;
};

/**
 * Updates a user's public profile information.
 * @param id - The UUID of the user to update.
 * @param updates - An object containing the fields to update.
 * @returns The updated profile object.
 */
// This allows us to pass any valid column name, including 'creator_data'.
export const updateProfile = async (id: string, updates: Record<string, any>): Promise<User | null> => {
    const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('Error updating profile:', error.message);
        return null;
    }


    return data as User;
};

/**
 * Counts the total number of users.
 * @returns The total count of users.
 */
export const countAllUsers = async (): Promise<number> => {
    const { count, error } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

    if (error) {
        console.error('Error counting all users:', error.message);
        return 0;
    }
    return count || 0;
};

/**
 * Counts the number of active users.
 */
export const countActiveUsers = async (): Promise<number> => {
    const { count, error } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

    if (error) {
        console.error('Error counting active users:', error.message);
        return 0;
    }
    return count || 0;
};

/**
 * Finds all users with their complete data using an RPC.
 */
export const findAll = async (): Promise<User[] | null> => {
    // We no longer need the 'query' parameter for this basic version
    const { data, error } = await supabase
        .rpc('get_all_users_details');

    if (error) {
        console.error('Error finding all users via RPC:', error.message);
        return [];
    }
    // The RPC returns a single JSON object which is an array of users
    return data as User[];
}

/**
 * Counts the number of active creators.
 * @returns The count of active creators.
 */
export const countActiveCreators = async (): Promise<number> => {
    const { count, error } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'creator')
        .eq('status', 'active');

    if (error) {
        console.error('Error counting active creators:', error.message);
        return 0;
    }
    return count || 0;
};

/**
 * Finds all users with the 'admin' role.
 * @returns An array of admin user objects.
 */
export const findAdmins = async (): Promise<User[] | null> => {
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'admin');

    if (error) {
        console.error('Error finding admin users:', error.message);
        return null;
    }
    return data as User[];
};

/**
 * Counts new users created in each of the last X months.
 * @param months - Number of months to look back.
 * @returns Array of objects { name: string, Users: number }.
 */
/**
 * Counts new users created in each of the last X months.
 * Uses supabase.auth.admin.listUsers() because profiles table (public) may lack created_at.
 * @param months - Number of months to look back.
 * @returns Array of objects { name: string, Users: number }.
 */
export const getNewUsersOverTime = async (months: number): Promise<{ name: string; Users: number }[]> => {
    // 1. Calculate the start date (first day of the month X months ago)
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);
    startDate.setDate(1);

    // 2. Fetch all users using Auth Admin API (pagination required)
    const allUsers: any[] = [];
    let page = 1;
    let hasMore = true;
    const PER_PAGE = 50;

    // Use a loop to fetch all users. 
    // Optimization: In a huge production app, this should be an SQL RPC or dedicated analytics service.
    // For this app scale, fetching pages is acceptable.
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
            // If we got less than requested, we are done
            if (data.users.length < PER_PAGE) {
                hasMore = false;
            } else {
                page++;
            }
        } else {
            hasMore = false;
        }
    }

    // 3. Filter and Group by month in memory
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const statsMap = new Map<string, number>();

    // Initialize all months with 0 to ensure continuity in the chart
    for (let i = 0; i < months; i++) {
        const d = new Date();
        d.setMonth(d.getMonth() - (months - 1 - i));
        const key = monthNames[d.getMonth()];
        if (!statsMap.has(key)) {
            statsMap.set(key, 0);
        }
    }

    // Process users
    allUsers.forEach(u => {
        const createdAt = new Date(u.created_at);
        // Only count if it's after our start date
        if (createdAt >= startDate) {
            const key = monthNames[createdAt.getMonth()];
            if (statsMap.has(key)) {
                statsMap.set(key, (statsMap.get(key) || 0) + 1);
            }
        }
    });

    // 4. Build Result
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