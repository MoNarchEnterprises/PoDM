// /server/routes/creator.routes.ts

import { Router } from 'express';
import { getCreatorDashboard } from '../controllers/creator.controller';
import { protect, creatorOnly } from '../middleware/auth.middleware';

const router = Router();

router.get('/dashboard', protect, creatorOnly, getCreatorDashboard);

export default router;