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
            last_message_id: newMessage.id,
            updated_at: new Date().toISOString() // Also bump the updated_at timestamp
        })
        .eq('id', newMessage.conversation_id);

    if (conversationError) {
        // In a real app, you might want to roll back the message creation here.
        console.error('Error updating conversation:', conversationError.message);
    }

    return newMessage as Message;
};

/**
 * Finds a single message by its unique ID.
 * @param id - The ID of the message.
 * @returns The message object or null if not found.
 */
export const findMessageById = async (id: string): Promise<any | null> => {
    const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('id', id)
        .single();
    if (error) {
        console.error('Error finding message by ID:', error.message);
        return null;
    }
    return data;
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

/**
 * Updates a message's content field to mark it as unlocked.
 * @param messageId - The ID of the message to update.
 */
export const unlockContentInMessage = async (messageId: string): Promise<void> => {
    const message = await findMessageById(messageId);
    if (!message || !message.content) return;

    const updatedContent = {
        ...message.content,
        isUnlocked: true,
        unlockDate: new Date().toISOString(),
    };

    const { error } = await supabase
        .from('messages')
        .update({ content: updatedContent })
        .eq('id', messageId);

    if (error) {
        console.error(`Error unlocking content for message ${messageId}:`, error.message);
    }
};
