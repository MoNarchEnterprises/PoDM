import { Request, Response, NextFunction } from 'express';
import { AppError } from '../middleware/error.middleware';
import * as AdminService from '../services/admin.service';
import * as EmailService from '../services/email.service';
import * as UserModel from '../models/user.model';
import { asyncHandler } from '../utils/asyncHandler';
import { ok, okMsg } from '../utils/response';

export const getDashboardStats = asyncHandler(async (req: Request, res: Response) => {
    const stats = await AdminService.getDashboardStats();
    ok(res, stats);
});

export const getAllUsers = asyncHandler(async (req: Request, res: Response) => {
    const users = await AdminService.getAllUsers();
    ok(res, users);
});

export const getAdminUsers = asyncHandler(async (req: Request, res: Response) => {
    const admins = await AdminService.getAdminUsers();
    ok(res, admins);
});

export const updateUserStatus = asyncHandler(async (req: Request, res: Response) => {
    const { id: userId } = req.params;
    const { status } = req.body;

    if (!status) {
        throw new AppError('Status is required.', 400);
    }

    const updatedUser = await AdminService.updateUserStatus(userId, status);
    ok(res, updatedUser);
});

export const getFlaggedContent = asyncHandler(async (req: Request, res: Response) => {
    const content = await AdminService.getFlaggedContent();
    ok(res, content);
});

export const updateContentStatus = asyncHandler(async (req: Request, res: Response) => {
    const { id: contentId } = req.params;
    const { status } = req.body;

    if (!status) {
        throw new AppError('Status is required.', 400);
    }

    const updatedContent = await AdminService.updateContentStatus(contentId, status);
    ok(res, updatedContent);
});

export const getPlatformAnalytics = asyncHandler(async (req: Request, res: Response) => {
    const { period, groupBy, creatorId, year, month, startDate, endDate } = req.query;

    const periodStr = period as string;
    const groupByStr = (groupBy === 'day') ? 'day' : 'month';
    const creatorIdStr = creatorId as string;
    const yearNum = year ? parseInt(year as string) : undefined;
    const monthStr = month as string;
    const startDateStr = startDate as string;
    const endDateStr = endDate as string;

    const analytics = await AdminService.getPlatformAnalytics(
        periodStr, groupByStr, creatorIdStr, yearNum, monthStr, startDateStr, endDateStr
    );
    ok(res, analytics);
});

export const generateReport = asyncHandler(async (req: Request, res: Response) => {
    const reportData = req.body;
    const report = await AdminService.generateReport(reportData);
    ok(res, report);
});

export const getSavedReports = asyncHandler(async (req: Request, res: Response) => {
    const reports = await AdminService.getSavedReports();
    ok(res, reports);
});

export const getSupportTickets = asyncHandler(async (req: Request, res: Response) => {
    const tickets = await AdminService.getSupportTickets();
    ok(res, tickets);
});

export const updateSupportTicket = asyncHandler(async (req: Request, res: Response) => {
    const { id: ticketId } = req.params;
    const updates = req.body;

    if (Object.keys(updates).length === 0) {
        throw new AppError('No updates provided.', 400);
    }

    const updatedTicket = await AdminService.updateSupportTicket(ticketId, updates);
    ok(res, updatedTicket);
});

export const getSettings = asyncHandler(async (req: Request, res: Response) => {
    const settings = await AdminService.getPlatformSettings();
    ok(res, settings);
});

export const updateSettings = asyncHandler(async (req: Request, res: Response) => {
    const result = await AdminService.updatePlatformSettings(req.body);
    res.status(200).json(result);
});

export const setCreatorCommission = asyncHandler(async (req: Request, res: Response) => {
    const { id: creatorId } = req.params;
    const { commissionRate } = req.body;

    const updatedUser = await AdminService.updateCreatorCommission(creatorId, commissionRate);
    ok(res, updatedUser);
});

export const getCreatorVerificationDocs = asyncHandler(async (req: Request, res: Response) => {
    const { id: userId } = req.params;
    const urls = await AdminService.getVerificationDocs(userId);
    ok(res, urls);
});

export const messageUser = asyncHandler(async (req: Request, res: Response) => {
    const { id: userId } = req.params;
    const { subject, message } = req.body;
    const adminUser = req.user as any;

    if (!subject || !message) {
        throw new AppError('Subject and message are required.', 400);
    }

    const user = await UserModel.findUserById(userId);
    if (!user || !user.email) {
        throw new AppError('User not found or has no email.', 404);
    }

    const adminUsername = adminUser.profile?.name?.replace(/\s+/g, '').toLowerCase() || 'admin';
    const fromAddress = `${adminUsername}@podm.app`;
    const replyToAddress = adminUser.email;

    await EmailService.sendEmail(
        user.email, subject, message, undefined, fromAddress, replyToAddress
    );

    okMsg(res, 'Email sent successfully.');
});
