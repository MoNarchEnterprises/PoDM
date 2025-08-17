import supabase from '../config/supabaseClient';
import { User, UserProfile } from '@common/types/User';

/**
 * Finds a user's public profile by their unique ID.
 * @param id - The UUID of the user to find.
 * @returns The user's profile object or null if not found.
 */
export const findUserById = async (id: string): Promise<User | null> => {
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        console.error('Error finding user by ID:', error.message);
        return null;
    }
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
export const updateProfile = async (id: string, updates: Partial<UserProfile>): Promise<User | null> => {
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
 * Finds all users with optional filtering.
 * @param query - The query parameters for filtering.      
 */
export const findAll = async (query: any): Promise<User[]> => {
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .match(query);

    if (error) {
        console.error('Error finding users:', error.message);
        return [];
    }
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