import { Router } from 'express';
import * as supportController from '../controllers/support.controller';
import { protect } from '../middleware/auth.middleware';

const router = Router();

router.post('/tickets', protect, supportController.createSupportTicket);

export default router;