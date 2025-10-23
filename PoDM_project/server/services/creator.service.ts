// /server/services/creator.service.ts

import * as SubscriptionModel from '../models/subscription.model';
import * as TransactionModel from '../models/transaction.model';
import * as ContentModel from '../models/content.model';
import * as UserModel from '../models/user.model';
import { AppError } from '../middleware/error.middleware';
import { reshapeUserForApp } from '../utils/user.utils';
import supabase from '../../server/config/supabaseClient';
import { syncTiersWithStripe } from '../../server/utils/tier.utils';
import * as AnalyticsService from './analytics.service';
import stripe from '../config/stripeClient';



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

    // Fetch recent transactions AND join the fan's username directly.
    const { data: recentTransactionsData, error: recentTxError } = await supabase
        .from('transactions')
        .select('*, fan:fan_id(username)')
        .eq('creator_id', creatorId)
        .order('created_at', { ascending: false })
        .limit(5);

    if (recentTxError) {
        console.error("Error fetching recent transactions for dashboard:", recentTxError);
        // Don't throw, just proceed with an empty array.
    }
    const recentTransactions = recentTransactionsData || [];

    const [
        totalSubscribers,
        newSubscribers,
        earningsThisMonth,
        earningsLastMonth,
        recentContent,
        profileVisits,
        postViews
    ] = await Promise.all([
        SubscriptionModel.findSubscriptionsByCreator(creatorId).then(subs => subs?.length || 0),
        SubscriptionModel.countNewSubscribersInPeriod(creatorId, thirtyDaysAgo),
        TransactionModel.sumCreatorEarningsForPeriod(creatorId, startOfThisMonth, today),
        TransactionModel.sumCreatorEarningsForPeriod(creatorId, startOfLastMonth, startOfThisMonth),
        ContentModel.findContentByCreatorId(creatorId).then(content => content?.slice(0, 5) || []),
        AnalyticsService.countEventsForCreator(creatorId, 'profile_visit'),
        AnalyticsService.countEventsForCreator(creatorId, 'post_view')
    ]);
    
    // --- 2. Fetch Recent Activity ---
    const combinedActivity = [
        ...recentTransactions,
        ...recentContent ,
    ];
    
    combinedActivity.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    // Reshape the activity items to match frontend expectations
    const recentActivity = combinedActivity.slice(0, 5).map(item => {
        // Check if it's a transaction by looking for a 'type' property that content doesn't have
        if ('type' in item && 'fan_id' in item) {
            return {
                _id: `txn-${item.id}`,
                fanName: (item as any).fan?.username || 'a fan', // Use the joined fan username
                type: item.type,
                amount: item.amount,
                createdAt: item.created_at, // Map snake_case to camelCase
            };
        }
        // Otherwise, it's a content item
        return {
            _id: `content-${item.id}`,
            title: item.title,
            status: item.status,
            createdAt: item.created_at, // Map snake_case to camelCase
        };
    });

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
            postViews: { value: postViews, change: 0 }, // Change requires more complex logic
            profileVisits: { value: profileVisits, change: 0 }, // Change requires more complex logic
        },
        recentActivity: recentActivity,
        monthlyEarnings: monthlyEarnings,
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

    
    return reshapeUserForApp(reshapedData);
};

/**
 * Gathers and computes all data needed for the creator earnings page.
 * @param creatorId - The ID of the creator.
 */
export const getEarningsData = async (creatorId: string) => {
    // 1. Fetch all "Cleared" and "Pending" transactions for the creator
    const { data: allTransactions, error: txError } = await supabase
        .from('transactions')
        .select('creator_payout, status')
        .eq('creator_id', creatorId)
        .in('status', ['Cleared', 'Pending']);

    if (txError) throw new AppError('Could not fetch transaction data.', 500);

    // 2. Calculate summary metrics
    const availableForPayout = allTransactions.filter(tx => tx.status === 'Cleared').reduce((sum, tx) => sum + tx.creator_payout, 0);
    const pending = allTransactions.filter(tx => tx.status === 'Pending').reduce((sum, tx) => sum + tx.creator_payout, 0);
    const lifetimeEarnings = availableForPayout + pending;

    const summary = {
        availableForPayout,
        pending,
        lifetimeEarnings,
        nextPayoutDate: '2025-11-01T00:00:00Z', // Placeholder
    };

    // 3. Fetch monthly earnings for the chart (same logic as dashboard)
    const monthlyEarnings = [];
    for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthName = date.toLocaleString('default', { month: 'short' });
        const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
        const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);

        const earnings = await TransactionModel.sumCreatorEarningsForPeriod(creatorId, startOfMonth, endOfMonth);
        monthlyEarnings.push({ name: monthName, Earnings: earnings / 100 });
    }

    // 4. Fetch the detailed transaction list with fan names
    const { data: detailedTransactions, error: detailedTxError } = await supabase
        .from('transactions')
        .select('*, fan:fan_id(username)')
        .eq('creator_id', creatorId)
        .order('created_at', { ascending: false })
        .limit(100);

    if (detailedTxError) throw new AppError('Could not fetch transaction list.', 500);

    // Explicitly map all snake_case database columns to the camelCase properties
    // that the frontend's TypeScript types are expecting.
    const transactions = detailedTransactions.map(tx => ({
        _id: tx.id.toString(),
        fanId: tx.fan_id,
        creatorId: tx.creator_id,
        type: tx.type,
        amount: tx.amount,
        platformFee: tx.platform_fee,
        creatorPayout: tx.creator_payout, // Explicitly map snake_case to camelCase
        status: tx.status,
        relatedContentId: tx.related_content_id,
        paymentGatewayId: tx.payment_gateway_id,
        createdAt: tx.created_at,
        updatedAt: tx.updated_at,
        fanName: tx.fan?.username || 'Unknown Fan', // Add the fan name from the join
    }));

    return { summary, monthlyEarnings, transactions };
};

/**
 * Handles the business logic for a creator requesting a payout.
 * @param creatorId - The ID of the creator requesting the payout.
 * @param amountInCents - The amount they wish to withdraw, in cents.
 */
export const createPayout = async (creatorId: string, amountInCents: number) => {
    // 1. Fetch the creator's full profile to get their Stripe account ID and current balance.
    const creator = await UserModel.findUserById(creatorId);
    if (!creator) {
        throw new AppError('Creator not found.', 404);
    }

    // 2. Security and validation checks
    if (!creator.stripe_account_id) {
        throw new AppError('No Stripe connected account found. Please set up payments in your settings.', 400);
    }
    if (amountInCents <= 0) {
        throw new AppError('Payout amount must be positive.', 400);
    }

    // 3. Recalculate their available balance on the server to prevent race conditions.
    const { data: clearedTransactions, error } = await supabase
        .from('transactions')
        .select('creator_payout')
        .eq('creator_id', creatorId)
        .eq('status', 'Cleared');

    if (error) throw new AppError('Could not verify creator balance.', 500);

    const availableBalance = clearedTransactions.reduce((sum, tx) => sum + tx.creator_payout, 0);

    if (amountInCents > availableBalance) {
        throw new AppError('Payout amount exceeds available balance.', 400);
    }

    try {
        // 4. Create a Stripe Transfer from the platform's account to the creator's connected account.
        const transfer = await stripe.transfers.create({
            amount: amountInCents,
            currency: 'usd',
            destination: creator.stripe_account_id,
            description: `Payout for ${creator.username} on PoDM`,
            metadata: {
                pod_creator_id: creatorId,
            },
        });

        // 5. Record this withdrawal as a "Payout" transaction in our database.
        // We use a negative value for the payout amount to correctly decrease their balance.
        await TransactionModel.createTransaction({
            creator_id: creatorId,
            type: 'Payout',
            amount: 0, // No fan involved
            platform_fee: 0,
            creator_payout: -amountInCents, // This is a debit from their earnings
            status: 'Cleared', // Or 'Pending' depending on the transfer status
            payment_gateway_id: transfer.id, // Store the Stripe Transfer ID (tr_...)
        });

        return { success: true, message: 'Payout successfully initiated.' };

    } catch (error: any) {
        console.error("Stripe Transfer creation error:", error);
        throw new AppError(`Stripe Error: ${error.message}`, 500);
    }
};