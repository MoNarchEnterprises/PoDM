import { Router } from 'express';
import { logEvent } from '../controllers/analytics.controller';
import { protect, optionalProtect } from '../middleware/auth.middleware';

const router = Router();

// This route uses optionalProtect to allow guests to log events (like profile visits)
router.post('/log', optionalProtect, logEvent);

export default router;