import { User as SupabaseAuthUser } from '@supabase/supabase-js';
import { User } from '@common/types/User';

/**
 * A centralized helper function to transform a user object from the database 
 * and merge it with authenticated user data into the nested structure 
 * expected by the application.
 * * @param dbProfile - The user profile object from the public.profiles table.
 * @param authUser - The user object from supabase.auth.getUser(), which contains the email.
 * @returns A complete User object ready for the application.
 */
export const reshapeUserForApp = (dbProfile: any, authUser: SupabaseAuthUser): User => {
    if (!dbProfile) {
        // Return a structured null or throw an error if the profile is essential
        return null as any;
    }
    
    const { id, username, avatar_url, bio, ...restOfProfile } = dbProfile;
    
    return {
        _id: id, // Map the database 'id' to '_id'
        ...restOfProfile,
        email: authUser.email || '', // Get the email from the secure authUser object
        username: username || 'unknown_user',
        profile: {
            name: username || 'Unknown User', // Use username as the display name
            avatar: avatar_url || 'https://placehold.co/150x150/7E22CE/FFFFFF?text=U',
            bio: bio || '',
        },
    } as User;
};
