import * as UserModel from '../models/user.model';
import * as GalleryModel from '../models/gallery.model';
import { AppError } from '../middleware/error.middleware';
import { UserProfile } from '@common/types/User';
import { GalleryItem } from '@common/types/Gallery';
import supabase from '../config/supabaseClient'; // Import the Supabase client
import { reshapeUserForApp } from '../utils/user.utils';
import { SubscriptionTier } from '@common/types/Creator';
import * as ContentModel from '../models/content.model';
import * as SubscriptionModel from '../models/subscription.model';

/**
 * Handles the business logic for fetching a user's public profile.
 * @param username - The username of the profile to fetch.
 * @returns The user's public profile data.
 */
export const getPublicUserProfile = async (username: string) => {
    const user = await UserModel.findUserByUsername(username);
    // Only return a profile if the user exists AND their status is 'active'
    if (!user || user.status !== 'active') {
        throw new AppError('User not found.', 404);
    }
    return user;
};

/**
 * Handles the business logic for updating a user's profile.
 * It separates email updates (which go to Supabase Auth) from other
 * profile updates (which go to the public 'profiles' table).
 * @param userId - The ID of the user to update.
 * @param updates - The profile data to update.
 * @returns The updated user profile.
 */
export const updateUserProfile = async (userId: string, updates: Partial<UserProfile & { email: string }>) => {
    const { email, ...profileUpdates } = updates;

    // Step 1: Handle email update if an email is provided
    if (email) {
        const { error: authError } = await supabase.auth.admin.updateUserById(
            userId,
            { email: email }
        );
        if (authError) {
            console.error("Supabase auth update error:", authError);
            throw new AppError('Failed to update email.', 500);
        }
    }

    // Step 2: Handle other profile updates if there are any
    let updatedDbProfile = null;

    // Step 2: Handle other profile updates if there are any
    if (Object.keys(profileUpdates).length > 0) {
        // --- FIX STARTS HERE ---
        const dbUpdates: { [key: string]: any } = { ...profileUpdates };
        if (dbUpdates.name) {
            dbUpdates.username = dbUpdates.name;
            delete dbUpdates.name;
        }
        // --- END OF PREVIOUS FIX ---

        updatedDbProfile = await UserModel.updateProfile(userId, dbUpdates);
        if (!updatedDbProfile) {
            throw new AppError('Failed to update user profile in database.', 500);
        }
    } else {
        // If only email was updated, we still need the profile to reshape it
        updatedDbProfile = await UserModel.findUserById(userId);
    }
    
    if (!updatedDbProfile) {
        throw new AppError('Could not find user profile after update.', 404);
    }
 
    // Step 4: Reshape the data into the consistent format the frontend expects
    return reshapeUserForApp(updatedDbProfile);
};


/**
 * Handles the business logic for adding content to a fan's gallery.
 * @param fanId - The ID of the fan.
 * @param contentId - The ID of the content to add.
 * @returns The updated gallery object.
 */
export const addToUserGallery = async (fanId: string, contentId: string) => {
    // In a real app, you'd first verify that the fan has access to this content.
    
    const newItem: GalleryItem = {
        contentId,
        addedDate: new Date().toISOString(),
        isAccessible: true, // Assuming they have access when they add it
    };

    const updatedGallery = await GalleryModel.addItemToGallery(fanId, newItem);

    if (!updatedGallery) {
        throw new AppError('Failed to add item to gallery.', 500);
    }

    return updatedGallery;
};

/**
 * Handles the business logic for removing content from a fan's gallery.
 * @param fanId - The ID of the fan.
 * @param contentId - The ID of the content to remove.
 * @returns The updated gallery object.
 */
export const removeFromUserGallery = async (fanId: string, contentId: string) => {
    const updatedGallery = await GalleryModel.removeItemFromGallery(fanId, contentId);

    if (!updatedGallery) {
        throw new AppError('Failed to remove item from gallery.', 500);
    }

    return updatedGallery;
};

/**
 * Handles the business logic for uploading a new user avatar.
 * @param userId - The ID of the user uploading the avatar.
 * @param file - The avatar file object from Multer.
 * @returns The updated user profile with the new avatar URL.
 */
export const uploadUserAvatar = async (userId: string, file: Express.Multer.File) => {
    if (!file) {
        throw new AppError('No avatar file provided.', 400);
    }

    // 1. Define the file path in Supabase Storage
    const fileName = `avatar-${userId}-${Date.now()}`;
    const filePath = `avatars/${fileName}`;

    // 2. Upload the new avatar to Supabase Storage
    const { error: uploadError } = await supabase.storage
        .from('avatars') // Assuming you have a bucket named 'avatars'
        .upload(filePath, file.buffer, {
            contentType: file.mimetype,
            upsert: true, // This will overwrite any existing file, which is good for avatars
        });

    if (uploadError) {
        throw new AppError('Failed to upload avatar to storage.', 500);
    }

    // 3. Get the public URL of the uploaded file
    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);

    if (!publicUrl) {
        throw new AppError('Could not get public URL for the uploaded avatar.', 500);
    }

    // 4. Update the avatar_url in the user's profile
    await UserModel.updateProfile(userId, { avatar_url: publicUrl });
    
    // 5. Fetch the complete, updated user data to return
    const updatedDbProfile = await UserModel.findUserById(userId);

    
    // 6. Reshape and return the full user object
    return reshapeUserForApp(updatedDbProfile);
};

/**
 * Handles the business logic for a creator's initial onboarding.
 * @param userId - The ID of the creator being onboarded.
 * @param onboardingData - The data from the onboarding form.
 * @returns The fully updated user profile.
 */
export const onboardCreator = async (userId: string, onboardingData: { profile: Partial<UserProfile>, tiers: Partial<SubscriptionTier>[] }) => {
    const { profile, tiers } = onboardingData;

    // 1. Fetch the user's existing profile to not overwrite anything
    const existingProfile = await UserModel.findUserById(userId);
    if (!existingProfile) {
        throw new AppError('User profile not found.', 404);
    }

    // 2. Prepare the updates
    // Update top-level fields like bio
    const profileUpdates: Partial<UserProfile> = {
        bio: profile.bio,
    };
    
    // Prepare the creator_data JSONB field update
    const creatorDataUpdate = {
        ...existingProfile.creator_data, // Preserve existing data
        subscriptionTiers: tiers, // Add the new tiers
    };

    // 3. Save the updates to the database
    const updatedUser = await UserModel.updateProfile(userId, {
        ...profileUpdates,
        creator_data: creatorDataUpdate,
        onboarding_complete: true, // <-- ADD THIS FLAG
    });

    if (!updatedUser) {
        throw new AppError('Failed to update profile during onboarding.', 500);
    }

    // 4. Reshape and return the full user object

    return reshapeUserForApp(updatedUser);
};

/**
 * Handles uploading verification documents and updating the user's profile.
 * @param userId The ID of the user submitting documents.
 * @param files The file objects from Multer.
 * @param signature The user's electronic signature.
 */
export const submitVerificationDocs = async (
    userId: string, 
    files: { [fieldname: string]: Express.Multer.File[] },
    signature: string
) => {
    const idFile = files?.idFile?.[0];
    const selfieFile = files?.selfieFile?.[0];

    if (!idFile || !selfieFile || !signature) {
        throw new AppError('ID file, selfie file, and signature are all required.', 400);
    }

    const uploadFile = async (file: Express.Multer.File, fileName: string) => {
        const filePath = `${userId}/${fileName}`;
        const { error } = await supabase.storage
            .from('verification-documents')
            .upload(filePath, file.buffer, { contentType: file.mimetype, upsert: true });
        
        if (error) throw new AppError(`Failed to upload ${fileName}.`, 500);
        return filePath;
    };

    // Upload both files concurrently
    const [idFilePath, selfieFilePath] = await Promise.all([
        uploadFile(idFile, 'id-document'),
        uploadFile(selfieFile, 'selfie-document'),
    ]);

    // Prepare the data to be saved in the profile's jsonb column
    const verificationData = {
        idFilePath,
        selfieFilePath,
        signature,
        submittedAt: new Date().toISOString(),
    };

    // Update the user's profile with the verification data
    const updatedUser = await UserModel.updateProfile(userId, {
        verification_data: verificationData,
        status: 'pending verification'
    });

    if (!updatedUser) {
        throw new AppError('Failed to save verification data to profile.', 500);
    }

    return reshapeUserForApp(updatedUser);
};

/**
 * Gathers all necessary data for a creator's public-facing profile page.
 * @param username - The username of the creator.
 * @returns An object containing the creator's profile and a preview of their content.
 */
export const getFullPublicProfile = async (username: string) => {
    // 1. Find the creator by their username
    const user = await UserModel.findUserByUsername(username);
    if (!user || user.role !== 'creator' || user.status !== 'active') {
        throw new AppError('Creator profile not found.', 404);
    }

    // 2. Fetch a preview of their content (e.g., the 12 most recent posts)
    // Note: We'll create this model function next.
    const contentPreview = await ContentModel.findRecentContentByCreator(user.id, 12);

    // 3. Reshape the user data for the frontend
    const creatorProfile = reshapeUserForApp(user);

    return {
        creator: creatorProfile,
        content: contentPreview || [],
    };
};

// ... (other functions)

/**
 * Generates a personalized content feed for a specific fan.
 * @param fanId - The UUID of the fan.
 * @param page - The page number for pagination.
 * @returns An array of content objects from subscribed creators.
 */
export const generateFanFeed = async (fanId: string, page: number = 1) => {
    const limit = 20; // Number of posts per page
    const offset = (page - 1) * limit;

    // 1. Find all of the fan's active subscriptions
    const subscriptions = await SubscriptionModel.findActiveSubscriptionsByFan(fanId);
    if (!subscriptions || subscriptions.length === 0) {
        return []; // The fan isn't subscribed to anyone, so their feed is empty
    }

    // 2. Extract the creator IDs from the subscriptions
    const creatorIds = subscriptions.map(sub => sub.creator_id);

    // 3. Fetch the content from all those creators using our model function
    // This model function needs to join the creator's profile data
    const feedContent = await ContentModel.findContentByCreatorIds(creatorIds, { limit, offset });
    if (!feedContent) {
        throw new AppError('Could not retrieve feed content.', 500);
    }

    // 4. Reshape the data for the frontend PostCard component
    return feedContent.map(post => {
        // The 'creator' property is the full joined profile from the database
        const creatorProfile = post.creator ? reshapeUserForApp(post.creator) : null;

        return {
            ...post,
            _id: post.id.toString(), // Ensure frontend gets _id
            // Create the nested creator object that PostCard expects
            creator: {
                name: creatorProfile?.profile.name || 'Unknown Creator',
                avatar: creatorProfile?.profile.avatar || '',
                verified: true, // Assuming all creators in the feed are verified
            }
        };
    });
};