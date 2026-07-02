import { Request, Response, NextFunction } from 'express';
import * as supportService from '../services/support.service';
import { AppError } from '../middleware/error.middleware';
import { User } from '@common/types/User';
import { asyncHandler } from '../utils/asyncHandler';
import { ok, created } from '../utils/response';

export const createSupportTicket = asyncHandler(async (req: Request, res: Response) => {
    const { subject, description } = req.body;
    const userId = req.user?.id ?? '';
    const ticket = await supportService.createSupportTicket(userId, subject, description);
    created(res, ticket);
});

export const replyToTicket = asyncHandler(async (req: Request, res: Response) => {
    const { id: ticketId } = req.params;
    const { text } = req.body;
    const adminUser = req.user as User;

    if (!text) {
        throw new AppError('Reply text is required.', 400);
    }

    const updatedTicket = await supportService.addReplyToTicket(ticketId, adminUser, text);
    ok(res, updatedTicket);
});

export const getTicketById = asyncHandler(async (req: Request, res: Response) => {
    const { id: ticketId } = req.params;
    const ticket = await supportService.getTicketDetails(ticketId);
    ok(res, ticket);
});

export const resolveTicket = asyncHandler(async (req: Request, res: Response) => {
    const { id: ticketId } = req.params;
    const ticket = await supportService.resolveTicket(ticketId);
    ok(res, ticket);
});
