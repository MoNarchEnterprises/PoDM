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
import stripe from '../config/stripeClient';
import { getOrCreateStripeCustomer } from '../utils/stripe.utils';
import { createStripeConnectedAccount } from './stripe.service';
import { syncTiersWithStripe } from '../../server/utils/tier.utils';
import { reshapePostForFeed, generateSignedUrlsForContent } from '../../server/utils/content.utils';


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
    // Instead of saving the raw tiers, process them with our utility first.
    const syncedTiers = await syncTiersWithStripe(tiers);
    
    const creatorDataUpdate = {
        ...existingProfile.creator_data,
        subscriptionTiers: syncedTiers, // Save the corrected, complete tier data
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
 * @param viewerId - The optional ID of the user viewing the profile. // --- ADD THIS ---
 * @returns An object containing the creator's profile, content, and subscription status.
 */
export const getFullPublicProfile = async (username: string, viewerId?: string) => { // --- ADD viewerId here ---
    // 1. Find the creator by their username
    const user = await UserModel.findUserByUsername(username);
    if (!user || user.role !== 'creator' || user.status !== 'active') {
        throw new AppError('Creator profile not found.', 404);
    }

    // --- 2. ADD THIS LOGIC BLOCK to check subscription status ---
    let isSubscribed = false;
    if (viewerId) {
        // Find if an active subscription exists between the viewer and the creator
        const subscriptions = await SubscriptionModel.findActiveSubscriptionsByFan(viewerId);
        if (subscriptions) {
            isSubscribed = subscriptions.some(sub => sub.creator_id === user.id);
        }
    }
    // --- END OF NEW LOGIC BLOCK ---

    // 3. Fetch a preview of their content (e.g., the 12 most recent posts)
    const contentPreview = await ContentModel.findRecentContentByCreator(user.id, 12);

    // 4. Reshape the user data for the frontend
    const creatorProfile = reshapeUserForApp(user);

    return {
        creator: creatorProfile,
        content: contentPreview || [],
        isSubscribed: isSubscribed, // --- 5. ADD isSubscribed to the return object ---
    };
};


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

    // `Promise.all` ensures we process all posts concurrently for maximum performance.
    const reshapedFeed = await Promise.all(
        feedContent.map(post => reshapePostForFeed(post))
    );
    // --- END OF REFACTOR ---

    return reshapedFeed;
};

/**
 * Gathers and structures all data needed for a fan's gallery page.
 * @param fanId - The UUID of the fan.
 * @returns An array of objects, where each object represents a creator and their content in the gallery.
 */
export const getFanGallery = async (fanId: string) => {
    // 1. Get the fan's raw gallery data (contains content IDs)
    const gallery = await GalleryModel.findGalleryByFanId(fanId);
    if (!gallery || gallery.content.length === 0) {
        return []; // Return empty if they have nothing saved
    }

    // 2. Get the fan's active subscriptions to check accessibility
    const activeSubs = await SubscriptionModel.findActiveSubscriptionsByFan(fanId);
    const activeCreatorIds = new Set(activeSubs?.map(sub => sub.creator_id));

    // 3. Group saved content IDs by creator
    const contentByCreator = new Map<string, any[]>();
    const allContentIds = gallery.content.map(item => item.contentId);
    const allContentItems = await ContentModel.findContentByIds(allContentIds);

    if (!allContentItems) return [];
    
    // Process all content items at once to get signed URLs
    const processedContentItems = await Promise.all(
        allContentItems.map(item => generateSignedUrlsForContent(item))
    );

    for (const item of processedContentItems) {
        if (!contentByCreator.has(item.creator_id)) {
            contentByCreator.set(item.creator_id, []);
        }
        contentByCreator.get(item.creator_id)?.push(item);
    }
    
    const galleryData = [];
    for (const [creatorId, contentItems] of contentByCreator.entries()) {
        const creator = await UserModel.findUserById(creatorId);
        if (creator) {
            galleryData.push({
                creator: reshapeUserForApp(creator),
                content: contentItems.map(item => ({
                    contentId: item.id.toString(),
                    addedDate: gallery.content.find(g => g.contentId === item.id.toString())?.addedDate,
                    content: { ...item, _id: item.id.toString() }
                })),
                activeSubscription: activeCreatorIds.has(creatorId)
            });
        }
    }


    return galleryData;
};

/**
 * Gathers all settings for a fan, combining profile data with payment info.
 * @param fanId - The UUID of the fan.
 */
export const getFanSettings = async (fanId: string) => {
    // 1. Get the user's profile from our database
    const user = await UserModel.findUserById(fanId);
    if (!user) {
        throw new AppError('User not found.', 404);
    }

    let paymentMethod = null;

    // 2. If the user has a Stripe customer ID, fetch their default payment method
    if (user.stripe_customer_id) {
        try {
            const customer = await stripe.customers.retrieve(user.stripe_customer_id, {
                expand: ['invoice_settings.default_payment_method'],
            });
            
            const defaultPaymentMethod = customer.invoice_settings?.default_payment_method as any;
            if (defaultPaymentMethod && defaultPaymentMethod.card) {
                paymentMethod = {
                    brand: defaultPaymentMethod.card.brand,
                    last4: defaultPaymentMethod.card.last4,
                };
            }
        } catch (error) {
            console.error(`Failed to retrieve Stripe customer data for ${fanId}:`, error);
            // Don't throw an error, just proceed without payment info
        }
    }

    // 3. Combine and return the data
    return {
        fan: reshapeUserForApp(user),
        settings: {
            notifications: user.preferences?.notifications || {},
            privacy: user.preferences?.privacy || {},
            paymentMethod: paymentMethod || { brand: 'N/A', last4: 'N/A' }
        }
    };
};

/**
 * Updates a fan's settings.
 * @param fanId - The UUID of the fan.
 * @param updates - The settings data to update.
 */
export const updateFanSettings = async (fanId: string, updates: any) => {
    const { profile, preferences } = updates;

    // In a real app, you'd have more robust validation here
    if (!profile && !preferences) {
        throw new AppError('No settings data provided to update.', 400);
    }

    const dbUpdates: any = {};
    if (profile) {
        dbUpdates.username = profile.name; // Assuming name and username are kept in sync
        dbUpdates.bio = profile.bio;
    }
    if (preferences) {
        dbUpdates.preferences = preferences;
    }

    const updatedUser = await UserModel.updateProfile(fanId, dbUpdates);
    if (!updatedUser) {
        throw new AppError('Failed to update user settings.', 500);
    }

    return getFanSettings(fanId); // Return the full, updated settings object
};

/**
 * Attaches a new payment method to a fan's Stripe customer profile and sets it as their default.
 * @param fanId - The UUID of the fan.
 * @param paymentMethodId - The `pm_...` ID from the frontend.
 */
export const updateFanPaymentMethod = async (fanId: string, paymentMethodId: string) => {
    const stripeCustomerId = await getOrCreateStripeCustomer(fanId);

    try {
        // 1. Attach the new payment method to the customer in Stripe
        await stripe.paymentMethods.attach(paymentMethodId, {
            customer: stripeCustomerId,
        });

        // 2. Set the newly attached payment method as the default for subscriptions
        await stripe.customers.update(stripeCustomerId, {
            invoice_settings: {
                default_payment_method: paymentMethodId,
            },
        });

        return { message: 'Payment method updated successfully.' };
    } catch (error: any) {
        console.error("Stripe payment method update error:", error);
        throw new AppError(`Stripe Error: ${error.message}`, 500);
    }
};