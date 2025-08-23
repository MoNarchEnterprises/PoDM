import { AppError } from '../middleware/error.middleware';
// --- Import Model Functions ---
import * as UserModel from '../models/user.model';
import * as TransactionModel from '../models/transaction.model';
import * as SupportTicketModel from '../models/supportTicket.model';
import * as ContentModel from '../models/content.model';
import { User } from '@common/types/User';

// --- Local Type Definitions ---
type UserGrowthData = {
    name: string; // e.g., "Jan", "Feb", "Mar"
    Users: number;
};

// --- Helper Function to Reshape User Data ---
/**
 * Transforms a flat user object from the database into the nested structure
 * expected by the frontend, which includes a 'profile' object.
 * @param dbUser - The user object directly from the Supabase 'profiles' table.
 * @returns A user object that matches the frontend's expected User type.
 */
const reshapeUserForFrontend = (dbUser: any): User => {
    const {id, username, avatar_url, bio, ...restOfUser } = dbUser;
    console.log('admin.service: Name:', username, 'Avatar:', avatar_url, 'Bio:', bio);
    return {
        _id: id,
        username: username || 'Unknown User',
        ...restOfUser,
        profile: {
            name: username || 'Unknown User',
            email: dbUser.email || '', // Ensure email is included
            // **FIX:** Provide a default placeholder if the avatar is missing.
            avatar: avatar_url || 'https://placehold.co/150x150/7E22CE/FFFFFF?text=U',
            bio: bio || '',
        },
    } as User;
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

/**
 * Fetches a list of all users and reshapes them for the frontend.
 */
export const getAllUsers = async (query: any) => {
    const usersFromDb = await UserModel.findAll(query);
    if (!usersFromDb) return [];
    console.log('Users from DB:', usersFromDb);
    return usersFromDb.map(reshapeUserForFrontend);
};

/**
 * Updates the status of a specific user.
 */
export const updateUserStatus = async (userId: string, status: string) => {
    const updatedUser = await UserModel.updateProfile(userId, { status });
    if (!updatedUser) {
        throw new AppError('User not found or failed to update.', 404);
    }
    return reshapeUserForFrontend(updatedUser); // Reshape the updated user too
};

/**
 * Fetches all content that has been flagged for moderation.
 */
export const getFlaggedContent = async () => {
    const flaggedContent = await ContentModel.findContentByStatus('flagged');
    return flaggedContent || [];
};

/**
 * Updates the status of a piece of content.
 */
export const updateContentStatus = async (contentId: string, status: string) => {
    const updatedContent = await ContentModel.updateContent(contentId, { status });
    if (!updatedContent) {
        throw new AppError('Content not found or failed to update.', 404);
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
    const tickets = await SupportTicketModel.findAllSupportTickets();
    return tickets || [];
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
    // **FIX:** Map over the database results and transform each admin object.
    return adminsFromDb.map(reshapeUserForFrontend);
};
