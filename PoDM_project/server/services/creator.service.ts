// /server/services/creator.service.ts

import * as SubscriptionModel from '../models/subscription.model';
import * as TransactionModel from '../models/transaction.model';
import * as ContentModel from '../models/content.model';
import * as UserModel from '../models/user.model';
import { AppError } from '../middleware/error.middleware';
import { requireUser } from '../utils/entityGuards';
import { reshapeUserForApp } from '../utils/user.utils';
import supabase from '../../server/config/supabaseClient';
import { syncTiers } from '../../server/utils/tier.utils';
import * as AnalyticsService from './analytics.service';
import * as CryptoPaymentService from './cryptoPayment.service';
import { Content } from '@common/types/Content';
import * as StorageService from './storage.service';



/**
 * Gathers and computes all data needed for the creator dashboard.
 * @param creator_id - The ID of the creator.
 */
export const getDashboardData = async (creator_id: string) => {
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
        .eq('creator_id', creator_id)
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
        SubscriptionModel.findSubscriptionsByCreator(creator_id).then(subs => subs?.length || 0),
        SubscriptionModel.countNewSubscribersInPeriod(creator_id, thirtyDaysAgo),
        TransactionModel.sumCreatorEarningsForPeriod(creator_id, startOfThisMonth, today),
        TransactionModel.sumCreatorEarningsForPeriod(creator_id, startOfLastMonth, startOfThisMonth),
        ContentModel.findContentByCreatorId(creator_id).then(content => content?.slice(0, 5) || []),
        AnalyticsService.countEventsForCreator(creator_id, 'profile_visit'),
        AnalyticsService.countEventsForCreator(creator_id, 'post_view')
    ]);

    // --- 2. Fetch Recent Activity ---
    const combinedActivity = [
        ...recentTransactions,
        ...recentContent,
    ];

    combinedActivity.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    // Reshape the activity items to match frontend expectations
    const recentActivity = combinedActivity.slice(0, 5).map(item => {
        // Check if it's a transaction by looking for a 'type' property that content doesn't have
        if ('type' in item && 'fan_id' in item) {
            return {
                id: `txn-${item.id}`,
                fanName: (item as any).fan?.username || 'a fan', // Use the joined fan username
                type: item.type,
                amount: item.amount,
                createdAt: item.created_at, // Map snake_case to camelCase
            };
        }
        // Otherwise, it's a content item
        return {
            id: `content-${item.id}`,
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

        const earnings = await TransactionModel.sumCreatorEarningsForPeriod(creator_id, startOfMonth, endOfMonth);
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
 * @param creator_id - The ID of the creator.
 */
export const getAnalyticsData = async (creator_id: string) => {
    // --- 1. Fetch data for Key Metrics ---
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(today.getDate() - 60);

    const [
        totalSubscribers,
        newSubscribersLast30Days,
        revenueLast30Days,
        revenuePrior30Days,
        totalViews,
        viewsLast30Days,
        galleryAddsLast30Days, // New Metric
        { data: contentStats, error: contentStatsError },
    ] = await Promise.all([
        SubscriptionModel.findSubscriptionsByCreator(creator_id).then(subs => subs?.length || 0),
        SubscriptionModel.countNewSubscribersInPeriod(creator_id, thirtyDaysAgo),
        TransactionModel.sumCreatorEarningsForPeriod(creator_id, thirtyDaysAgo, today),
        TransactionModel.sumCreatorEarningsForPeriod(creator_id, sixtyDaysAgo, thirtyDaysAgo),
        AnalyticsService.countEventsForCreator(creator_id, 'post_view'), // Total Lifetime
        AnalyticsService.countEventsForCreator(creator_id, 'post_view', thirtyDaysAgo, today), // Last 30 Days
        AnalyticsService.countEventsForCreator(creator_id, 'gallery_add', thirtyDaysAgo, today), // New Metric
        supabase.from('content').select('stats').eq('creator_id', creator_id),
    ]);

    if (contentStatsError) throw new AppError('Could not fetch content stats.', 500);

    const totalGalleryAdds = contentStats.reduce((sum, item) => sum + (item.stats?.galleryAdds || 0), 0);

    // --- 2. Fetch data for Subscriber Growth Chart ---
    const subscriberGrowth = [];
    for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        // Set to end of month for the "snapshot"
        const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);
        const monthName = date.toLocaleString('default', { month: 'short' });

        // Count TOTAL active subscribers at that point in time
        const totalSubsAtDate = await SubscriptionModel.countTotalActiveSubscribersAtDate(creator_id, endOfMonth);
        subscriberGrowth.push({ name: monthName, Subscribers: totalSubsAtDate });
    }

    // --- 3. Fetch data for Revenue Breakdown Pie Chart ---
    const { data: revenueData, error: revenueError } = await supabase
        .from('transactions')
        .select('type, creator_payout')
        .eq('creator_id', creator_id)
        .eq('status', 'Cleared');

    if (revenueError) {
        console.error('Error fetching revenue data:', revenueError);
        throw new AppError('Could not fetch revenue data.', 500);
    }
    console.log('[Analytics] Revenue Data:', revenueData);

    const revenueBreakdown = (revenueData || []).reduce((acc, tx) => {
        const typeName = tx.type === 'PPV Message' || tx.type === 'PPV Post' ? 'PPV' : tx.type;
        acc[typeName] = (acc[typeName] || 0) + tx.creator_payout;
        return acc;
    }, {} as Record<string, number>);

    // --- 4. Fetch Top Performing Content ---
    const { data: topContentData, error: topContentError } = await supabase
        .from('content')
        .select('*')
        .eq('creator_id', creator_id)
        .order('stats->>tips', { ascending: false, nullsFirst: false } as any) // Order by tips (default sort)
        .limit(10); // Fetch more to allow client-side sorting

    if (topContentError) throw new AppError('Could not fetch top content.', 500);

    // --- 4b. Calculate PPV earnings per content ---
    const contentIds = topContentData.map(c => c.id);
    const { data: ppvTransactions, error: ppvError } = await supabase
        .from('transactions')
        .select('related_content_id, creator_payout')
        .eq('creator_id', creator_id)
        .eq('status', 'Cleared')
        .eq('type', 'PPV Post')
        .in('related_content_id', contentIds);

    if (ppvError) {
        console.error('Error fetching PPV transactions:', ppvError);
        // Don't throw, just proceed without PPV data
    }

    // Group PPV earnings by content ID
    const ppvEarningsByContent: Record<string, number> = {};
    (ppvTransactions || []).forEach(tx => {
        if (tx.related_content_id) {
            ppvEarningsByContent[tx.related_content_id] =
                (ppvEarningsByContent[tx.related_content_id] || 0) + tx.creator_payout;
        }
    });

    // Merge PPV earnings into content stats
    const topContentWithPpv = topContentData.map(item => ({
        ...item,
        id: item.id.toString(),
        stats: {
            ...item.stats,
            ppvEarnings: ppvEarningsByContent[item.id] || 0,
        },
    })) as Content[];

    // --- 5. Assemble final payload ---
    return {
        metrics: {
            totalSubscribers: { value: totalSubscribers, change: newSubscribersLast30Days },
            monthlyRevenue: { value: revenueLast30Days, change: revenueLast30Days - revenuePrior30Days },
            totalViews: { value: totalViews, change: viewsLast30Days },
            galleryAdds: { value: totalGalleryAdds, change: galleryAddsLast30Days },
        },
        subscriberGrowth,
        revenueBreakdown: Object.entries(revenueBreakdown).map(([name, value]) => ({ name, value })),
        topContent: topContentWithPpv,
    };
};

/**
 * Updates the settings for a creator.
 * @param creator_id - The ID of the creator to update.
 * @param settingsData - The new settings data from the frontend.
 * @returns The fully updated and reshaped creator object.
 */
export const updateSettings = async (creator_id: string, settingsData: any, file?: Express.Multer.File) => {
    const { profile, creator_data } = settingsData;

    // 1. Fetch the user's existing profile to avoid overwriting data
    const existingUser = await requireUser(creator_id);

    let newCoverImageUrl: string | undefined = existingUser.creator_data?.coverImageUrl;

    if (file) {
        const fileName = `banner-${creator_id}-${Date.now()}`;
        const filePath = `banners/${creator_id}/${fileName}`;
        const { publicUrl, error: uploadError } = await StorageService.uploadToPublic(
            filePath,
            file.buffer,
            file.mimetype
        );

        if (uploadError) {
            console.error("R2 banner upload error:", uploadError);
            throw new AppError('Failed to upload banner.', 500);
        }
        newCoverImageUrl = publicUrl;
    }


    // 2. Prepare the updates for the 'profiles' table
    const profileUpdates: { [key: string]: any } = {};
    if (profile?.name) profileUpdates.username = profile.name;
    if (profile?.bio) profileUpdates.bio = profile.bio;

    const newCreatorData = { ...(existingUser.creator_data || {}) };

    if (creator_data?.welcomeMessage) {
        newCreatorData.welcomeMessage = creator_data.welcomeMessage;
    }
    if (profile?.socialLinks) {
        newCreatorData.socialLinks = profile.socialLinks;
    }

    newCreatorData.coverImageUrl = newCoverImageUrl; // Set the new or existing URL

    // In the future, you can merge other settings here too
    // if (creator_data.payoutSettings) { ... }
    if (creator_data?.subscriptionTiers) {
        newCreatorData.subscriptionTiers = await syncTiers(creator_data.subscriptionTiers);
    }


    profileUpdates.creator_data = newCreatorData;



    // 4. Save the updates to the database
    const updatedUser = await UserModel.updateProfile(creator_id, profileUpdates);
    if (!updatedUser) {
        throw new AppError('Failed to update creator settings.', 500);
    }

    const reshapedData = await UserModel.findUserById(creator_id);
    if (!reshapedData) {
        throw new AppError('Could not retrieve updated user profile.', 500);
    }


    return reshapeUserForApp(reshapedData);
};

/**
 * Gathers and computes all data needed for the creator earnings page.
 * @param creator_id - The ID of the creator.
 */
export const getEarningsData = async (creator_id: string) => {
    // 1. Fetch all "Cleared" and "Pending" transactions for the creator
    const { data: allTransactions, error: txError } = await supabase
        .from('transactions')
        .select('creator_payout, status')
        .eq('creator_id', creator_id)
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

        const earnings = await TransactionModel.sumCreatorEarningsForPeriod(creator_id, startOfMonth, endOfMonth);
        monthlyEarnings.push({ name: monthName, Earnings: earnings / 100 });
    }

    // 4. Fetch the detailed transaction list with fan names
    const { data: detailedTransactions, error: detailedTxError } = await supabase
        .from('transactions')
        .select('*, fan:fan_id(username)')
        .eq('creator_id', creator_id)
        .order('created_at', { ascending: false })
        .limit(100);

    if (detailedTxError) throw new AppError('Could not fetch transaction list.', 500);

    // Return transactions with snake_case properties to match the shared Transaction type.
    // Only add fanName as an additional field from the join.
    const transactions = detailedTransactions.map(tx => ({
        ...tx,
        id: tx.id.toString(),
        fanName: tx.fan?.username || 'Unknown Fan',
    }));

    return { summary, monthlyEarnings, transactions };
};

/**
 * Handles the business logic for a creator requesting a payout.
 * @param creatorId - The ID of the creator requesting the payout.
 * @param amountInCents - The amount they wish to withdraw, in cents.
 */
export const createPayout = async (creatorId: string, amountInCents: number) => {
    // 1. Fetch the creator's full profile to get their crypto wallet address and current balance.
    const creator = await requireUser(creatorId);

    const walletConfig = await CryptoPaymentService.getUserWalletConfig(creatorId);
    if (!walletConfig.walletAddress) {
        throw new AppError('Please configure your payout wallet address before withdrawing.', 400);
    }
    if (amountInCents <= 0) {
        throw new AppError('Payout amount must be positive.', 400);
    }

    // 2. Recalculate their available balance on the server to prevent race conditions.
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
        // 3. Delegate to the CryptoPaymentService debit card off-ramp or on-chain transfer
        const result = await CryptoPaymentService.processDebitCardOffRamp(creatorId, amountInCents);
        return { success: true, message: 'USDC Payout successfully initiated.', transferId: result.transferId };
    } catch (error: any) {
        console.error("USDC Payout creation error:", error);
        throw new AppError(`Payout Error: ${error.message}`, 500);
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

import * as MessageService from './message.service';

/**
 * Sends a broadcast message to all active subscribers, optionally filtered by minimum tier.
 * @param creatorId - The ID of the creator sending the message.
 * @param text - The message text with optional {{username}} placeholder.
 * @param minTierId - Optional ID of the minimum tier to filter subscribers.
 */
export const broadcastMessage = async (creatorId: string, text: string, minTierId?: string) => {
    // 1. Fetch all active subscriptions with fan details
    const subscriptions = await SubscriptionModel.findSubscriptionsByCreator(creatorId);

    if (!subscriptions || subscriptions.length === 0) {
        return { success: true, count: 0, message: 'No active subscribers found.' };
    }

    // 2. Filter by Tier if minTierId is provided
    let eligibleSubs = subscriptions;
    if (minTierId) {
        const tiers = await getCreatorTiers(creatorId);
        const targetTier = tiers.find((t: any) => t.id === minTierId);

        if (targetTier) {
            // Find all tiers with price >= target tier price
            const eligibleTierIds = tiers
                .filter((t: any) => (t.price || 0) >= (targetTier.price || 0))
                .map((t: any) => t.id);

            eligibleSubs = subscriptions.filter(sub => eligibleTierIds.includes(sub.tier_id));
        }
    }

    // 3. Send personalized messages
    let sentCount = 0;

    // We process sequentially or with limited concurrency to avoid overwhelming the DB/Socket
    // For MVP, sequential loop is fine.
    for (const sub of eligibleSubs) {
        const fan = (sub as any).fan;
        if (!fan) continue;

        // Personalize text
        const personalizedText = text.replace(/{{username}}/g, fan.username || 'Fan');

        try {
            await MessageService.sendDirectMessage(creatorId, fan.id, { text: personalizedText });
            sentCount++;
        } catch (error) {
            console.error(`Failed to send broadcast to fan ${fan.id}:`, error);
            // Continue to next fan even if one fails
        }
    }

    return { success: true, count: sentCount, message: `Successfully sent ${sentCount} messages.` };
};

/**
 * Fetches the subscription tiers for a specific creator.
 * @param creatorId - The ID of the creator.
 */
export const getCreatorTiers = async (creatorId: string) => {
    const user = await requireUser(creatorId);

    // Tiers are stored in the JSONB column 'creator_data'
    const tiers = user.creator_data?.subscriptionTiers || [];
    return tiers;
};

/**
 * Generates a CSV string containing creator analytics metrics.
 * @param creator_id - The ID of the creator.
 */
export const exportMetricsCSV = async (creator_id: string): Promise<string> => {
    const analyticsData = await getAnalyticsData(creator_id);

    const rows: string[] = [];

    // 1. Top Level Metrics
    rows.push('--- Top Level Metrics ---');
    rows.push('Metric,Value');
    rows.push(`Total Subscribers,${analyticsData.metrics.totalSubscribers.value}`);
    // Assuming revenue is in cents
    rows.push(`Monthly Revenue (USD),${(analyticsData.metrics.monthlyRevenue.value / 100).toFixed(2)}`);
    rows.push(`Total Content Views,${analyticsData.metrics.totalViews.value}`);
    rows.push(`Gallery Adds,${analyticsData.metrics.galleryAdds.value}`);
    rows.push('');

    // 2. Revenue Breakdown
    rows.push('--- Revenue Breakdown ---');
    rows.push('Source,Amount (USD)');
    analyticsData.revenueBreakdown.forEach(item => {
        rows.push(`${item.name},${(item.value / 100).toFixed(2)}`);
    });
    rows.push('');

    // 3. Top Content
    rows.push('--- Top Performing Content ---');
    rows.push('Title,Views,Gallery Adds,Tips (USD),PPV Earnings (USD)');
    analyticsData.topContent.forEach(item => {
        const title = item.title ? `"${item.title.replace(/"/g, '""')}"` : 'Untitled';
        const views = item.stats.views || 0;
        const galleryAdds = item.stats.galleryAdds || 0;
        const tips = ((item.stats.tips || 0) / 100).toFixed(2);
        const ppv = ((item.stats.ppvEarnings || 0) / 100).toFixed(2);
        rows.push(`${title},${views},${galleryAdds},${tips},${ppv}`);
    });

    return rows.join('\\n');
};

/**
 * Generates a CSV string containing fan engagement metrics.
 * @param creator_id - The ID of the creator.
 */
export const exportFanEngagementCSV = async (creator_id: string): Promise<string> => {
    // 1. Fetch all subscriptions (active and historical) for the creator
    const { data: subscriptionsData, error: subsError } = await supabase
        .from('subscriptions')
        .select('*, fan:fan_id(id, username, email)')
        .eq('creator_id', creator_id);

    // 2. Fetch all cleared transactions
    const { data: txData, error: txError } = await supabase
        .from('transactions')
        .select('fan_id, amount, type, created_at')
        .eq('creator_id', creator_id)
        .eq('status', 'Cleared');

    // 3. Fetch analytics events
    const { data: analyticsData, error: analyticsError } = await supabase
        .from('analytics_events')
        .select('viewer_id, event_type')
        .eq('creator_id', creator_id);

    // 4. Fetch creator's subscription tiers to map IDs to Names
    const tiers = await getCreatorTiers(creator_id);
    const tierMap = new Map<string, string>();
    tiers.forEach((t: any) => tierMap.set(t.id, t.name));

    // Aggregate data per fan
    const fanStats: Record<string, any> = {};

    if (subscriptionsData) {
        subscriptionsData.forEach(sub => {
            const fan = (sub as any).fan;
            if (!fan) return;
            if (!fanStats[fan.id]) {
                fanStats[fan.id] = {
                    username: fan.username || 'Unknown',
                    email: fan.email || 'Unknown',
                    tier: tierMap.get(sub.tier_id) || sub.tier_id || 'None',
                    status: sub.status || 'inactive',
                    createdAt: sub.created_at,
                    tips: 0,
                    spend: 0,
                    views: 0,
                    galleryAdds: 0,
                };
            } else if (sub.status === 'active') {
                // If a user has multiple sub records, favor the active one
                fanStats[fan.id].status = 'active';
                fanStats[fan.id].tier = tierMap.get(sub.tier_id) || sub.tier_id || 'None';
                // Keep the earliest creation date to maximize months subscribed
                if (new Date(sub.created_at) < new Date(fanStats[fan.id].createdAt)) {
                    fanStats[fan.id].createdAt = sub.created_at;
                }
            }
        });
    }

    if (txData) {
        txData.forEach(tx => {
            const fanId = tx.fan_id;
            if (!fanId) return;
            if (!fanStats[fanId]) {
                fanStats[fanId] = { username: 'Unknown', email: 'Unknown', tier: 'None', status: 'inactive', createdAt: tx.created_at, tips: 0, spend: 0, views: 0, galleryAdds: 0 };
            }
            fanStats[fanId].spend += (tx.amount || 0);
            if (tx.type === 'Tip') {
                fanStats[fanId].tips += (tx.amount || 0);
            }
        });
    }

    if (analyticsData) {
        analyticsData.forEach(evt => {
            const fanId = evt.viewer_id;
            if (!fanId) return;
            if (!fanStats[fanId]) {
                fanStats[fanId] = { username: 'Unknown', email: 'Unknown', tier: 'None', status: 'inactive', createdAt: new Date().toISOString(), tips: 0, spend: 0, views: 0, galleryAdds: 0 };
            }
            if (evt.event_type === 'post_view') fanStats[fanId].views++;
            if (evt.event_type === 'gallery_add') fanStats[fanId].galleryAdds++;
        });
    }

    const rows: string[] = [];
    rows.push('Username,Email,Status,Tier,Months Subscribed,Tips (USD),Total Spend (USD),Content Views,Gallery Adds');

    Object.values(fanStats).forEach(stat => {
        const username = `"${stat.username.replace(/"/g, '""')}"`;
        const email = `"${stat.email.replace(/"/g, '""')}"`;
        const daysSinceFirstAction = (new Date().getTime() - new Date(stat.createdAt).getTime()) / (1000 * 60 * 60 * 24);
        const monthsSubscribed = Math.max(1, Math.ceil(daysSinceFirstAction / 30));
        
        const tips = (stat.tips / 100).toFixed(2);
        const spend = (stat.spend / 100).toFixed(2);

        rows.push(`${username},${email},${stat.status},${stat.tier},${monthsSubscribed},${tips},${spend},${stat.views},${stat.galleryAdds}`);
    });

    return rows.join('\\n');
};
