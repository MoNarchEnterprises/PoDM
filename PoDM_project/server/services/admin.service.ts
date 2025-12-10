import { AppError } from '../middleware/error.middleware';
// --- Import Model Functions ---
import * as SettingsModel from '../models/settings.model';
import * as UserModel from '../models/user.model';
import * as TransactionModel from '../models/transaction.model';
import * as SupportTicketModel from '../models/supportTicket.model';
import * as ContentModel from '../models/content.model';
import * as ReportModel from '../models/report.model';
import { User } from '@common/types/User';
import { DEFAULT_COMMISSION_RATE } from '../../lib/constants';
import supabase from '../config/supabaseClient';
import { reshapeUserForApp } from '../utils/user.utils';

// --- Local Type Definitions ---
type UserGrowthData = {
    name: string; // e.g., "Jan", "Feb", "Mar"
    Users: number;
};




/**
 * Fetches and aggregates key metrics for the main admin dashboard.
 */
export const getDashboardStats = async () => {
    const [
        totalUsers,
        activeCreators,
        monthlyRevenue,
        openTickets
    ] = await Promise.all([
        UserModel.countAllUsers(),
        UserModel.countActiveCreators(),
        TransactionModel.sumPlatformFeeForPeriod(30),
        SupportTicketModel.countOpenTickets()
    ]);

    const userGrowth: UserGrowthData[] = [];

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
        const reports = await ReportModel.getReportsByContentId(content._id);
        const pendingReports = reports?.filter(r => r.status === 'pending') || [];

        return {
            ...content,
            reportCount: pendingReports.length,
            reason: pendingReports.length > 0 ? pendingReports[0].reason : 'Manually flagged by system',
            // We need to fetch the creator profile too, as the frontend expects 'creator' object
            creator: await UserModel.findUserById(content.creatorId)
        };
    }));

    return contentWithReports;
};

/**
 * Updates the status of a piece of content.
 * If approved (status='published'), dismisses all pending reports.
 */
export const updateContentStatus = async (contentId: string, status: string) => {
    const updatedContent = await ContentModel.updateContent(contentId, { status });
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
export const getPlatformAnalytics = async () => {
    const analyticsData = {
        revenueGrowth: [],
        engagement: [],
        topCreators: [],
    };
    return analyticsData;
};

/**
 * Generates a custom report based on provided parameters.
 */
export const generateReport = async (reportParams: any) => {
    const report = { title: 'Custom Report', date: new Date(), data: [] };
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
    // --- THIS IS THE FIX ---
    // Reshape the data to match the frontend's expected format (_id, camelCase).
    return ticketsFromDb.map(ticket => ({
        _id: ticket.id.toString(),
        userId: ticket.user_id,
        subject: ticket.subject,
        status: ticket.status,
        priority: ticket.priority,
        assignedAdminId: ticket.assigned_admin_id,
        conversation: ticket.conversation || [],
        createdAt: ticket.created_at,
        updatedAt: ticket.updated_at,
    }));
    // --- END OF FIX ---
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
    return shapedAdmins.filter((admin: null) => admin !== null) as User[];
};

/**
 * Fetches platform-wide settings.
 */
export const getPlatformSettings = async () => {
    const commissionRateSetting = await SettingsModel.getSetting('platform_commission_rate');
    return {
        commissionRate: commissionRateSetting?.value || DEFAULT_COMMISSION_RATE,
    };
};

/**
 * Updates platform-wide settings.
 */
export const updatePlatformSettings = async (settings: { commissionRate: number }) => {
    const { commissionRate } = settings;
    if (typeof commissionRate !== 'number') {
        throw new AppError('Commission rate must be a number.', 400);
    }

    await SettingsModel.updateSetting('platform_commission_rate', commissionRate);

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
    const { data: idData, error: idError } = await supabase.storage
        .from('verification-documents')
        .createSignedUrl(idFilePath, expiresIn);

    const { data: selfieData, error: selfieError } = await supabase.storage
        .from('verification-documents')
        .createSignedUrl(selfieFilePath, expiresIn);

    if (idError || selfieError || !idData || !selfieData) {
        throw new AppError('Could not generate secure URLs for documents.', 500);
    }

    return {
        idUrl: idData.signedUrl,
        selfieUrl: selfieData.signedUrl,
    };
};


