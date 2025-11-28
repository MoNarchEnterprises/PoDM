import { Router } from 'express';
import * as supportController from '../controllers/support.controller';
import { protect, adminOnly } from '../middleware/auth.middleware';

const router = Router();

router.post('/tickets', protect, supportController.createSupportTicket);

/**
 * @route   PUT /api/v1/support/tickets/:id/reply
 * @desc    Add a reply to a support ticket
 * @access  Private (Admins only)
 */
router.put('/tickets/:id/reply', protect, adminOnly, supportController.replyToTicket);


export default router;