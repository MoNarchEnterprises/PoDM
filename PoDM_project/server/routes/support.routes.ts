import { Router } from 'express';
import * as supportController from '../controllers/support.controller';
import { protect, adminOnly, protectAndAdmin } from '../middleware/auth.middleware';

const router = Router();

router.post('/tickets', protect, supportController.createSupportTicket);

/**
 * @route   PUT /api/v1/support/tickets/:id/reply
 * @desc    Add a reply to a support ticket
 * @access  Private (Admins only)
 */
router.put('/tickets/:id/reply', ...protectAndAdmin, supportController.replyToTicket);

router.get('/tickets/:id', ...protectAndAdmin, supportController.getTicketById);

router.put('/tickets/:id/resolve', ...protectAndAdmin, supportController.resolveTicket);


export default router;