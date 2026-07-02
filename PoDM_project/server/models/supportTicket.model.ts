import supabase from '../config/supabaseClient';
import { SupportTicket, TicketMessage } from '@common/types/SupportTicket';
import { handleQuery, handleCount, handleList } from '../utils/database';

export const createSupportTicket = async (ticketData: Partial<SupportTicket>): Promise<SupportTicket | null> => {
    const { data, error } = await supabase
        .from('support_tickets')
        .insert([ticketData])
        .select()
        .single();

    if (error) {
        console.error('Error creating support ticket:', error.message);
        throw new Error(error.message);
    }
    return data as SupportTicket;
};

export const findSupportTicketById = async (id: string): Promise<SupportTicket | null> => {
    return handleQuery<SupportTicket>(
        supabase.from('support_tickets').select('*').eq('id', id).single(),
        'find support ticket by ID', id
    );
};

export const findSupportTicketsByUser = async (userId: string): Promise<SupportTicket[] | null> => {
    return handleList<SupportTicket>(
        supabase.from('support_tickets').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
        'find support tickets by user'
    );
};

export const findAllSupportTickets = async (): Promise<SupportTicket[] | null> => {
    return handleList<SupportTicket>(
        supabase.from('support_tickets').select('*').order('created_at', { ascending: false }),
        'find all support tickets'
    );
};

export const updateSupportTicket = async (id: string, updates: Partial<SupportTicket>): Promise<SupportTicket | null> => {
    return handleQuery<SupportTicket>(
        supabase.from('support_tickets').update(updates).eq('id', id).select().single(),
        'update support ticket', id
    );
};

export const countOpenTickets = async (): Promise<number> => {
    return handleCount(
        supabase.from('support_tickets').select('*', { count: 'exact', head: true }).eq('status', 'Open'),
        'count open tickets'
    );
};
