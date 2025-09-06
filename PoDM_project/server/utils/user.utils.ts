import { User as SupabaseAuthUser } from '@supabase/supabase-js';
import { User } from '@common/types/User';
import { Creator } from '@common/types/Creator';

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
    const { 
        id, username, avatar_url, bio, email, created_at, role, status,
        onboarding_complete, commission_rate, verification_data, stripe_customer_id,
        // Destructure creator-specific fields with default values
        subscriptionTiers = [],
        welcomeMessage = { isActive: false, message: '' },
        payoutSettings = {},
        contentSettings = {}
    } = flatUser;
    
    // --- ADD THIS LOGIC BLOCK ---
    // The baseUser object now ONLY contains fields common to ALL roles.
    const baseUser: User = {
        _id: id,
        username: username || 'unknown_user',
        email: email || '',
        createdAt: created_at,
        role,
        status,
        updatedAt: flatUser.updated_at, // Assuming this field exists
        profile: {
            name: username || 'Unknown User',
            avatar: avatar_url || 'https://placehold.co/150x150/7E22CE/FFFFFF?text=U',
            bio: bio || '',
        },
    };

    // If the user is a creator, we build the extended Creator object
    if (role === 'creator') {
        let verificationStatus: Creator['verificationStatus'] = 'not_submitted';
        if (status === 'active') verificationStatus = 'verified';
        else if (status === 'pending verification' && verification_data) verificationStatus = 'pending';

        return {
            ...baseUser,
            // Add all creator-specific, top-level properties
            verificationStatus,
            onboarding_complete: onboarding_complete || false,
            commission_rate: commission_rate,
            verification_data: verification_data,
            // Add the nested creatorData object for settings
            creatorData: {
                subscriptionTiers,
                welcomeMessage,
                payoutSettings,
                contentSettings,
            },
        } as Creator;
    }

    // Otherwise, return the base user object for fans/admins
    return baseUser as User;
};
