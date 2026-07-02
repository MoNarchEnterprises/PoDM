import { Request, Response, NextFunction } from 'express';
import * as MessageService from '../services/message.service';
import { AppError } from '../middleware/error.middleware';
import { asyncHandler } from '../utils/asyncHandler';
import { requireAuth } from '../utils/requestHelpers';
import { ok, created } from '../utils/response';

export const getConversations = asyncHandler(async (req: Request, res: Response) => {
    const userId = requireAuth(req);
    const conversations = await MessageService.getConversationsForUser(userId);
    ok(res, conversations);
});

export const getMessagesInConversation = asyncHandler(async (req: Request, res: Response) => {
    const userId = requireAuth(req);
    const { conversationId } = req.params;

    const messages = await MessageService.getMessagesForConversation(conversationId, userId);
    ok(res, messages);
});

export const sendMessage = asyncHandler(async (req: Request, res: Response) => {
    const sender_id = requireAuth(req);
    const receiver_id = req.body.receiverId || req.body.receiver_id;
    const { text, content } = req.body;

    if (!receiver_id || (!text && !content)) {
        throw new AppError('Receiver ID and message content are required.', 400);
    }

    const newMessage = await MessageService.sendDirectMessage(sender_id, receiver_id, { text, content });
    created(res, newMessage);
});

export const markConversationAsRead = asyncHandler(async (req: Request, res: Response) => {
    const userId = requireAuth(req);
    const { conversationId } = req.params;

    const result = await MessageService.markConversationAsRead(conversationId, userId);
    res.status(200).json(result);
});

export const deleteMessage = asyncHandler(async (req: Request, res: Response) => {
    const userId = requireAuth(req);
    const { id: messageId } = req.params;

    const result = await MessageService.deleteMessage(messageId, userId);
    res.status(200).json(result);
});

export const sendMassMessage = asyncHandler(async (req: Request, res: Response) => {
    const creatorId = requireAuth(req);
    const { text, content } = req.body;

    if (!text && !content) {
        throw new AppError('Message content is required.', 400);
    }

    const result = await MessageService.sendMassMessageToSubscribers(creatorId, { text, content });
    ok(res, result);
});

export const sendVoiceMessage = asyncHandler(async (req: Request, res: Response) => {
    const sender_id = requireAuth(req);
    const receiver_id = req.body.receiverId || req.body.receiver_id;
    const voiceFile = req.file;

    if (!receiver_id) {
        throw new AppError('Receiver ID is required.', 400);
    }
    if (!voiceFile) {
        throw new AppError('Voice message file is required.', 400);
    }

    const newMessage = await MessageService.sendVoiceMessage(sender_id, receiver_id, voiceFile);
    created(res, newMessage);
});
