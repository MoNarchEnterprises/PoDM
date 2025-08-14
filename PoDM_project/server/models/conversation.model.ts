import supabase from '../config/supabaseClient';
import { Conversation } from '@common/types/Conversation';

/**
 * Finds a conversation by its unique ID.
 * @param id - The ID of the conversation to find.
 * @returns The conversation object or null if not found.
 */
export const findConversationById = async (id: string): Promise<Conversation | null> => {
    const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        console.error('Error finding conversation by ID:', error.message);
        return null;
    }
    return data as Conversation;
};

/**
 * Finds all conversations that a specific user is a part of.
 * @param userId - The UUID of the user.
 * @returns An array of conversation objects.
 */
export const findConversationsByUserId = async (userId: string): Promise<Conversation[] | null> => {
    const { data, error } = await supabase
        .from('conversations')
        .select('*, participants:profiles(*)') // Fetches profile data for participants
        .contains('participants', [userId])
        .order('last_message_at', { ascending: false });

    if (error) {
        console.error('Error finding conversations by user ID:', error.message);
        return null;
    }
    return data as Conversation[];
};

/**
 * Finds an existing conversation between two specific users.
 * @param userId1 - The UUID of the first user.
 * @param userId2 - The UUID of the second user.
 * @returns The conversation object or null if not found.
 */
export const findConversationByParticipants = async (userId1: string, userId2: string): Promise<Conversation | null> => {
    const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .contains('participants', [userId1, userId2])
        .single();
    
    if (error) {
        // An error is expected if no conversation is found, so we don't log it unless it's a real issue.
        if (error.code !== 'PGRST116') { // PGRST116 = "The result contains 0 rows"
             console.error('Error finding conversation by participants:', error.message);
        }
        return null;
    }
    return data as Conversation;
};


/**
 * Creates a new conversation between two or more users.
 * @param participantIds - An array of user UUIDs to include in the conversation.
 * @returns The newly created conversation object.
 */
export const createConversation = async (participantIds: string[]): Promise<Conversation | null> => {
    const { data, error } = await supabase
        .from('conversations')
        .insert([{ participants: participantIds }])
        .select()
        .single();

    if (error) {
        console.error('Error creating conversation:', error.message);
        return null;
    }
    return data as Conversation;
};
