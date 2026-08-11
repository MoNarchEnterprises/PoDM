import { AppError } from '../middleware/error.middleware';
// --- Import Model Functions ---
import * as SettingsModel from '../models/settings.model';
import * as UserModel from '../models/user.model';
import * as TransactionModel from '../models/transaction.model';
import * as SubscriptionModel from '../models/subscription.model';
import * as SupportTicketModel from '../models/supportTicket.model';
import * as ContentModel from '../models/content.model';
import * as ReportModel from '../models/report.model';
import { User } from '@common/types/User';
import { DEFAULT_COMMISSION_RATE } from '../../lib/constants';
import supabase from '../config/supabaseClient';
import { reshapeUserForApp } from '../utils/user.utils';
import * as StorageService from './storage.service';
import axios from 'axios';
import { ethers } from 'ethers';
import { getRpcUrl, getUsdcAddress } from '../utils/contract.utils';

async function getPlatformWalletBalance(address: string): Promise<number> {
    try {
        const usdcAddress = ethers.getAddress(getUsdcAddress());
        const iface = new ethers.Interface(["function balanceOf(address owner) view returns (uint256)"]);
        const calldata = iface.encodeFunctionData("balanceOf", [address]);
        const response = await axios.post(getRpcUrl(), {
            jsonrpc: '2.0',
            method: 'eth_call',
            params: [{ to: usdcAddress, data: calldata }, 'latest'],
            id: 1
        });
        return Number(BigInt(response.data.result)) / 1e6;
    } catch (err) {
        console.error(`Failed to fetch platform wallet balance for ${address}:`, err);
        return 0;
    }
}

// --- Local Type Definitions ---
type UserGrowthData = {
    name: string; // e.g., "Jan", "Feb", "Mar"
    Users: number;
};




/**
 * Fetches and aggregates key metrics for the main admin dashboard.
 */
/**
 * Fetches and aggregates key metrics for the main admin dashboard.
 */
export const getDashboardStats = async () => {
    const [
        totalUsers,
        activeCreators,
        monthlyRevenue,
        openTickets,
        userGrowth
    ] = await Promise.all([
        UserModel.countAllUsers(),
        UserModel.countActiveCreators(),
        TransactionModel.sumPlatformFeeForPeriod(30),
        SupportTicketModel.countOpenTickets(),
        UserModel.getNewUsersOverTime(6)
    ]);

    return {
        keyMetrics: {
            totalUsers: totalUsers || 0,
            activeCreators: activeCreators || 0,
            monthlyRevenue: monthlyRevenue || 0,
            openTickets: openTickets || 0,
        },
        userGrowth,
    };
};

export const getAllUsers = async () => { // Removed 'query' parameter for simplicity
    const usersFromDb = await UserModel.findAll();
    if (!usersFromDb) return [];

    // The data is now complete, we just need to reshape it
    return usersFromDb.map(user => reshapeUserForApp(user));
};

/**
 * Updates the status of a specific user.
 */
export const updateUserStatus = async (userId: string, status: string) => {
    const updatedUser = await UserModel.updateProfile(userId, { status });
    if (!updatedUser) {
        throw new AppError('User not found or failed to update.', 404);
    }


    // 3. UPDATE to use reshapeUserForApp
    return reshapeUserForApp(updatedUser);
};

/**
 * Fetches all content that has been flagged for moderation.
 * Aggregates report data for each content item.
 */
export const getFlaggedContent = async () => {
    // 1. Get all content marked as 'flagged'
    const flaggedContent = await ContentModel.findContentByStatus('flagged');
    if (!flaggedContent) return [];

    // 2. For each item, fetch reports to get the count and reason
    const contentWithReports = await Promise.all(flaggedContent.map(async (content) => {
        const reports = await ReportModel.getReportsByContentId(content.id);
        const pendingReports = reports?.filter(r => r.status === 'pending') || [];

        return {
            ...content,
            reportCount: pendingReports.length,
            reason: pendingReports.length > 0 ? pendingReports[0].reason : 'Manually flagged by system',
            // We need to fetch the creator profile too, as the frontend expects 'creator' object
            creator: await UserModel.findUserById(content.creator_id)
        };
    }));

    return contentWithReports;
};

/**
 * Updates the status of a piece of content.
 * If approved (status='published'), dismisses all pending reports.
 */
export const updateContentStatus = async (contentId: string, status: string) => {
    const updatedContent = await ContentModel.updateContent(contentId, { status: status as import('@common/types/Content').ContentStatus });
    if (!updatedContent) {
        throw new AppError('Content not found or failed to update.', 404);
    }

    // If content is approved/published, dismiss all pending reports
    if (status === 'published') {
        await ReportModel.dismissReportsForContent(contentId);
    }

    return updatedContent;
};

/**
 * Fetches platform-wide analytics data.
 */
/**
 * Fetches platform-wide analytics data with support for filtering and drill-down.
 */
export const getPlatformAnalytics = async (
    period: string = '6m',
    groupBy: 'month' | 'day' = 'month',
    creatorId?: string,
    year?: number,
    month?: string, // 'Jan', 'Feb', etc.
    startDateParam?: string,
    endDateParam?: string
) => {
    let startDate = new Date();
    let endDate = new Date();

    // Grouping Logic handle
    let effectiveGroupBy = groupBy;

    if (year && month) {
        // --- Drill Down Logic ---
        effectiveGroupBy = 'day';
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const monthIndex = monthNames.indexOf(month);

        if (monthIndex !== -1) {
            startDate = new Date(year, monthIndex, 1);
            endDate = new Date(year, monthIndex + 1, 0); // Last day of month
            endDate.setHours(23, 59, 59, 999);
        }
    } else if (startDateParam && endDateParam) {
        // --- Custom Date Range ---
        startDate = new Date(startDateParam);
        endDate = new Date(endDateParam);
        endDate.setHours(23, 59, 59, 999);
    } else {
        // --- Standard Period Logic ---
        startDate = new Date();

        switch (period) {
            case '30d':
                startDate.setDate(startDate.getDate() - 30);
                break;
            case '1y':
                startDate.setMonth(startDate.getMonth() - 12);
                startDate.setDate(1);
                break;
            case 'ytd':
                startDate = new Date(new Date().getFullYear(), 0, 1);
                break;
            case '6m':
            default:
                startDate.setMonth(startDate.getMonth() - 6);
                startDate.setDate(1);
                break;
        }
    }

    const [
        stats,
        topCreators
    ] = await Promise.all([
        TransactionModel.getTransactionStats(startDate, endDate, effectiveGroupBy, creatorId),
        TransactionModel.getTopCreatorsByRevenue(5, startDate, endDate)
    ]);

    return {
        revenueGrowth: stats.revenueGrowth,
        engagement: stats.engagement,
        topCreators: topCreators
    };
};

/**
 * Generates a custom report based on provided parameters.
 */
export const generateReport = async (reportParams: any) => {
    const { name, metrics, filters, dateRange } = reportParams;
    let data: any = {};

    // Default date range if not provided (last 30 days)
    const end = dateRange?.end ? new Date(dateRange.end) : new Date();
    const start = dateRange?.start ? new Date(dateRange.start) : new Date(new Date().setDate(end.getDate() - 30));

    console.log(`[AdminService] Generating report "${name}" for metrics: ${metrics} from ${start.toISOString()} to ${end.toISOString()}`);

    if (metrics === 'Users') {
        // Fetch user statistics
        const query: any = {};
        if (filters && filters !== 'No Filter') {
            // Example: Filter by user role if "User Type" is selected
            if (filters === 'User Type') {
                // In a real scenario, you'd want to aggregate counts by type
                data.userDistribution = {
                    creators: await UserModel.countActiveCreators(),
                    fans: (await UserModel.countAllUsers()) - (await UserModel.countActiveCreators())
                };
            }
        } else {
            data.totalUsers = await UserModel.countAllUsers();
            data.activeCreators = await UserModel.countActiveCreators();
        }
    } else if (metrics === 'Revenue') {
        // Fetch revenue statistics
        // For simplicity, just get total platform fees for now, or filter by date
        data.totalRevenue = await TransactionModel.sumPlatformFeeForPeriod(30); // Default to last 30 days
    } else if (metrics === 'Engagement') {
        // Engagement Metrics: Tips, Unlocks, New Subscriptons
        // Corrected: Use capitalized types 'Tip', 'PPV Post', 'PPV Message' to match DB
        const tipsCount = await TransactionModel.countTransactionsByTypeAndPeriod('Tip', start);
        const postUnlocks = await TransactionModel.countTransactionsByTypeAndPeriod('PPV Post', start);
        const messageUnlocks = await TransactionModel.countTransactionsByTypeAndPeriod('PPV Message', start);

        const unlocksCount = postUnlocks + messageUnlocks;
        const newSubsCount = await SubscriptionModel.countAllNewSubscribersInPeriod(start);

        data.engagement = {
            tips: tipsCount,
            unlocks: unlocksCount,
            newSubscriptions: newSubsCount,
            totalInteractions: tipsCount + unlocksCount + newSubsCount
        };
    }

    const report = {
        name: name || 'Custom Report',
        lastRun: new Date().toISOString(),
        metrics,
        filters,
        dateRange: { start, end },
        data
    };

    // Save report to database
    await TransactionModel.saveReport(report);

    return report;
};

/**
 * Fetches all saved reports.
 */
export const getSavedReports = async () => {
    const reports = await TransactionModel.findAllReports();
    return reports || [];
};

/**
 * Fetches all support tickets for admin review.
 */
export const getSupportTickets = async () => {
    const ticketsFromDb = await SupportTicketModel.findAllSupportTickets();
    if (!ticketsFromDb) {
        return [];
    }

    // Extract unique user IDs
    const userIds = Array.from(new Set(ticketsFromDb.map(ticket => ticket.user_id)));

    // Fetch users info
    const users = await UserModel.findUsersByIds(userIds);
    const userMap = new Map(users.map(u => [u.id, u.profile?.name || 'Unknown']));

    // Enrich tickets with user_name
    return ticketsFromDb.map(ticket => ({
        ...ticket,
        user_name: userMap.get(ticket.user_id) || 'Unknown User'
    }));
};

/**
 * Updates a specific support ticket.
 */
export const updateSupportTicket = async (ticketId: string, updates: any) => {
    const updatedTicket = await SupportTicketModel.updateSupportTicket(ticketId, updates);
    if (!updatedTicket) {
        throw new AppError('Support ticket not found or failed to update.', 404);
    }
    return updatedTicket;
};

/**
 * Fetches a list of all admin users and reshapes them for the frontend.
 */
export const getAdminUsers = async () => {
    const adminsFromDb = await UserModel.findAdmins();
    if (!adminsFromDb) {
        return [];
    }

    const shapedAdmins = await Promise.all(adminsFromDb.map(async (admin: User) => {
        const { data: { user: authUser } } = await supabase.auth.admin.getUserById(admin.id);
        // 3. UPDATE to use reshapeUserForApp
        return authUser ? reshapeUserForApp(admin) : null;
    }));
    return shapedAdmins.filter((admin): admin is User => admin !== null);
};

/**
 * Fetches platform-wide settings.
 */
export const getPlatformSettings = async () => {
    const [commissionRateSetting, aiProviderSetting, aiModelIdSetting] = await Promise.all([
        SettingsModel.getSetting('platform_commission_rate'),
        SettingsModel.getSetting('ai_provider'),
        SettingsModel.getSetting('ai_model_id'),
    ]);

    const platformWalletAddress = process.env.PLATFORM_TREASURY_ADDRESS || '0x71c3a2891A15245d2416C77eb460B274AB1C7903';
    const platformWalletBalance = await getPlatformWalletBalance(platformWalletAddress);

    return {
        commissionRate: commissionRateSetting?.value || DEFAULT_COMMISSION_RATE,
        aiProvider: aiProviderSetting?.value || 'openrouter',
        aiModelId: aiModelIdSetting?.value || process.env.AI_MODEL_ID || 'google/gemma-3-27b-it:free',
        hasAiApiKey: Boolean(process.env.AI_API_KEY || process.env.OPENROUTER_API_KEY),
        hasNvidiaApiKey: Boolean(process.env.NVIDIA_API_KEY),
        hasOpenaiApiKey: Boolean(process.env.OPENAI_API_KEY),
        platformWalletAddress,
        platformWalletBalance,
    };
};

/**
 * Updates platform-wide settings.
 */
export const updatePlatformSettings = async (settings: {
    commissionRate?: number;
    aiProvider?: string;
    aiModelId?: string;
}) => {
    const updates: Promise<any>[] = [];

    if (settings.commissionRate !== undefined) {
        if (typeof settings.commissionRate !== 'number') {
            throw new AppError('Commission rate must be a number.', 400);
        }
        updates.push(SettingsModel.updateSetting('platform_commission_rate', settings.commissionRate));
    }

    if (settings.aiProvider !== undefined) {
        if (typeof settings.aiProvider !== 'string' || !settings.aiProvider.trim()) {
            throw new AppError('AI provider must be a non-empty string.', 400);
        }
        updates.push(SettingsModel.updateSetting('ai_provider', settings.aiProvider.trim()));
    }

    if (settings.aiModelId !== undefined) {
        if (typeof settings.aiModelId !== 'string' || !settings.aiModelId.trim()) {
            throw new AppError('AI model ID must be a non-empty string.', 400);
        }
        updates.push(SettingsModel.updateSetting('ai_model_id', settings.aiModelId.trim()));
    }

    if (updates.length === 0) {
        throw new AppError('No valid settings provided.', 400);
    }

    await Promise.all(updates);
    return { success: true, message: 'Platform settings updated.' };
};

/**
 * Updates the custom commission rate for a specific creator.
 */
export const updateCreatorCommission = async (creatorId: string, commissionRate: number | null) => {
    const user = await UserModel.findUserById(creatorId);
    if (!user || user.role !== 'creator') {
        throw new AppError('Creator not found.', 404);
    }

    if (user.is_enclave_member) {
        throw new AppError('Enclave members are locked at 10% commission.', 400);
    }

    if (commissionRate !== null && (commissionRate < 0 || commissionRate > 100)) {
        throw new AppError('Commission rate must be between 0 and 100.', 400);
    }

    const updatedUser = await UserModel.updateProfile(creatorId, { commission_rate: commissionRate });
    if (!updatedUser) {
        throw new AppError('Failed to update creator commission.', 500);
    }

    // 3. UPDATE to use reshapeUserForApp
    return reshapeUserForApp(updatedUser);
};

/**
 * Generates secure, temporary (signed) URLs for a creator's verification documents.
 * @param userId The ID of the creator whose documents are being requested.
 * @returns An object containing the signed URLs for the ID and selfie.
 */
export const getVerificationDocs = async (userId: string) => {
    const user = await UserModel.findUserById(userId);

    if (!user || !user.verification_data) {
        throw new AppError('No verification data found for this user.', 404);
    }

    const { idFilePath, selfieFilePath } = user.verification_data;

    if (!idFilePath || !selfieFilePath) {
        throw new AppError('Document file paths are missing.', 404);
    }

    // Generate signed URLs that are valid for 60 seconds
    const expiresIn = 60;
    const { signedUrl: idUrl, error: idError } = await StorageService.getPrivateSignedUrl(idFilePath, expiresIn);
    const { signedUrl: selfieUrl, error: selfieError } = await StorageService.getPrivateSignedUrl(selfieFilePath, expiresIn);

    if (idError || selfieError || !idUrl || !selfieUrl) {
        throw new AppError('Could not generate secure URLs for documents.', 500);
    }

    return {
        idUrl,
        selfieUrl,
    };
};
