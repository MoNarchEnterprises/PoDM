// /server/routes/creator.routes.ts

import { Router } from 'express';
import { getCreatorDashboard, updateCreatorSettings, getCreatorAnalytics, getCreatorEarnings, requestPayout, getCreatorActivity, getTiers, broadcastMessage, exportMetrics, exportFanEngagement } from '../controllers/creator.controller';
import { protect, creatorOnly, protectAndCreator } from '../middleware/auth.middleware';
import { uploadBanner } from '../middleware/upload.middleware';

const router = Router();

/**
 * @route   GET /api/v1/creator/dashboard
 * @desc    Get all data for the creator dashboard
 * @access  Private (Creators only)
 */
// 1. Add the new GET route
router.get('/dashboard', ...protectAndCreator, getCreatorDashboard);

/**
 * @route   PUT /api/v1/creator/settings
 * @desc    Update the settings for the currently logged-in creator
 * @access  Private (Creators only)
 */
// 2. Add the new PUT route
router.put('/settings', ...protectAndCreator, uploadBanner, updateCreatorSettings);

/**
 * @route   GET /api/v1/creator/analytics
 * @desc    Get all data for the creator analytics page
 * @access  Private (Creators only)
 */
router.get('/analytics', ...protectAndCreator, getCreatorAnalytics);

/**
 * @route   GET /api/v1/creator/metrics/export
 * @desc    Export creator metrics as CSV
 * @access  Private (Creators only)
 */
router.get('/metrics/export', ...protectAndCreator, exportMetrics);

/**
 * @route   GET /api/v1/creator/metrics/export-fans
 * @desc    Export fan engagement metrics as CSV
 * @access  Private (Creators only)
 */
router.get('/metrics/export-fans', ...protectAndCreator, exportFanEngagement);

/**
 * @route   GET /api/v1/creator/earnings
 * @desc    Get all data for the creator earnings page
 * @access  Private (Creators only)
 */
// 3. Add the new GET route
router.get('/earnings', ...protectAndCreator, getCreatorEarnings);

/**
 * @route   POST /api/v1/creator/payouts
 * @desc    Handle a creator payout request
 * @access  Private (Creators only)
 */
// 4. Add the new POST route
router.post('/payouts', ...protectAndCreator, requestPayout);

/**
 * @route   GET /api/v1/creator/activity
 * @desc    Get all recent activity for the creator
 * @access  Private (Creators only)
 */
router.get('/activity', ...protectAndCreator, getCreatorActivity);

/**
 * @route   GET /api/v1/creator/tiers
 * @desc    Get subscription tiers for the logged-in creator
 * @access  Private (Creators only)
 */
router.get('/tiers', ...protectAndCreator, getTiers);

/**
 * @route   POST /api/v1/creator/broadcast
 * @desc    Send a broadcast message to subscribers
 * @access  Private (Creators only)
 */
router.post('/broadcast', ...protectAndCreator, broadcastMessage);

export default router;
