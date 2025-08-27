import { Router } from 'express';
import { logEvent } from '../controllers/analytics.controller';
import { protect } from '../middleware/auth.middleware';

const router = Router();

// This route is protected to get the viewerId, but it will handle events for guests too
router.post('/log', protect, logEvent);

export default router;