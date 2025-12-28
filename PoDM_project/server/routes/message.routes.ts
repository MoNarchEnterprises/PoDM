import { Router } from 'express';
// --- Import Controllers & Middleware ---
import { getConversations, getMessagesInConversation, sendMessage, sendMassMessage, deleteMessage, markConversationAsRead, sendVoiceMessage } from '../controllers/message.controller';
import { protect, creatorOnly } from '../middleware/auth.middleware';
import { uploadVoiceMessage } from '../middleware/upload.middleware';

const router = Router();

/**
 * @route   GET /api/v1/messages/conversations
 * @desc    Get all conversations for the currently logged-in user
 * @access  Private
 */
router.get('/conversations', protect, getConversations);

/**
 * @route   GET /api/v1/messages/conversations/:id
 * @desc    Get all messages for a specific conversation
 * @access  Private (User must be a participant)
 */
router.get('/conversations/:conversationId', protect, getMessagesInConversation);


/**
 * @route   POST /api/v1/messages
 * @desc    Send a new message
 * @access  Private
 */
router.post('/', protect, sendMessage);

/**
 * @route   PUT /api/v1/messages/conversations/:id/read
 * @desc    Mark a conversation's messages as read
 * @access  Private
 */
router.put('/conversations/:conversationId/read', protect, markConversationAsRead);

/**
 * @route   DELETE /api/v1/messages/:id
 * @desc    Delete a message
 * @access  Private (Owner only)
 */
router.delete('/:id', protect, deleteMessage);

/**
 * @route   POST /api/v1/messages/voice
 * @desc    Send a voice message
 * @access  Private (Creators only)
 */
router.post('/voice', protect, creatorOnly, uploadVoiceMessage, sendVoiceMessage);

/**
 * @route   POST /api/v1/messages/mass-message
 * @desc    Send a message to all of a creator's subscribers
 * @access  Private (Creators only)
 */
router.post('/mass-message', protect, creatorOnly, sendMassMessage);


export default router;
