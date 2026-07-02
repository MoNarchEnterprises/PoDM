import supabase from '../config/supabaseClient';
import { Conversation } from '@common/types/Conversation';
import { handleQuery, handleList } from '../utils/database';

export const findConversationById = async (id: string): Promise<Conversation | null> => {
    const numericId = parseInt(id, 10);
    if (isNaN(numericId)) {
        console.error(`[Model] Invalid non-numeric ID passed to findConversationById: "${id}"`);
        return null;
    }

    return handleQuery<Conversation>(
        supabase.from('conversations').select('*').eq('id', numericId).single(),
        'find conversation by ID', numericId
    );
};

export const findConversationsByUserId = async (userId: string): Promise<Conversation[] | null> => {
    return handleList<Conversation>(
        supabase.from('conversations').select('*').contains('participants', [userId]).order('updated_at', { ascending: false }),
        'find conversations by user ID'
    );
};

export const findConversationByParticipants = async (userId1: string, userId2: string): Promise<Conversation | null> => {
    return handleQuery<Conversation>(
        supabase.from('conversations').select('*').contains('participants', [userId1, userId2]).single(),
        'find conversation by participants'
    );
};

export const createConversation = async (participantIds: string[]): Promise<Conversation | null> => {
    return handleQuery<Conversation>(
        supabase.from('conversations').insert([{ participants: participantIds }]).select().single(),
        'create conversation'
    );
};
