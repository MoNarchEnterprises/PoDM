import supabase from '../config/supabaseClient';
import { SupportTicket, TicketMessage } from '@common/types/SupportTicket';

/**
 * Creates a new support ticket in the database.
 * @param ticketData - The initial data for the new ticket.
 * @returns The newly created support ticket object.
 */
export const createSupportTicket = async (ticketData: Partial<SupportTicket>): Promise<SupportTicket | null> => {
    const { data, error } = await supabase
        .from('support_tickets')
        .insert([ticketData])
        .select()
        .single();

    if (error) {
        console.error('Error creating support ticket:', error.message);
        return null;
    }
    return data as SupportTicket;
};

/**
 * Finds a support ticket by its unique ID.
 * @param id - The ID of the support ticket to find.
 * @returns The support ticket object or null if not found.
 */
export const findSupportTicketById = async (id: string): Promise<SupportTicket | null> => {
    const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        console.error('Error finding support ticket by ID:', error.message);
        return null;
    }
    return data as SupportTicket;
};

/**
 * Finds all support tickets submitted by a specific user.
 * @param userId - The UUID of the user.
 * @returns An array of support ticket objects.
 */
export const findSupportTicketsByUser = async (userId: string): Promise<SupportTicket[] | null> => {
    const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error finding support tickets by user:', error.message);
        return null;
    }
    return data as SupportTicket[];
};

/**
 * Finds all support tickets (for admin use).
 * @returns An array of all support ticket objects.
 */
export const findAllSupportTickets = async (): Promise<SupportTicket[] | null> => {
    const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error finding all support tickets:', error.message);
        return null;
    }
    return data as SupportTicket[];
};


/**
 * Updates a support ticket, for example by adding a reply or changing its status.
 * @param id - The ID of the ticket to update.
 * @param updates - An object containing the fields to update (e.g., status, conversation).
 * @returns The updated support ticket object.
 */
export const updateSupportTicket = async (id: string, updates: Partial<SupportTicket>): Promise<SupportTicket | null> => {
    const { data, error } = await supabase
        .from('support_tickets')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('Error updating support ticket:', error.message);
        return null;
    }
    return data as SupportTicket;
};

/**
 * Counts the number of open support tickets.
 * @returns The count of tickets with the status 'Open'.
 */
export const countOpenTickets = async (): Promise<number> => {
    const { count, error } = await supabase
        .from('support_tickets')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'Open');

    if (error) {
        console.error('Error counting open tickets:', error.message);
        return 0;
    }
    return count || 0;
};
