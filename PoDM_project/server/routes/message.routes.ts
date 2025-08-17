import { Router } from 'express';
// --- Import Controllers & Middleware ---
import { getConversations, getMessagesInConversation, sendMessage, sendMassMessage } from '../controllers/message.controller';
import { protect, creatorOnly } from '../middleware/auth.middleware';

const router = Router();

/**
 * @route   GET /api/v1/messages
 * @desc    Get all conversations for the currently logged-in user
 * @access  Private
 */
router.get('/', protect, getConversations);

/**
 * @route   GET /api/v1/messages/:conversationId
 * @desc    Get all messages for a specific conversation
 * @access  Private (User must be a participant)
 */
router.get('/:conversationId', protect, getMessagesInConversation);

/**
 * @route   POST /api/v1/messages
 * @desc    Send a new message
 * @access  Private
 */
router.post('/', protect, sendMessage);

/**
 * @route   POST /api/v1/messages/mass-message
 * @desc    Send a message to all of a creator's subscribers
 * @access  Private (Creators only)
 */
router.post('/mass-message', protect, creatorOnly, sendMassMessage);


export default router;
