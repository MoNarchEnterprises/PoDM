import { createSupportTicket as createSupportTicketModel, findSupportTicketById, updateSupportTicket as updateSupportTicketModel } from '../models/supportTicket.model';
import * as UserModel from '../models/user.model';
import { AppError } from '../middleware/error.middleware';
import { SupportTicket, TicketMessage } from '@common/types/SupportTicket';
import { User } from '@common/types/User';

export const createSupportTicket = async (userId: string, subject: string, description: string) => {
    const user = await UserModel.findUserById(userId);
    if (!user) {
        throw new AppError('User creating ticket not found.', 404);
    }

    const ticket = await createSupportTicketModel({
        user_id: userId,
        subject,
        conversation: [{
            senderId: userId,
            senderName: user.profile.name,
            text: description,
            timestamp: new Date().toISOString()
        }],
        status: 'Open',
    });
    return ticket;
};

/**
 * Adds a reply from an admin to a support ticket.
 * @param ticketId - The ID of the ticket to reply to.
 * @param adminUser - The admin user object who is replying.
 * @param text - The content of the reply.
 * @returns The updated support ticket object.
 */
export const addReplyToTicket = async (ticketId: string, adminUser: User, text: string) => {
    // 1. Find the existing ticket
    const ticket = await findSupportTicketById(ticketId);
    if (!ticket) {
        throw new AppError('Support ticket not found.', 404);
    }

    // 2. Create the new message object for the conversation
    const newReply: TicketMessage = {
        senderId: adminUser.id,
        senderName: adminUser.profile.name,
        text,
        timestamp: new Date().toISOString(),
    };

    // 3. Append the new reply to the existing conversation array
    const updatedConversation = [...ticket.conversation, newReply];

    // 4. Update the ticket in the database with the new conversation and a 'Pending' status
    const updatedTicket = await updateSupportTicketModel(ticketId, {
        conversation: updatedConversation,
        status: 'Pending', // Set status to pending as we are waiting for user
        updated_at: new Date().toISOString(),
    });

    if (!updatedTicket) {
        throw new AppError('Failed to update support ticket with new reply.', 500);
    }

    return updatedTicket;
};