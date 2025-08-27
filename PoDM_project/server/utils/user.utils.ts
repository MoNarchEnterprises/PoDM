import { User as SupabaseAuthUser } from '@supabase/supabase-js';
import { User } from '@common/types/User';

/**
 * A centralized helper function to transform a flat user object from the database RPC
 * into the nested structure expected by the application.
 * @param flatUser - The flat user object from the get_user_details RPC.
 * @returns A complete User object ready for the application.
 */
export const reshapeUserForApp = (flatUser: any): User => {
    if (!flatUser) {
        return null as any;
    }
    
    // Destructure all properties from the flat object
    const { id, username, avatar_url, bio, email, created_at, role, status, verification_data, ...restOfProfile } = flatUser;
    
    // --- ADD THIS LOGIC BLOCK ---
    let verificationStatus: User['verificationStatus'] = 'not_applicable'; // Default for fans/admins

    if (role === 'creator') {
        if (status === 'active') {
            verificationStatus = 'verified';
        } else if (status === 'pending verification' && verification_data) {
            verificationStatus = 'pending';
        } else {
            verificationStatus = 'not_submitted';
        }
    }
    
    return {
        _id: id,
        username: username || 'unknown_user',
        email: email || '',
        createdAt: created_at,
        role,
        status,
        verificationStatus,
        verification_data,
        ...restOfProfile,
        profile: {
            name: username || 'Unknown User',
            avatar: avatar_url || 'https://placehold.co/150x150/7E22CE/FFFFFF?text=U',
            bio: bio || '',
        },
    } as User;
};
