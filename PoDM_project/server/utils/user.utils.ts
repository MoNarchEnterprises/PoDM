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
        id, username, fullName, full_name, avatar_url, bio, email, created_at, role, status,
        onboarding_complete, commission_rate, verification_data,
        creator_data
    } = flatUser;


    // --- ADD THIS LOGIC BLOCK ---
    // The baseUser object now ONLY contains fields common to ALL roles.
    const baseUser: User = {
        id: id,
        username: username || 'unknown_user',
        email: email || '',
        created_at: created_at,
        role,
        status,
        crypto_wallet_address: flatUser.crypto_wallet_address || '',
        updated_at: flatUser.updated_at,
        profile: {
            name: fullName || full_name || username || 'Unknown User',
            avatar: avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName || full_name || username || 'U')}&background=random`,
            bio: bio || '',
        },
    };

    // If the user is a creator, we build the extended Creator object
    if (role === 'creator') {
        let verificationStatus: Creator['verification_status'] = 'not_submitted';
        if (status === 'active') verificationStatus = 'verified';
        else if (status === 'pending verification' && verification_data) verificationStatus = 'pending';

        // CORRECT: Now destructure the nested properties from the creator_data object
        // Handle null creator_data safely
        const safeCreatorData = creator_data || {};
        const {
            subscriptionTiers = [],
            welcomeMessage = { isActive: false, message: '' },
            payoutSettings = {},
            contentSettings = {},
            coverImageUrl,
            socialLinks,
        } = safeCreatorData;


        // Construct the Creator object
        const creatorUser: Creator = {
            ...baseUser,
            // Add creator-specific top-level fields
            verification_status: verificationStatus,
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
            creator_data: {
                subscriptionTiers: (subscriptionTiers || []).map((tier: any) => ({
                    ...tier,
                    price: typeof tier.price === 'string' ? parseFloat(tier.price) : tier.price,
                })),
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
