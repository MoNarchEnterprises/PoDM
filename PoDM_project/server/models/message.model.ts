import supabase from '../config/supabaseClient';
import { Message } from '@common/types/Message';
import { Conversation } from '@common/types/Conversation';

/**
 * Creates a new message and updates the parent conversation's last message details.
 * This should ideally be handled within a database transaction or RPC function.
 * @param messageData - The data for the new message.
 * @returns The newly created message object.
 */
export const createMessage = async (messageData: Partial<Message>): Promise<Message | null> => {
    // Step 1: Insert the new message
    const { data: newMessage, error: messageError } = await supabase
        .from('messages')
        .insert([messageData])
        .select()
        .single();

    if (messageError) {
        console.error('Error creating message:', messageError.message);
        return null;
    }

    // Step 2: Update the parent conversation
    const { error: conversationError } = await supabase
        .from('conversations')
        .update({ 
            last_message_text: newMessage.text,
            last_message_at: newMessage.created_at 
        })
        .eq('id', newMessage.conversation_id);

    if (conversationError) {
        // In a real app, you might want to roll back the message creation here.
        console.error('Error updating conversation:', conversationError.message);
    }

    return newMessage as Message;
};

/**
 * Finds all messages within a specific conversation.
 * @param conversationId - The ID of the conversation.
 * @returns An array of message objects, ordered by creation date.
 */
export const findMessagesByConversationId = async (conversationId: string): Promise<Message[] | null> => {
    const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

    if (error) {
        console.error('Error finding messages by conversation ID:', error.message);
        return null;
    }
    return data as Message[];
};
