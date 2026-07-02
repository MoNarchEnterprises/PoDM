import { createSupportTicket as createSupportTicketModel, findSupportTicketById, findSupportTicketsByUser, updateSupportTicket as updateSupportTicketModel } from '../models/supportTicket.model';
import * as UserModel from '../models/user.model';
import { AppError } from '../middleware/error.middleware';
import { requireUser } from '../utils/entityGuards';
import { SupportTicket, TicketMessage } from '@common/types/SupportTicket';
import { User } from '@common/types/User';

export const createSupportTicket = async (userId: string, subject: string, description: string) => {
    const user = await requireUser(userId);

    // Safely access user's name - check for nested profile structure or flat structure
    const userName = user.profile?.name || (user as any).name || 'Unknown User';

    const ticket = await createSupportTicketModel({
        user_id: userId,
        subject,
        conversation: [{
            senderId: userId,
            senderName: userName,
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

    // Safely access admin's name
    const adminName = adminUser?.profile?.name || (adminUser as any)?.name || 'Support';

    // 2. Create the new message object for the conversation
    const newReply: TicketMessage = {
        senderId: adminUser.id,
        senderName: adminName,
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

    // 5. Send a direct message to the user so they see it in their messages
    // Using require() to avoid module resolution issues in production build
    try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const messageService = require('./message.service');
        await messageService.sendDirectMessage(adminUser.id, ticket.user_id, {
            text: text,
        });
    } catch (error) {
        console.error('Failed to send DM for support reply:', error);
        // We do not throw here to avoid failing the ticket update if messaging fails
        // though in a perfect world we might want transactionality.
    }

    return updatedTicket;
};

/**
 * Appends a user's message to their active support ticket if one exists.
 * @param userId - The ID of the user sending the message.
 * @param text - The content of the message.
 * @param senderName - The name of the sender.
 */
export const appendUserMessageToActiveTicket = async (userId: string, text: string, senderName: string) => {
    // 1. Find active tickets for the user
    // We assume the most recent open/pending ticket is the one they are replying to.
    const tickets = await findSupportTicketsByUser(userId);

    // Filter for active tickets
    const activeTicket = tickets?.find(t => t.status === 'Open' || t.status === 'Pending');

    if (!activeTicket) {
        return null; // No active ticket to update
    }

    // 2. Create message object
    const newMessage: TicketMessage = {
        senderId: userId,
        senderName: senderName,
        text,
        timestamp: new Date().toISOString(),
    };

    // 3. Update conversation
    const updatedConversation = [...activeTicket.conversation, newMessage];

    // 4. Save ticket (and maybe set status to Open? User didn't explicitly say to change status on user reply, but usually it goes back to Open)
    // The prompt says: "if the user responds... get added to existing support ticket."
    // It doesn't explicitly say "Set to Open", but that's standard. 
    // However, I will stick to JUST adding it for now to be safe, or set to Open if it was Pending.
    // Let's set it to 'Open' if it was 'Pending' because it needs admin attention now.
    const newStatus = activeTicket.status === 'Pending' ? 'Open' : activeTicket.status;

    await updateSupportTicketModel(activeTicket.id, {
        conversation: updatedConversation,
        status: newStatus,
        updated_at: new Date().toISOString(),
    });

    return activeTicket.id;
};

/**
 * Retrieves a ticket's details. If the ticket is 'Open', it updates the status to 'Pending'
 * to indicate the admin has viewed it.
 * @param ticketId - The ID of the ticket.
 */
export const getTicketDetails = async (ticketId: string) => {
    const ticket = await findSupportTicketById(ticketId);
    if (!ticket) {
        throw new AppError('Support ticket not found.', 404);
    }

    // "Once the admin views the ticket, set it to pending."
    // We only change it if it is currently 'Open'. 
    if (ticket.status === 'Open') {
        const updatedTicket = await updateSupportTicketModel(ticketId, {
            status: 'Pending',
            updated_at: new Date().toISOString()
        });
        return updatedTicket || ticket;
    }

    return ticket;
};

/**
 * Resolves a support ticket.
 * @param ticketId - The ID of the ticket.
 */
export const resolveTicket = async (ticketId: string) => {
    const ticket = await findSupportTicketById(ticketId);
    if (!ticket) {
        throw new AppError('Support ticket not found.', 404);
    }

    const updatedTicket = await updateSupportTicketModel(ticketId, {
        status: 'Resolved',
        updated_at: new Date().toISOString()
    });

    if (!updatedTicket) {
        throw new AppError('Failed to resolve ticket.', 500);
    }
    return updatedTicket;
};