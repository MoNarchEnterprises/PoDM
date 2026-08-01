// /server/services/message.service.ts

import supabase from '../config/supabaseClient';
import { io } from '../config/socket';
import * as ConversationModel from '../models/conversation.model';
import * as MessageModel from '../models/message.model';
import * as SubscriptionModel from '../models/subscription.model';
import * as GalleryModel from '../models/gallery.model';
import { AppError } from '../middleware/error.middleware';
import { requireUser } from '../utils/entityGuards';
import { Message } from '@common/types/Message';
import { Conversation } from '@common/types/Conversation';
import * as UserModel from '../models/user.model';
import { reshapeUserForApp } from '../utils/user.utils';
import { generateSignedUrlsForContent } from '../utils/content.utils';
import * as ContentModel from '../models/content.model';
import { getCryptoWalletForUser } from './wallet.service';

/**
 * Fetches all conversations for a specific user, with role-based sorting.
 * @param userId - The ID of the user.
 * @returns An array of conversation objects.
 */
export const getConversationsForUser = async (userId: string) => {
    const user = await requireUser(userId);

    if (user.role === 'creator') {
        // 1. Fetch all active subscriptions for this creator with fan details
        const { data: subscriptionsData, error: subErr } = await supabase
            .from('subscriptions')
            .select('*, fan:fan_id(*)')
            .eq('creator_id', userId)
            .eq('status', 'active');
        if (subErr) {
            console.error('Error fetching creator subscriptions:', subErr);
        }

        // 2. Fetch all existing conversations for this creator
        const allConversations = await ConversationModel.findConversationsByUserId(userId);
        const userConversations = (allConversations || []).filter((convo: any) =>
            convo.participants && convo.participants.includes(userId)
        );

        // 3. Fetch cleared transactions for this creator to compute fan spend
        const { data: txData, error: txErr } = await supabase
            .from('transactions')
            .select('fan_id, amount')
            .eq('creator_id', userId)
            .eq('status', 'Cleared');
        if (txErr) {
            console.error('Error fetching transactions for spend calculation:', txErr);
        }

        const fanSpendMap = new Map<string, number>();
        (txData || []).forEach((tx: any) => {
            if (tx.fan_id) {
                const current = fanSpendMap.get(tx.fan_id) || 0;
                fanSpendMap.set(tx.fan_id, current + (Number(tx.amount || 0) / 100));
            }
        });

        // 4. Map existing conversations by fan ID
        const convoByFanMap = new Map<string, any>();
        userConversations.forEach((convo: any) => {
            const otherParticipantId = convo.participants.find((pid: string) => pid !== userId);
            if (otherParticipantId) {
                convoByFanMap.set(otherParticipantId, convo);
            }
        });

        // 5. Gather all unique fan/participant IDs (subscribers + existing conversation partners)
        const fanMap = new Map<string, { fanObj?: any; sub?: any; convo?: any }>();

        // Add subscribers
        (subscriptionsData || []).forEach((sub: any) => {
            const fanId = sub.fan_id;
            if (fanId) {
                fanMap.set(fanId, {
                    fanObj: sub.fan,
                    sub: sub,
                    convo: convoByFanMap.get(fanId)
                });
            }
        });

        // Add non-subscriber conversation participants (e.g. past subscribers or support)
        userConversations.forEach((convo: any) => {
            const otherParticipantId = convo.participants.find((pid: string) => pid !== userId);
            if (otherParticipantId && !fanMap.has(otherParticipantId)) {
                fanMap.set(otherParticipantId, {
                    convo: convo
                });
            }
        });

        // 6. Build the response list
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

        const result = await Promise.all(Array.from(fanMap.entries()).map(async ([fanId, entry]) => {
            let fanUser = entry.fanObj;
            if (!fanUser) {
                const rawUser = await UserModel.findUserById(fanId);
                if (rawUser) {
                    fanUser = reshapeUserForApp(rawUser);
                }
            } else if (!fanUser.profile) {
                fanUser = reshapeUserForApp(fanUser);
            }

            const convo = entry.convo;
            const sub = entry.sub;
            const conversationId = convo ? String(convo.id) : null;

            // Determine last message text & read status if conversation exists
            let lastMsgText = 'No messages yet';
            let lastMsgIsRead = true;
            let lastMsgAt = convo?.updated_at || sub?.created_at || new Date().toISOString();

            if (convo) {
                if (convo.last_message) {
                    lastMsgText = convo.last_message.text || 'No messages yet';
                    lastMsgIsRead = convo.last_message.is_read ?? true;
                } else {
                    const recentMsgs = await MessageModel.findMessagesByConversationId(convo.id);
                    if (recentMsgs && recentMsgs.length > 0) {
                        const lastMsg = recentMsgs[recentMsgs.length - 1];
                        lastMsgText = lastMsg.text || ((lastMsg as any).voice_message_url || (lastMsg as any).voiceMessageUrl ? 'Voice message' : 'Content attachment');
                        lastMsgIsRead = lastMsg.is_read;
                        lastMsgAt = lastMsg.created_at || lastMsgAt;
                    }
                }
            }

            const totalSpent = fanSpendMap.get(fanId) || 0;
            const isNewSubscriber = sub ? (new Date(sub.created_at || sub.start_date) > sevenDaysAgo) : false;

            const fanName = fanUser?.profile?.name || fanUser?.username || 'Fan';
            const fanAvatar = fanUser?.profile?.avatar || fanUser?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(fanName)}&background=random`;

            return {
                id: conversationId,
                _id: conversationId,
                fan: {
                    _id: fanId,
                    id: fanId,
                    profile: {
                        name: fanName,
                        avatar: fanAvatar,
                    },
                    totalSpent: totalSpent,
                    isNewSubscriber: isNewSubscriber,
                },
                lastMessage: {
                    text: lastMsgText,
                    isRead: lastMsgIsRead,
                },
                updatedAt: lastMsgAt,
            };
        }));

        // 7. Sort ORDER BY SPEND DESC, then by updatedAt DESC
        return result.sort((a, b) => {
            if (b.fan.totalSpent !== a.fan.totalSpent) {
                return b.fan.totalSpent - a.fan.totalSpent;
            }
            return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        });
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

            // 3. Assemble the final object that the frontend expects (camelCase fields).
            const lastMsg = (convo as any).last_message;
            return {
                id: convo.id,
                _id: convo.id.toString(),
                creator: creator ? reshapeUserForApp(creator) : null,
                lastMessage: lastMsg
                    ? { text: (lastMsg as any)?.text, isRead: (lastMsg as any)?.is_read ?? true }
                    : undefined,
                updatedAt: convo.updated_at || new Date().toISOString(),
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
    if (!messages) return [];

    return Promise.all(messages.map(async (message: any) => {
        let processedContent = null;
        if (message.content?.thumbnailUrl) {
            const tempContent = { files: [{ thumbnailUrl: message.content.thumbnailUrl }] };
            const signedContent = await generateSignedUrlsForContent(tempContent);
            processedContent = { ...message.content, thumbnailUrl: signedContent.files[0].thumbnailUrl };

            // Auto-unlock free content (price = 0)
            if (processedContent.price === 0) {
                processedContent.isUnlocked = true;
            }

            // Check if content is in user's gallery (for fans only)
            if (message.content.contentId && userId === message.receiver_id) {
                // Fetch the fan's gallery (content is a JSON array)
                const { data: galleryData, error } = await supabase
                    .from('galleries')
                    .select('content')
                    .eq('fan_id', userId)
                    .single();

                // Check if the contentId exists in the content array
                let isInGallery = false;
                if (!error && galleryData?.content && Array.isArray(galleryData.content)) {
                    isInGallery = galleryData.content.some((item: any) =>
                        item.contentId === message.content.contentId ||
                        item.contentId === parseInt(message.content.contentId)
                    );
                }

                processedContent.inGallery = isInGallery;
            }
        }

        const finalMessage = {
            id: message.id.toString(),
            conversation_id: message.conversation_id, // Map snake_case to camelCase
            sender_id: message.sender_id,             // Map snake_case to camelCase
            receiver_id: message.receiver_id,           // Map snake_case to camelCase
            text: message.text,
            content: processedContent,
            voiceMessageUrl: message.voice_message_url, // Map snake_case to camelCase
            is_read: message.is_read,
            created_at: message.created_at,
            updated_at: message.updated_at,
        } as Message;

        return finalMessage;
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
    const sender = await requireUser(sender_id);
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

        // Resolve the sender's crypto wallet address for payment
        const walletAddress = await getCryptoWalletForUser(sender_id);
        messageData.content.creatorWalletAddress = walletAddress;

        // Auto-unlock free content (price = 0)
        if (messageData.content.price === 0) {
            messageData.content.isUnlocked = true;
        }
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
    const sender = await requireUser(creatorId);
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
    const sender = await requireUser(sender_id);
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
        voiceMessageUrl: (newMessage as any).voice_message_url, // Map from database snake_case to frontend camelCase
        is_read: newMessage.is_read,
        created_at: new Date(newMessage.created_at).toISOString(),
        updated_at: new Date(newMessage.created_at).toISOString(),
    };

    io.to(roomName).emit('new_message', messageForFrontend);
    console.log(`[MessageService] Broadcasted voice message to room: ${roomName}`);

    return messageForFrontend;
};

/**
 * Unlocks PPV content in a message, persisting isUnlocked: true to DB.
 * @param messageId - The ID of the message to unlock.
 * @param userId - The ID of the requesting user.
 */
export const unlockMessageContent = async (messageId: string, userId: string) => {
    const message = await MessageModel.findMessageById(messageId);
    if (!message) {
        throw new AppError('Message not found.', 404);
    }

    if (message.sender_id !== userId && message.receiver_id !== userId) {
        throw new AppError('You are not authorized to unlock content in this message.', 403);
    }

    const updatedMessage = await MessageModel.unlockContentInMessage(messageId);
    if (!updatedMessage) {
        throw new AppError('Failed to unlock content in message.', 500);
    }

    let processedContent = updatedMessage.content;
    if (updatedMessage.content?.thumbnailUrl) {
        const tempContentWrapper = { files: [{ thumbnailUrl: updatedMessage.content.thumbnailUrl }] };
        const signedContentWrapper = await generateSignedUrlsForContent(tempContentWrapper);
        processedContent = { ...updatedMessage.content, thumbnailUrl: signedContentWrapper.files[0].thumbnailUrl };
    }

    const finalMessage = {
        id: updatedMessage.id.toString(),
        conversation_id: updatedMessage.conversation_id,
        sender_id: updatedMessage.sender_id,
        receiver_id: updatedMessage.receiver_id,
        text: updatedMessage.text,
        content: processedContent,
        voiceMessageUrl: updatedMessage.voice_message_url,
        is_read: updatedMessage.is_read,
        created_at: updatedMessage.created_at,
        updated_at: updatedMessage.updated_at,
    };

    const roomName = `conversation:${updatedMessage.conversation_id}`;
    io.to(roomName).emit('message_updated', finalMessage);

    return finalMessage;
};

/**
 * Retrieves unlisted vault content for a creator that has not been saved in the target fan's gallery.
 * @param creatorId - The ID of the creator attaching content.
 * @param fanId - The ID of the recipient fan.
 * @returns Array of attachable vault content items with signed thumbnail URLs.
 */
export const getAttachableVaultContent = async (creatorId: string, fanId: string) => {
    await requireUser(creatorId);
    await requireUser(fanId);

    // Verify relationship: either an existing conversation or an active subscription
    const conversation = await ConversationModel.findConversationByParticipants(creatorId, fanId);
    const subscription = await SubscriptionModel.findSubscriptionByFanAndCreator(fanId, creatorId);
    if (!conversation && !subscription) {
        throw new AppError('User is not a subscriber or conversation participant.', 403);
    }

    // 1. Fetch creator content
    const allContent = await ContentModel.findContentByCreatorId(creatorId);
    if (!allContent || allContent.length === 0) {
        return [];
    }

    // 2. Filter to unlisted vault items only
    const vaultItems = allContent.filter((item: any) => item.visibility === 'unlisted');
    if (vaultItems.length === 0) {
        return [];
    }

    // 3. Fetch fan's gallery items
    const gallery = await GalleryModel.findGalleryByFanId(fanId);
    const savedContentIds = new Set<string>();
    if (gallery?.content && Array.isArray(gallery.content)) {
        gallery.content.forEach((item: any) => {
            if (item.contentId) savedContentIds.add(String(item.contentId));
        });
    }

    // 4. Exclude items already in fan's gallery
    const attachableItems = vaultItems.filter((item: any) => !savedContentIds.has(String(item.id)));

    // 5. Sign thumbnail URLs
    const signedItems = await Promise.all(
        attachableItems.map((item: any) => generateSignedUrlsForContent(item))
    );

    return signedItems;
};