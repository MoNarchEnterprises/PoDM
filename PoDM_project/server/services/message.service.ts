// /server/services/message.service.ts

import supabase from '../config/supabaseClient';
import { io } from '../config/socket';
import * as ConversationModel from '../models/conversation.model';
import * as MessageModel from '../models/message.model';
import * as SubscriptionModel from '../models/subscription.model';
import { AppError } from '../middleware/error.middleware';
import { Message } from '@common/types/Message';
import { Conversation } from '@common/types/Conversation';
import * as UserModel from '../models/user.model';
import { reshapeUserForApp } from '../utils/user.utils';
import { generateSignedUrlsForContent } from '../utils/content.utils';
import * as ContentModel from '../models/content.model';

/**
 * Fetches all conversations for a specific user, with role-based sorting.
 * @param userId - The ID of the user.
 * @returns An array of conversation objects.
 */
export const getConversationsForUser = async (userId: string) => {
    const user = await UserModel.findUserById(userId);
    if (!user) throw new AppError('User not found.', 404);

    if (user.role === 'creator') {
        // Fetch ALL conversations for this user (including admin support conversations)
        const allConversations = await ConversationModel.findConversationsByUserId(userId);

        // CRITICAL: Filter to only include conversations where the user is actually a participant
        const userConversations = (allConversations || []).filter((convo: any) =>
            convo.participants && convo.participants.includes(userId)
        );

        // Use the RPC for subscriber enrichment data
        const { data: subscriberData, error } = await supabase.rpc('get_creator_subscribers_for_messaging', { creator_uuid: userId });
        if (error) {
            console.error('Error fetching sorted creator conversations:', error);
        }

        // Create a map of subscriber conversation data (using string keys)
        const subscriberConvoMap = new Map((subscriberData || []).map((convo: any) => [String(convo.conversation_id), convo]));

        // Process ONLY the filtered conversations
        const result = await Promise.all(userConversations.map(async (convo: any) => {
            const conversationId = String(convo.id);
            const otherParticipantId = convo.participants.find((pid: string) => pid !== userId);
            const otherUser = otherParticipantId ? await UserModel.findUserById(otherParticipantId) : null;
            const shapedUser = otherUser ? reshapeUserForApp(otherUser) : null;

            // Check if we have subscriber data for this conversation
            const subData = subscriberConvoMap.get(conversationId) as any;

            return {
                id: conversationId,
                _id: conversationId,
                fan: {
                    _id: otherParticipantId,
                    id: otherParticipantId,
                    profile: {
                        name: subData?.fan_username || shapedUser?.profile?.name || 'Support',
                        avatar: subData?.fan_avatar_url || shapedUser?.profile?.avatar || 'https://placehold.co/150x150/7E22CE/FFFFFF?text=S'
                    },
                    totalSpent: subData?.total_spent || 0,
                    isNewSubscriber: subData?.is_new_subscriber || false,
                },
                lastMessage: {
                    text: subData?.last_message_text || 'No messages yet',
                    isRead: subData?.is_read ?? true,
                },
                updatedAt: convo.updated_at || new Date().toISOString(),
            };
        }));

        // Sort by most recent
        return result.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    } else {
        // Standard logic for fans
        const conversations = await ConversationModel.findConversationsByUserId(userId);
        if (!conversations) return [];

        // 2. Iterate through each conversation to find the other participant and fetch their profile.
        return Promise.all(conversations.map(async (convo) => {
            // Find the ID of the other user in the chat.
            const otherParticipantId = convo.participants.find((pid: String) => pid !== userId);
            // Fetch that user's profile.
            const creator = otherParticipantId ? await UserModel.findUserById(otherParticipantId) : null;

            // 3. Assemble the final object that the frontend expects.
            return {
                ...convo,
                id: convo.id,
                _id: convo.id.toString(), // FIX: Add _id for frontend compatibility
                creator: creator ? reshapeUserForApp(creator) : null,
            };
        }));
    }
};

/**
 * Fetches all messages for a specific conversation, ensuring the user is a participant.
 * @param conversation_id - The ID of the conversation.
 * @param userId - The ID of the user requesting the messages.
 * @returns An array of message objects with signed URLs for content.
 */
export const getMessagesForConversation = async (conversation_id: string, userId: string) => {
    const conversation = await ConversationModel.findConversationById(conversation_id);
    if (!conversation || !conversation.participants.includes(userId)) {
        throw new AppError('You are not authorized to view this conversation.', 403);
    }

    const messages = await MessageModel.findMessagesByConversationId(conversation_id);
    console.log('[MessageService] Found messages:', messages);
    if (!messages) return [];

    return Promise.all(messages.map(async (message: any) => {
        let processedContent = null;
        if (message.content?.thumbnailUrl) {
            const tempContent = { files: [{ thumbnailUrl: message.content.thumbnailUrl }] };
            const signedContent = await generateSignedUrlsForContent(tempContent);
            processedContent = { ...message.content, thumbnailUrl: signedContent.files[0].thumbnailUrl };
        }

        return {
            id: message.id.toString(),
            conversation_id: message.conversation_id, // Map snake_case to camelCase
            sender_id: message.sender_id,             // Map snake_case to camelCase
            receiver_id: message.receiver_id,           // Map snake_case to camelCase
            text: message.text,
            content: processedContent,
            is_read: message.is_read,
            created_at: message.created_at,
            updated_at: message.updated_at,
        } as Message;
    }));
};

/**
 * Handles the business logic for sending a direct message.
 * @param sender_id - The ID of the user sending the message.
 * @param receiver_id - The ID of the user receiving the message.
 * @param messageData - The content of the message (text or paid content).
 * @returns The newly created message object.
 */
export const sendDirectMessage = async (sender_id: string, receiver_id: string, messageData: Partial<Message>) => {
    const sender = await UserModel.findUserById(sender_id);
    if (!sender) throw new AppError('Sender not found.', 404);
    if (sender.role === 'creator' && sender.status !== 'active') {
        throw new AppError('Your account must be verified to send messages.', 403);
    }

    let conversation = await ConversationModel.findConversationByParticipants(sender_id, receiver_id);
    if (!conversation) {
        conversation = await ConversationModel.createConversation([sender_id, receiver_id]);
    }
    if (!conversation) {
        throw new AppError('Could not find or create a conversation.', 500);
    }

    if (messageData.content && messageData.content.contentId) {
        const originalContent = await ContentModel.findContentById(messageData.content.contentId);
        if (!originalContent || !originalContent.files || originalContent.files.length === 0) {
            throw new AppError('Attached content could not be found.', 404);
        }
        messageData.content.thumbnailUrl = originalContent.files[0].thumbnailUrl;
    }

    const newMessageData = {
        ...messageData,
        sender_id: sender_id,
        receiver_id: receiver_id,
        conversation_id: conversation.id,
        is_read: false,
    };

    const newMessage = await MessageModel.createMessage(newMessageData);
    if (!newMessage) throw new AppError('Failed to send message.', 500);

    // --- THIS IS THE FIX ---
    // Process the new message to get signed URLs before broadcasting it.
    let processedContent = newMessage.content;
    if (newMessage.content?.thumbnailUrl) {
        // We create a temporary object that matches the structure expected by the utility.
        const tempContentWrapper = { files: [{ thumbnailUrl: newMessage.content.thumbnailUrl }] };
        const signedContentWrapper = await generateSignedUrlsForContent(tempContentWrapper);
        // We then put the signed URL back into our content payload.
        processedContent = { ...newMessage.content, thumbnailUrl: signedContentWrapper.files[0].thumbnailUrl };
    }
    // --- END OF FIX ---

    const roomName = `conversation:${conversation.id}`;
    const messageForFrontend = {
        id: newMessage.id.toString(),
        conversation_id: newMessage.conversation_id,
        sender_id: newMessage.sender_id,
        receiver_id: newMessage.receiver_id,
        text: newMessage.text,
        content: processedContent, // Use the processed content with the signed URL
        is_read: newMessage.is_read,
        created_at: new Date(newMessage.created_at).toISOString(),
        updated_at: new Date(newMessage.created_at).toISOString(),
    };

    io.to(roomName).emit('new_message', messageForFrontend);
    console.log(`[MessageService] Broadcasted to room: ${roomName}`);

    // Check if this message should append to a detailed support ticket
    // Only sync if the message is TO an admin (user replying to support)
    // Using require() to avoid module resolution issues in production build
    try {
        const receiver = await UserModel.findUserById(receiver_id);
        if (receiver && receiver.role === 'admin') {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const supportService = require('./support.service');
            const senderName = sender.profile?.name || (sender as any).name || 'User';
            await supportService.appendUserMessageToActiveTicket(sender_id, newMessage.text, senderName);
            console.log('[MessageService] Synced message to support ticket');
        }
    } catch (err) {
        console.error('Error handling support ticket sync:', err);
    }

    return messageForFrontend;
};

/**
 * Deletes a message, ensuring the user is the original sender.
 * @param messageId - The ID of the message to delete.
 * @param userId - The ID of the user requesting the deletion.
 */
export const deleteMessage = async (messageId: string, userId: string) => {
    // 1. Find the message to get its details (sender_id, conversation_id)
    const message = await MessageModel.findMessageById(messageId);
    if (!message) {
        throw new AppError('Message not found.', 404);
    }

    // 2. CRITICAL: Security check to ensure the user owns the message
    if (message.sender_id !== userId) {
        throw new AppError('You are not authorized to delete this message.', 403);
    }

    // 3. Delete the message from the database
    const deletedMessage = await MessageModel.deleteMessageById(messageId);
    if (!deletedMessage) {
        throw new AppError('Failed to delete message.', 500);
    }

    // 4. Broadcast the deletion event to all clients in the conversation room
    const roomName = `conversation:${message.conversation_id}`;
    io.to(roomName).emit('message_deleted', { messageId });
    console.log(`[MessageService] Broadcasted message deletion for ID ${messageId} to room: ${roomName}`);

    return { success: true, message: 'Message deleted successfully.' };
};

/**
 * Marks messages in a conversation as read and notifies the client via socket.
 * @param conversation_id - The ID of the conversation.
 * @param userId - The ID of the user who is reading the messages.
 */
export const markConversationAsRead = async (conversation_id: string, userId: string) => {
    const updatedMessages = await MessageModel.markMessagesAsRead(conversation_id, userId);

    if (updatedMessages && updatedMessages.length > 0) {
        // Find the user's socket to emit the event directly to them
        // This prevents notifying the other user unnecessarily
        const sockets = await io.fetchSockets();
        const userSocket = sockets.find(s => (s as any).data.userId === userId);

        if (userSocket) {
            userSocket.emit('conversation_read', { conversation_id });
            console.log(`[MessageService] Emitted conversation_read for convo ${conversation_id} to user ${userId}`);
        }
    }

    return { success: true, message: `${updatedMessages?.length || 0} messages marked as read.` };
};

/**
 * Handles the business logic for a creator sending a mass message to all subscribers.
 * @param creatorId - The ID of the creator sending the message.
 * @param messageData - The content of the message.
 */
export const sendMassMessageToSubscribers = async (creatorId: string, messageData: Partial<Message>) => {
    const sender = await UserModel.findUserById(creatorId);
    if (!sender) {
        throw new AppError('Sender not found.', 404);
    }
    if (sender.role === 'creator' && sender.status !== 'active') {
        throw new AppError('Your account must be verified to send messages.', 403);
    }
    const subscriptions = await SubscriptionModel.findSubscriptionsByCreator(creatorId);
    if (!subscriptions || subscriptions.length === 0) {
        throw new AppError('You have no active subscribers to message.', 404);
    }

    const fanIds = subscriptions.map(sub => sub.fan_id);

    for (const fan_id of fanIds) {
        try {
            await sendDirectMessage(creatorId, fan_id, messageData);
        } catch (error) {
            console.error(`Failed to send mass message to fan ${fan_id}:`, error);
        }
    }

    return { success: true, message: `Mass message sent to ${fanIds.length} subscribers.` };
};

/**
 * Handles the business logic for sending a voice message.
 * @param sender_id - The ID of the user sending the voice message.
 * @param receiver_id - The ID of the user receiving the voice message.
 * @param voiceFile - The uploaded voice message file.
 * @returns The newly created message object with voice message URL.
 */
export const sendVoiceMessage = async (sender_id: string, receiver_id: string, voiceFile: Express.Multer.File) => {
    const sender = await UserModel.findUserById(sender_id);
    if (!sender) throw new AppError('Sender not found.', 404);
    if (sender.role === 'creator' && sender.status !== 'active') {
        throw new AppError('Your account must be verified to send messages.', 403);
    }

    // Find or create conversation
    let conversation = await ConversationModel.findConversationByParticipants(sender_id, receiver_id);
    if (!conversation) {
        conversation = await ConversationModel.createConversation([sender_id, receiver_id]);
    }
    if (!conversation) {
        throw new AppError('Could not find or create a conversation.', 500);
    }

    // Upload voice message to R2 private storage
    const timestamp = Date.now();
    const fileName = `voice-${timestamp}.webm`;
    const filePath = `voice-messages/${sender_id}/${fileName}`;

    // Import storage service
    const storageService = require('./storage.service');
    const { path: uploadedPath, error: uploadError } = await storageService.uploadToPrivate(
        filePath,
        voiceFile.buffer,
        voiceFile.mimetype || 'audio/webm'
    );

    if (uploadError || !uploadedPath) {
        throw new AppError('Failed to upload voice message.', 500);
    }

    // Generate signed URL for the voice message (valid for 7 days)
    const { signedUrl, error: signError } = await storageService.getPrivateSignedUrl(uploadedPath, 60 * 60 * 24 * 7);

    if (signError || !signedUrl) {
        throw new AppError('Failed to generate voice message URL.', 500);
    }

    // Create message with voice message URL
    const newMessageData = {
        sender_id: sender_id,
        receiver_id: receiver_id,
        conversation_id: conversation.id,
        voice_message_url: signedUrl,
        is_read: false,
    };

    const newMessage = await MessageModel.createMessage(newMessageData);
    if (!newMessage) throw new AppError('Failed to send voice message.', 500);

    // Broadcast to Socket.IO room
    const roomName = `conversation:${conversation.id}`;
    const messageForFrontend = {
        id: newMessage.id.toString(),
        conversation_id: newMessage.conversation_id,
        sender_id: newMessage.sender_id,
        receiver_id: newMessage.receiver_id,
        voiceMessageUrl: signedUrl,
        is_read: newMessage.is_read,
        created_at: new Date(newMessage.created_at).toISOString(),
        updated_at: new Date(newMessage.created_at).toISOString(),
    };

    io.to(roomName).emit('new_message', messageForFrontend);
    console.log(`[MessageService] Broadcasted voice message to room: ${roomName}`);

    return messageForFrontend;
};