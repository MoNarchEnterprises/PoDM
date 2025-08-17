import { Request, Response, NextFunction } from 'express';
import { AppError } from '../middleware/error.middleware';

// --- Import Service Functions ---
import * as AdminService from '../services/admin.service';

/**
 * @desc    Get key metrics for the admin dashboard
 * @route   GET /api/v1/admin/dashboard
 * @access  Private (Admins only)
 */
export const getDashboardStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const stats = await AdminService.getDashboardStats();
        res.status(200).json({ success: true, data: stats });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get a list of all users with filtering
 * @route   GET /api/v1/admin/users
 * @access  Private (Admins only)
 */
export const getAllUsers = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const users = await AdminService.getAllUsers(req.query);
        res.status(200).json({ success: true, data: users });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get all users with the 'admin' role
 * @returns A list of admin users.
 */
export const getAdminUsers = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const admins = await AdminService.getAdminUsers();
        res.status(200).json({ success: true, data: admins });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Update a user's status (suspend, ban, activate)
 * @route   PUT /api/v1/admin/users/:id/status
 * @access  Private (Admins only)
 */
export const updateUserStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id: userId } = req.params;
        const { status } = req.body;

        if (!status) {
            throw new AppError('Status is required.', 400);
        }

        const updatedUser = await AdminService.updateUserStatus(userId, status);
        res.status(200).json({ success: true, data: updatedUser });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get all content that has been flagged for review
 * @route   GET /api/v1/admin/content/flagged
 * @access  Private (Admins only)
 */
export const getFlaggedContent = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const content = await AdminService.getFlaggedContent();
        res.status(200).json({ success: true, data: content });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Update the status of a piece of content (approve, remove)
 * @route   PUT /api/v1/admin/content/:id/status
 * @access  Private (Admins only)
 */
export const updateContentStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id: contentId } = req.params;
        const { status } = req.body;

        if (!status) {
            throw new AppError('Status is required.', 400);
        }

        const updatedContent = await AdminService.updateContentStatus(contentId, status);
        res.status(200).json({ success: true, data: updatedContent });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get platform-wide analytics data
 * @route   GET /api/v1/admin/analytics
 * @access  Private (Admins only)
 */
export const getPlatformAnalytics = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const analytics = await AdminService.getPlatformAnalytics();
        res.status(200).json({ success: true, data: analytics });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Generate a custom report
 * @route   POST /api/v1/admin/reports
 * @access  Private (Admins only)
 */
export const generateReport = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const reportData = req.body; // Assume the report data is in the request body
        const report = await AdminService.generateReport(reportData);
        res.status(200).json({ success: true, data: report });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get all support tickets
 * @route   GET /api/v1/admin/support-tickets
 * @access  Private (Admins only)
 */
export const getSupportTickets = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const tickets = await AdminService.getSupportTickets();
        res.status(200).json({ success: true, data: tickets });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Update a support ticket (e.g., change status, add reply)
 * @route   PUT /api/v1/admin/support-tickets/:id
 * @access  Private (Admins only)
 */
export const updateSupportTicket = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id: ticketId } = req.params;
        const updates = req.body;

        if (Object.keys(updates).length === 0) {
            throw new AppError('No updates provided.', 400);
        }

        const updatedTicket = await AdminService.updateSupportTicket(ticketId, updates);
        res.status(200).json({ success: true, data: updatedTicket });
    } catch (error) {
        next(error);
    }
};
