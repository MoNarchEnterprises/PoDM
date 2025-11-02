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
import { Content } from '@common/types/Content';



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
 * Gathers and computes all data needed for the creator analytics page.
 * @param creatorId - The ID of the creator.
 */
export const getAnalyticsData = async (creatorId: string) => {
    // --- 1. Fetch data for Key Metrics ---
    const today = new Date();
    const thirtyDaysAgo = new Date(new Date().setDate(today.getDate() - 30));

    const [
        totalSubscribers,
        newSubscribersLast30Days,
        revenueLast30Days,
        totalViews,
        { data: contentStats, error: contentStatsError },
    ] = await Promise.all([
        SubscriptionModel.findSubscriptionsByCreator(creatorId).then(subs => subs?.length || 0),
        SubscriptionModel.countNewSubscribersInPeriod(creatorId, thirtyDaysAgo),
        TransactionModel.sumCreatorEarningsForPeriod(creatorId, thirtyDaysAgo, today),
        AnalyticsService.countEventsForCreator(creatorId, 'post_view'),
        supabase.from('content').select('stats').eq('creator_id', creatorId),
    ]);

    if (contentStatsError) throw new AppError('Could not fetch content stats.', 500);

    const totalGalleryAdds = contentStats.reduce((sum, item) => sum + (item.stats?.galleryAdds || 0), 0);

    // --- 2. Fetch data for Subscriber Growth Chart ---
    const subscriberGrowth = [];
    for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthName = date.toLocaleString('default', { month: 'short' });
        const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);

        // For simplicity, we'll count new subs in that month. A more complex query could get the total count at that point in time.
        const newSubs = await SubscriptionModel.countNewSubscribersInPeriod(creatorId, startOfMonth);
        subscriberGrowth.push({ name: monthName, Subscribers: newSubs });
    }

    // --- 3. Fetch data for Revenue Breakdown Pie Chart ---
    const { data: revenueData, error: revenueError } = await supabase
        .from('transactions')
        .select('type, creator_payout')
        .eq('creator_id', creatorId)
        .eq('status', 'Cleared');

    if (revenueError) throw new AppError('Could not fetch revenue data.', 500);

    const revenueBreakdown = revenueData.reduce((acc, tx) => {
        const typeName = tx.type === 'PPV Message' || tx.type === 'PPV Post' ? 'PPV' : tx.type;
        acc[typeName] = (acc[typeName] || 0) + tx.creator_payout;
        return acc;
    }, {} as Record<string, number>);

    // --- 4. Fetch Top Performing Content ---
    const { data: topContentData, error: topContentError } = await supabase
        .from('content')
        .select('*')
        .eq('creator_id', creatorId)
        .order('stats->>galleryAdds', { ascending: false, nullsFirst: false } as any) // Order by gallery adds in the JSONB field
        .limit(5);

    if (topContentError) throw new AppError('Could not fetch top content.', 500);

    // --- 5. Assemble final payload ---
    return {
        metrics: {
            totalSubscribers: { value: totalSubscribers, change: newSubscribersLast30Days },
            monthlyRevenue: { value: revenueLast30Days, change: 0 }, // Change calculation requires more historical data
            totalViews: { value: totalViews, change: 0 },
            galleryAdds: { value: totalGalleryAdds, change: 0 },
        },
        subscriberGrowth,
        revenueBreakdown: Object.entries(revenueBreakdown).map(([name, value]) => ({ name, value })),
        topContent: topContentData.map(item => ({...item, _id: item.id.toString()})) as Content[],
    };
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

/**
 * Fetches all recent activity for a given creator, combining content and transactions.
 * @param creatorId - The ID of the creator.
 * @param page - The page number for pagination.
 * @param limit - The number of items per page.
 */
export const getCreatorActivity = async (creatorId: string, page: number = 1, limit: number = 10) => {
    const offset = (page - 1) * limit;

    // Fetch recent content
    const contentPromise = ContentModel.findContentByCreatorId(creatorId, limit, offset);

    // Fetch recent transactions AND join the fan's username directly.
    const { data: transactionsData, error: txError } = await supabase
        .from('transactions')
        .select('*, fan:fan_id(username)')
        .eq('creator_id', creatorId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1); // Supabase range is inclusive

    if (txError) {
        console.error("Error fetching recent transactions for activity page:", txError);
        throw new AppError('Could not fetch transactions.', 500);
    }

    const recentContent = await contentPromise;
    const recentTransactions = transactionsData || [];

    const combinedActivity = [
        ...(recentContent || []).map(item => ({ ...item, type: 'Content' })),
        ...recentTransactions.map(item => ({
            ...item,
            fanName: (item as any).fan?.username || 'a fan',
            type: item.type,
        })),
    ];

    combinedActivity.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    // Apply limit and offset after combining and sorting if fetching more than needed
    // (Supabase range already handles this for transactions, but content might need slicing if not paginated at source)
    const paginatedActivity = combinedActivity.slice(0, limit);

    // Reshape the activity items to match frontend expectations
    const reshapedActivity = paginatedActivity.map(item => {
        if (item.type === 'Content') {
            return {
                _id: item.id.toString(),
                title: item.title,
                type: 'Content',
                createdAt: item.created_at,
            };
        } else {
            return {
                _id: item.id.toString(),
                fanName: item.fanName,
                type: item.type,
                amount: item.amount,
                createdAt: item.created_at,
            };
        }
    });

    return reshapedActivity;
};