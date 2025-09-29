import supabase from '../config/supabaseClient';
import * as ConversationModel from '../models/conversation.model';
import * as MessageModel from '../models/message.model';
import * as SubscriptionModel from '../models/subscription.model';
import { AppError } from '../middleware/error.middleware';
import { Message } from '@common/types/Message';
import { Conversation } from '@common/types/Conversation';
import * as UserModel from '../models/user.model';
import { reshapeUserForApp } from '../utils/user.utils';
import { generateSignedUrlsForContent } from '../utils/content.utils';


/**
 * Fetches all conversations for a specific user, with role-based sorting.
 * @param userId - The ID of the user.
 * @returns An array of conversation objects.
 */
export const getConversationsForUser = async (userId: string) => {
    const user = await UserModel.findUserById(userId);
    if (!user) throw new AppError('User not found.', 404);

    if (user.role === 'creator') {
        // Use the new, more comprehensive SQL function for creators.
        const { data, error } = await supabase.rpc('get_creator_subscribers_for_messaging', { creator_uuid: userId });
        if (error) {
            console.error('Error fetching sorted creator conversations:', error);
            throw new AppError('Could not retrieve creator conversations.', 500);
        }
        // Reshape the data to match the frontend's expected structure
        return data.map((convo: any) => ({
            _id: convo.conversation_id,
            fan: {
                _id: convo.fan_id,
                profile: {
                    name: convo.fan_username,
                    avatar: convo.fan_avatar_url || 'https://placehold.co/150x150/7E22CE/FFFFFF?text=U'
                },
                totalSpent: convo.total_spent,
                isNewSubscriber: convo.is_new_subscriber,
            },
            lastMessage: {
                text: convo.last_message_text,
                isRead: convo.is_read,
            },
            updatedAt: convo.last_message_at,
        }));
    } else {
        // Standard logic for fans
        const conversations = await ConversationModel.findConversationsByUserId(userId);
        if (!conversations) return [];

        // 2. Iterate through each conversation to find the other participant and fetch their profile.
        return Promise.all(conversations.map(async (convo) => {
             // Find the ID of the other user in the chat.
             const otherParticipantId = convo.participants.find((p_id: String) => p_id !== userId);
             // Fetch that user's profile.
             const creator = otherParticipantId ? await UserModel.findUserById(otherParticipantId) : null;
             
             // 3. Assemble the final object that the frontend expects.
             return {
                 ...convo,
                 _id: convo.id,
                 creator: creator ? reshapeUserForApp(creator) : null,
             };
        }));
    }
};

/**
 * Fetches all messages for a specific conversation, ensuring the user is a participant.
 * @param conversationId - The ID of the conversation.
 * @param userId - The ID of the user requesting the messages.
 * @returns An array of message objects with signed URLs for content.
 */
export const getMessagesForConversation = async (conversationId: string, userId: string) => {
    const conversation = await ConversationModel.findConversationById(conversationId);
    if (!conversation || !conversation.participants.includes(userId)) {
        throw new AppError('You are not authorized to view this conversation.', 403);
    }
    
    const messages = await MessageModel.findMessagesByConversationId(conversationId);
    if (!messages) return [];

    return Promise.all(messages.map(async (message) => {
        let processedContent = null;
        if (message.content?.thumbnailUrl) {
            const tempContent = { files: [{ thumbnailUrl: message.content.thumbnailUrl }] };
            const signedContent = await generateSignedUrlsForContent(tempContent);
            processedContent = { ...message.content, thumbnailUrl: signedContent.files[0].thumbnailUrl };
        }
        return { ...message, _id: message.id.toString(), content: processedContent };
    }));
};

/**
 * Handles the business logic for sending a direct message.
 * @param senderId - The ID of the user sending the message.
 * @param receiverId - The ID of the user receiving the message.
 * @param messageData - The content of the message (text or paid content).
 * @returns The newly created message object.
 */
export const sendDirectMessage = async (senderId: string, receiverId: string, messageData: Partial<Message>) => {
    const sender = await UserModel.findUserById(senderId);
    if (!sender) throw new AppError('Sender not found.', 404);
    if (sender.role === 'creator' && sender.status !== 'active') {
        throw new AppError('Your account must be verified to send messages.', 403);
    }

    let conversation = await ConversationModel.findConversationByParticipants(senderId, receiverId);
    if (!conversation) {
        conversation = await ConversationModel.createConversation([senderId, receiverId]);
    }
    if (!conversation) {
        throw new AppError('Could not find or create a conversation.', 500);
    }

    const newMessageData = {
        ...messageData,
        sender_id: senderId,
        receiver_id: receiverId,
        conversation_id: conversation.id,
        is_read: false,
    };
    
    const newMessage = await MessageModel.createMessage(newMessageData);
    if (!newMessage) throw new AppError('Failed to send message.', 500);

    return { ...newMessage, _id: newMessage.id.toString() };
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
    // Step 1: Get all active subscribers for the creator.
    const subscriptions = await SubscriptionModel.findSubscriptionsByCreator(creatorId);
    if (!subscriptions || subscriptions.length === 0) {
        throw new AppError('You have no active subscribers to message.', 404);
    }

    const fanIds = subscriptions.map(sub => sub.fanId);

    // NOTE: This is a long-running operation. In a production application,
    // this should be offloaded to a background job queue (e.g., BullMQ, RabbitMQ)
    // to avoid blocking the server and timing out the request.

    // Step 2: Loop through each subscriber and send them a message.
    for (const fanId of fanIds) {
        try {
            await sendDirectMessage(creatorId, fanId, messageData);
        } catch (error) {
            // Log the error but continue trying to message other fans.
            console.error(`Failed to send mass message to fan ${fanId}:`, error);
        }
    }

    return { success: true, message: `Mass message sent to ${fanIds.length} subscribers.` };
};
