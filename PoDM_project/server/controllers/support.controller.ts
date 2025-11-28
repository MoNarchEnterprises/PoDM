import { Request, Response, NextFunction } from 'express';
import * as supportService from '../services/support.service';
import { AppError } from '../middleware/error.middleware';
import { User } from '@common/types/User';

export const createSupportTicket = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { subject, description } = req.body;
        const userId = req.user._id;
        const ticket = await supportService.createSupportTicket(userId, subject, description);
        res.status(201).json({ success: true, data: ticket });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Add a reply to a support ticket
 * @route   PUT /api/v1/support/tickets/:id/reply
 * @access  Private (Admins only)
 */
export const replyToTicket = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id: ticketId } = req.params;
        const { text } = req.body;
        const adminUser = req.user as User; // The 'protect' middleware attaches the user

        if (!text) {
            throw new AppError('Reply text is required.', 400);
        }

        const updatedTicket = await supportService.addReplyToTicket(ticketId, adminUser, text);
        res.status(200).json({ success: true, data: updatedTicket });
    } catch (error) {
        next(error);
    }
};