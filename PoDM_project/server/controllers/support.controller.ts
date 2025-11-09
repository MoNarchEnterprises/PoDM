import { Request, Response, NextFunction } from 'express';
import * as supportService from '../services/support.service';

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