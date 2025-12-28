import { Request, Response, NextFunction } from 'express';
import * as MessageService from '../services/message.service';
import { AppError } from '../middleware/error.middleware';

/**
 * @desc    Get all conversations for the currently logged-in user
 * @route   GET /api/v1/messages
 * @access  Private
 */
export const getConversations = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            throw new AppError('Authentication error, user ID not found.', 401);
        }

        const conversations = await MessageService.getConversationsForUser(userId);
        res.status(200).json({ success: true, data: conversations });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get all messages for a specific conversation
 * @route   GET /api/v1/messages/:conversation_id
 * @access  Private (User must be a participant)
 */
export const getMessagesInConversation = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?.id;
        const { conversationId } = req.params;  // Fix: Match route param name

        if (!userId) {
            throw new AppError('Authentication error, user ID not found.', 401);
        }

        const messages = await MessageService.getMessagesForConversation(conversationId, userId);
        res.status(200).json({ success: true, data: messages });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Send a new message
 * @route   POST /api/v1/messages
 * @access  Private
 */
export const sendMessage = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const sender_id = req.user?.id;
        // Accept both camelCase (from frontend) and snake_case
        const receiver_id = req.body.receiverId || req.body.receiver_id;
        const { text, content } = req.body;

        if (!sender_id) {
            throw new AppError('Authentication error, user ID not found.', 401);
        }
        if (!receiver_id || (!text && !content)) {
            throw new AppError('Receiver ID and message content are required.', 400);
        }

        const newMessage = await MessageService.sendDirectMessage(sender_id, receiver_id, { text, content });
        res.status(201).json({ success: true, data: newMessage });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Mark all messages in a conversation as read for the current user
 * @route   PUT /api/v1/messages/conversations/:id/read
 * @access  Private
 */
export const markConversationAsRead = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?.id;
        const { conversationId } = req.params;  // Fix: Match route param name

        if (!userId) {
            throw new AppError('Authentication error, user ID not found.', 401);
        }

        const result = await MessageService.markConversationAsRead(conversationId, userId);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Delete a message
 * @route   DELETE /api/v1/messages/:id
 * @access  Private (Owner only)
 */
export const deleteMessage = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?.id;
        const { id: messageId } = req.params;

        if (!userId) {
            throw new AppError('Authentication error, user ID not found.', 401);
        }

        const result = await MessageService.deleteMessage(messageId, userId);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Send a message to all of a creator's subscribers
 * @route   POST /api/v1/messages/mass-message
 * @access  Private (Creators only)
 */
export const sendMassMessage = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const creatorId = req.user?.id;
        const { text, content } = req.body;

        if (!creatorId) {
            throw new AppError('Authentication error, user ID not found.', 401);
        }
        if (!text && !content) {
            throw new AppError('Message content is required.', 400);
        }

        const result = await MessageService.sendMassMessageToSubscribers(creatorId, { text, content });
        res.status(200).json({ success: true, data: result });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Send a voice message
 * @route   POST /api/v1/messages/voice
 * @access  Private (Creators only)
 */
export const sendVoiceMessage = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const sender_id = req.user?.id;
        const receiver_id = req.body.receiverId || req.body.receiver_id;
        const voiceFile = req.file;

        if (!sender_id) {
            throw new AppError('Authentication error, user ID not found.', 401);
        }
        if (!receiver_id) {
            throw new AppError('Receiver ID is required.', 400);
        }
        if (!voiceFile) {
            throw new AppError('Voice message file is required.', 400);
        }

        const newMessage = await MessageService.sendVoiceMessage(sender_id, receiver_id, voiceFile);
        res.status(201).json({ success: true, data: newMessage });
    } catch (error) {
        next(error);
    }
};
