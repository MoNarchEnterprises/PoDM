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
        id, username, fullName, avatar_url, bio, email, created_at, role, status,
        onboarding_complete, commission_rate, verification_data, stripe_customer_id,
        creator_data = {} 
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
            name: fullName ||username || 'Unknown User',
            avatar: avatar_url || 'https://placehold.co/150x150/7E22CE/FFFFFF?text=U',
            bio: bio || '',
        },
    };

    // If the user is a creator, we build the extended Creator object
    if (role === 'creator') {
        let verificationStatus: Creator['verificationStatus'] = 'not_submitted';
        if (status === 'active') verificationStatus = 'verified';
        else if (status === 'pending verification' && verification_data) verificationStatus = 'pending';

        // CORRECT: Now destructure the nested properties from the creator_data object
        const {
            subscriptionTiers = [],
            welcomeMessage = { isActive: false, message: '' },
            payoutSettings = {},
            contentSettings = {},
            coverImageUrl,
            socialLinks,
        } = creator_data;

        
        // Construct the Creator object
        const creatorUser: Creator = {
            ...baseUser,
            // Add creator-specific top-level fields
            verificationStatus,
            onboarding_complete: onboarding_complete || false,
            commission_rate: commission_rate,
            verification_data: verification_data,
            
            // Re-assign the profile object to include creator-specific profile fields
            profile: {
                ...baseUser.profile,
                coverImageUrl, 
                socialLinks,     
            },

            // The remaining data stays in the nested creatorData object
            creatorData: {
                subscriptionTiers,
                welcomeMessage,
                payoutSettings,
                contentSettings,
            },
        };
        return creatorUser;
    }

    // Otherwise, return the base user object for fans/admins
    return baseUser as User;
};
