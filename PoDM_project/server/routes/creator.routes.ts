// /server/routes/creator.routes.ts

import { Router } from 'express';
import { getCreatorDashboard, updateCreatorSettings } from '../controllers/creator.controller';
import { protect, creatorOnly } from '../middleware/auth.middleware';

const router = Router();

router.get('/dashboard', protect, creatorOnly, getCreatorDashboard);

/**
 * @route   PUT /api/v1/creator/settings
 * @desc    Update the settings for the currently logged-in creator
 * @access  Private (Creators only)
 */
// 2. Add the new PUT route
router.put('/settings', protect, creatorOnly, updateCreatorSettings);

export default router;