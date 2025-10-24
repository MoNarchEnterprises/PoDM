// /server/routes/creator.routes.ts

import { Router } from 'express';
import { getCreatorDashboard, updateCreatorSettings, getCreatorAnalytics, getCreatorEarnings, requestPayout } from '../controllers/creator.controller';
import { protect, creatorOnly } from '../middleware/auth.middleware';
import { uploadBanner } from '../middleware/upload.middleware'; 

const router = Router();

/**
 * @route   GET /api/v1/creator/dashboard
 * @desc    Get all data for the creator dashboard
 * @access  Private (Creators only)
 */
// 1. Add the new GET route
router.get('/dashboard', protect, creatorOnly, getCreatorDashboard);

/**
 * @route   PUT /api/v1/creator/settings
 * @desc    Update the settings for the currently logged-in creator
 * @access  Private (Creators only)
 */
// 2. Add the new PUT route
router.put('/settings', protect, creatorOnly, uploadBanner, updateCreatorSettings);

/**
 * @route   GET /api/v1/creator/analytics
 * @desc    Get all data for the creator analytics page
 * @access  Private (Creators only)
 */
router.get('/analytics', protect, creatorOnly, getCreatorAnalytics);


/**
 * @route   GET /api/v1/creator/earnings
 * @desc    Get all data for the creator earnings page
 * @access  Private (Creators only)
 */
// 3. Add the new GET route
router.get('/earnings', protect, creatorOnly, getCreatorEarnings);

/**
 * @route   POST /api/v1/creator/payouts
 * @desc    Handle a creator payout request
 * @access  Private (Creators only)
 */
// 4. Add the new POST route
router.post('/payouts', protect, creatorOnly, requestPayout);

export default router;