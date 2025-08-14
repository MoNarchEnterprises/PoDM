import * as ConversationModel from '../models/conversation.model';
import * as MessageModel from '../models/message.model';
import * as SubscriptionModel from '../models/subscription.model';
import { AppError } from '../middleware/error.middleware';
import { Message } from '@common/types/Message';

/**
 * Handles the business logic for sending a direct message.
 * It finds or creates a conversation between the sender and receiver,
 * then creates the message within that conversation.
 * @param senderId - The ID of the user sending the message.
 * @param receiverId - The ID of the user receiving the message.
 * @param messageData - The content of the message (text or paid content).
 * @returns The newly created message object.
 */
export const sendDirectMessage = async (senderId: string, receiverId: string, messageData: Partial<Message>) => {
    // Step 1: Find if a conversation already exists between the two users.
    let conversation = await ConversationModel.findConversationByParticipants(senderId, receiverId);

    // Step 2: If no conversation exists, create one.
    if (!conversation) {
        conversation = await ConversationModel.createConversation([senderId, receiverId]);
    }

    if (!conversation) {
        throw new AppError('Could not find or create a conversation.', 500);
    }

    // Step 3: Create the new message within the conversation.
    const newMessageData: Partial<Message> = {
        ...messageData,
        senderId,
        receiverId,
        conversationId: conversation._id,
    };

    const newMessage = await MessageModel.createMessage(newMessageData);

    if (!newMessage) {
        throw new AppError('Failed to send message.', 500);
    }

    return newMessage;
};

/**
 * Handles the business logic for a creator sending a mass message to all subscribers.
 * @param creatorId - The ID of the creator sending the message.
 * @param messageData - The content of the message.
 */
export const sendMassMessageToSubscribers = async (creatorId: string, messageData: Partial<Message>) => {
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
