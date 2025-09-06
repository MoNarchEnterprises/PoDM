// /server/services/creator.service.ts

import * as SubscriptionModel from '../models/subscription.model';
import * as TransactionModel from '../models/transaction.model';
import * as ContentModel from '../models/content.model';
import * as UserModel from '../models/user.model';
import { AppError } from '../middleware/error.middleware';
import { reshapeUserForApp } from '../utils/user.utils';

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
    combinedActivity.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const recentActivity = combinedActivity.slice(0, 5);

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
export const updateSettings = async (creatorId: string, settingsData: any) => {
    const { profile, creatorData } = settingsData;

    // 1. Fetch the user's existing profile to avoid overwriting data
    const existingUser = await UserModel.findUserById(creatorId);
    if (!existingUser) {
        throw new AppError('User profile not found.', 404);
    }

    // 2. Prepare the updates for the 'profiles' table
    const profileUpdates: any = {};
    if (profile.name) profileUpdates.username = profile.name; // Keep name/username in sync
    if (profile.bio) profileUpdates.bio = profile.bio;

    // 3. Deep merge the creator_data JSONB field
    // Safely merge the creator_data, providing empty objects as fallbacks.
    const creatorDataUpdate = {
        ...(existingUser.creator_data ?? {}),
        ...creatorData,
        welcomeMessage: {
            ...(existingUser.creator_data?.welcomeMessage ?? {}),
            ...(creatorData.welcomeMessage ?? {}),
        },
    };
    profileUpdates.creator_data = creatorDataUpdate;

    // 4. Save the updates to the database
    const updatedUser = await UserModel.updateProfile(creatorId, profileUpdates);
    if (!updatedUser) {
        throw new AppError('Failed to update creator settings.', 500);
    }

    // 5. Reshape and return the complete user object to update the frontend state
    return reshapeUserForApp(updatedUser);
};