import { createSupportTicket as createSupportTicketModel } from '../models/supportTicket.model';

export const createSupportTicket = async (userId: string, subject: string, description: string) => {
    const ticket = await createSupportTicketModel({
        user_id: userId,
        subject,
        conversation: [{ senderId: userId, message: description, timestamp: new Date().toISOString() }],
        status: 'Open',
    });
    return ticket;
};