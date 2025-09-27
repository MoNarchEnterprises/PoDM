// /server/services/creator.service.ts

import stripe from '../config/stripeClient'; // <-- IMPORT STRIPE
import { v4 as uuidv4 } from 'uuid'; // <-- 1. IMPORT UUID
import * as SubscriptionModel from '../models/subscription.model';
import * as TransactionModel from '../models/transaction.model';
import * as ContentModel from '../models/content.model';
import * as UserModel from '../models/user.model';
import { AppError } from '../middleware/error.middleware';
import { reshapeUserForApp } from '../utils/user.utils';
import supabase from '../../server/config/supabaseClient';
import { syncTiersWithStripe } from '../../server/utils/tier.utils';

/**
 * Gathers and computes all data needed for the creator dashboard.
 * @param creatorId - The ID of the creator.
 */
export const getDashboardData = async (creatorId: string) => {
    // --- 1. Fetch Key Metrics ---
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);
    const startOfThisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);

    const [
        totalSubscribers,
        newSubscribers,
        earningsThisMonth,
        earningsLastMonth,
        totalPostViews,
        recentTransactions,
        recentContent,
    ] = await Promise.all([
        SubscriptionModel.findSubscriptionsByCreator(creatorId).then(subs => subs?.length || 0),
        SubscriptionModel.countNewSubscribersInPeriod(creatorId, thirtyDaysAgo),
        TransactionModel.sumCreatorEarningsForPeriod(creatorId, startOfThisMonth, today),
        TransactionModel.sumCreatorEarningsForPeriod(creatorId, startOfLastMonth, startOfThisMonth),
        ContentModel.sumCreatorContentViews(creatorId),
        TransactionModel.findTransactionsByUser(creatorId),
        ContentModel.findContentByCreatorId(creatorId),
    ]);
    
    // --- 2. Fetch Recent Activity ---
    const combinedActivity = [
        ...(recentTransactions || []).slice(0, 5),
        ...(recentContent || []).slice(0, 5),
    ];
    
    combinedActivity.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const recentActivity = combinedActivity.slice(0, 5).map(item => ({
        ...item,
        _id: `${'title' in item ? 'content' : 'txn'}-${item.id}` // Create a unique string key
    }));

    // --- 3. Fetch Monthly Earnings Chart Data ---
    const monthlyEarnings = [];
    for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthName = date.toLocaleString('default', { month: 'short' });
        const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
        const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);

        const earnings = await TransactionModel.sumCreatorEarningsForPeriod(creatorId, startOfMonth, endOfMonth);
        monthlyEarnings.push({ name: monthName, earnings: earnings / 100 }); // convert to dollars
    }
    
    // --- 4. Assemble Final Payload ---
    const dashboardData = {
        keyMetrics: {
            subscribers: { value: totalSubscribers, change: newSubscribers },
            earnings: { value: earningsThisMonth, change: earningsThisMonth - earningsLastMonth },
            postViews: { value: totalPostViews, change: 0 }, // Change requires more complex analytics tracking
            profileVisits: { value: 0, change: 0 }, // Requires a dedicated analytics event table
        },
        recentActivity,
        monthlyEarnings,
    };

    return dashboardData;
};

/**
 * Updates the settings for a creator.
 * @param creatorId - The ID of the creator to update.
 * @param settingsData - The new settings data from the frontend.
 * @returns The fully updated and reshaped creator object.
 */
export const updateSettings = async (creatorId: string, settingsData: any, file?: Express.Multer.File) => {
    const { profile, creatorData } = settingsData;

    // 1. Fetch the user's existing profile to avoid overwriting data
    const existingUser = await UserModel.findUserById(creatorId);
    if (!existingUser) {
        throw new AppError('User profile not found.', 404);
    }

    let newCoverImageUrl: string | undefined = existingUser.creator_data?.coverImageUrl;

    if (file) {
        const fileName = `banner-${creatorId}-${Date.now()}`;
        const filePath = `${creatorId}/${fileName}`;
        const { error: uploadError } = await supabase.storage
            .from('banners')
            .upload(filePath, file.buffer, { contentType: file.mimetype, upsert: true });

        if (uploadError) {
            console.error("Supabase banner upload error:", uploadError);
            throw new AppError('Failed to upload banner.', 500);
        }
        const { data: { publicUrl } } = supabase.storage.from('banners').getPublicUrl(filePath);
        newCoverImageUrl = publicUrl;
    }

    
    // 2. Prepare the updates for the 'profiles' table
    const profileUpdates: { [key: string]: any } = {};
    if (profile?.name) profileUpdates.username = profile.name;
    if (profile?.bio) profileUpdates.bio = profile.bio;

    const newCreatorData = { ...(existingUser.creatorData || {}) };

    if (creatorData?.welcomeMessage) {
        newCreatorData.welcomeMessage = creatorData.welcomeMessage;
    }
    if (profile?.socialLinks) {
        newCreatorData.socialLinks = profile.socialLinks;
    }
    
    newCreatorData.coverImageUrl = newCoverImageUrl; // Set the new or existing URL

    // In the future, you can merge other settings here too
    // if (creatorData.payoutSettings) { ... }
    // --- STRIPE SYNC LOGIC ---
    if (creatorData?.subscriptionTiers) {
        newCreatorData.subscriptionTiers = await syncTiersWithStripe(creatorData.subscriptionTiers);
        console.log('[updateSettings] Synced tiers with Stripe:', newCreatorData.subscriptionTiers);
    }
    // --- END OF STRIPE SYNC LOGIC ---

    
    profileUpdates.creator_data = newCreatorData;
    

    
    // 4. Save the updates to the database
    const updatedUser = await UserModel.updateProfile(creatorId, profileUpdates);
    if (!updatedUser) {
        throw new AppError('Failed to update creator settings.', 500);
    }

    const reshapedData = await UserModel.findUserById(creatorId);
    if (!reshapedData) {
        throw new AppError('Could not retrieve updated user profile.', 500);
    }

    console.log('[updateSettings] Updated and reshaped user data:', reshapedData);  

    return reshapeUserForApp(reshapedData);
};

