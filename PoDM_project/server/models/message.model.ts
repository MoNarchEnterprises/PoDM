import supabase from '../config/supabaseClient';
import { Message } from '@common/types/Message';
import { handleQuery, handleList } from '../utils/database';

export const createMessage = async (messageData: Partial<Message>): Promise<Message | null> => {
    const newMessage = await handleQuery<Message>(
        supabase.from('messages').insert([messageData]).select().single(),
        'create message'
    );
    if (!newMessage) return null;

    const { error: conversationError } = await supabase
        .from('conversations')
        .update({
            last_message_id: newMessage.id,
            updated_at: new Date().toISOString()
        })
        .eq('id', newMessage.conversation_id);

    if (conversationError) {
        console.error('Error updating conversation:', conversationError.message);
    }

    return newMessage as Message;
};

export const markMessagesAsRead = async (conversationId: string, receiverId: string): Promise<Message[] | null> => {
    return handleList<Message>(
        supabase.from('messages').update({ is_read: true }).eq('conversation_id', conversationId).eq('receiver_id', receiverId).eq('is_read', false).select(),
        'mark messages as read'
    );
};

export const deleteMessageById = async (id: string): Promise<Message | null> => {
    const numericId = parseInt(id, 10);
    if (isNaN(numericId)) return null;

    return handleQuery<Message>(
        supabase.from('messages').delete().eq('id', numericId).select().single(),
        'delete message by ID', numericId
    );
};

export const findMessageById = async (id: string): Promise<any | null> => {
    const numericId = parseInt(id, 10);
    if (isNaN(numericId)) {
        console.error(`[Model] Invalid non-numeric ID passed to findMessageById: "${id}"`);
        return null;
    }
    return handleQuery<any>(
        supabase.from('messages').select('*').eq('id', numericId).single(),
        'find message by ID', numericId
    );
};

export const findMessagesByConversationId = async (conversationId: string): Promise<Message[] | null> => {
    return handleList<Message>(
        supabase.from('messages').select('*').eq('conversation_id', conversationId).order('created_at', { ascending: true }),
        'find messages by conversation ID'
    );
};

export const unlockContentInMessage = async (messageId: string): Promise<any | null> => {
    const numericId = parseInt(messageId, 10);
    if (isNaN(numericId)) {
        console.error(`[Model] Invalid non-numeric ID passed to unlockContentInMessage: "${messageId}"`);
        return null;
    }

    const message = await findMessageById(messageId);
    if (!message || !message.content) return null;

    const updatedContent = { ...message.content, isUnlocked: true, unlockDate: new Date().toISOString() };
    return handleQuery<any>(
        supabase.from('messages').update({ content: updatedContent }).eq('id', numericId).select().single(),
        'unlock content in message', numericId
    );
};
