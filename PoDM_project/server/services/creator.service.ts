// /server/services/creator.service.ts

import * as SubscriptionModel from '../models/subscription.model';
import * as TransactionModel from '../models/transaction.model';
import * as ContentModel from '../models/content.model';

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