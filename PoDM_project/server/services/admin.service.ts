import { AppError } from '../middleware/error.middleware';

// --- Import Model Functions ---
import * as UserModel from '../models/user.model';
import * as TransactionModel from '../models/transaction.model';
import * as SupportTicketModel from '../models/supportTicket.model';
import * as ContentModel from '../models/content.model';


/**
 * Fetches and aggregates key metrics for the main admin dashboard.
 * This service function calls the data access layer (models) to get the data.
 */
export const getDashboardStats = async () => {
    // Use Promise.all to fetch all metrics concurrently for better performance
    const [
        totalUsers,
        activeCreators,
        monthlyRevenue,
        openTickets
    ] = await Promise.all([
        UserModel.countAllUsers(),
        UserModel.countActiveCreators(),
        TransactionModel.sumPlatformFeeForPeriod(30), // Get revenue from the last 30 days
        SupportTicketModel.countOpenTickets()
    ]);

    return {
        totalUsers,
        activeCreators,
        monthlyRevenue,
        openTickets,
    };
};

/**
 * Fetches a list of all users with optional filtering.
 * @param query - The query parameters from the request (for filtering).
 */
export const getAllUsers = async (query: any) => {
    // In a real app, you would pass the filters to the model function
    const users = await UserModel.findAll(query);
    return users;
    
};

/**
 * Updates the status of a specific user.
 * @param userId - The ID of the user to update.
 * @param status - The new status to set.
 */
export const updateUserStatus = async (userId: string, status: string) => {
    const updatedUser = await UserModel.updateProfile(userId, { status });
    if (!updatedUser) {
        throw new AppError('User not found or failed to update.', 404);
    }
    return updatedUser;
};

/**
 * Fetches all content that has been flagged for moderation.
 */
export const getFlaggedContent = async () => {
    const flaggedContent = await ContentModel.findContentByStatus('flagged');
    return flaggedContent;
};

/**
 * Updates the status of a piece of content.
 * @param contentId - The ID of the content to update.
 * @param status - The new status (e.g., 'published' or 'removed').
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
    // Example: Fetch total users, active users, and content statistics
    const totalUsers = await UserModel.countAllUsers();
    const activeUsers = await UserModel.countActiveUsers();
    const totalContent = await ContentModel.countAllContent();

    return {
        totalUsers,
        activeUsers,
        totalContent,
    };
};

/**
 * Generates a custom report based on provided parameters.
 * @param reportParams - The parameters for the report.
 */
export const generateReport = async (reportParams: any) => {
    // This function would typically call a model function to generate the report
    // For simplicity, let's assume it returns a mock report
    const report = {
        title: 'Custom Report',
        date: new Date(),
        data: [], // Populate with actual data based on reportParams
    };
    return report;
};

/**
 * Fetches all support tickets for admin review.
 */
export const getSupportTickets = async () => {
    const tickets = await SupportTicketModel.findAllSupportTickets();
    return tickets;
};

/**
 * Updates a specific support ticket (e.g., change status, add reply).
 * @param ticketId - The ID of the ticket to update.
 * @param updates - An object containing the fields to update.
 */
export const updateSupportTicket = async (ticketId: string, updates: any) => {
    const updatedTicket = await SupportTicketModel.updateSupportTicket(ticketId, updates);
    if (!updatedTicket) {
        throw new AppError('Support ticket not found or failed to update.', 404);
    }
    return updatedTicket;
};

/**
 * Fetches a list of all admin users.
 */
export const getAdminUsers = async () => {
    // This function would typically fetch admin users from the database
    const admins = await UserModel.findAdmins();
    if (!admins) {
        throw new AppError('No admin users found.', 404);
    }   
   };