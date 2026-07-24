import { Router } from 'express';
// --- Import Controllers & Middleware ---
import { getMe, updateMe, getPublicProfile, addToGallery, removeFromGallery, 
        updateMyAvatar, completeOnboarding, submitVerification, 
        getFullPublicProfile, getMyFeed, getMyGallery, getMySettings, 
        updateMySettings } from '../controllers/user.controller';
import { optionalProtect, protect, creatorOnly, protectAndCreator } from '../middleware/auth.middleware';
// --- Add the avatar upload middleware import ---
import { uploadAvatar, uploadBanner } from '../middleware/upload.middleware';
import { uploadVerificationDocs } from '../middleware/upload.middleware';

const router = Router();

/**
 * @route   GET /api/v1/users/me
 * @desc    Get the profile of the currently logged-in user
 * @access  Private
 */
router.get('/me', protect, getMe);

/**
 * @route   GET /api/v1/users/me/gallery
 * @desc    Get the personalized gallery for the current user
 * @access  Private
 */
// 2. Add the new route
router.get('/me/gallery', protect, getMyGallery);

/**
 * @route   PUT /api/v1/users/me
 * @desc    Update the profile of the currently logged-in user
 * @access  Private
 */
router.put('/me', protect, updateMe);

/**
 * @route   POST /api/v1/users/me/avatar  
 * @desc    Update the current user's avatar
 * @access  Private
 */
router.post('/me/avatar', protect, uploadAvatar, updateMyAvatar);


/**
 * @route   POST /api/v1/users/me/gallery
 * @desc    Add a piece of content to the current user's gallery
 * @access  Private
 */
router.post('/me/gallery', protect, addToGallery);

/**
 * @route   DELETE /api/v1/users/me/gallery/:contentId
 * @desc    Remove a piece of content from the current user's gallery
 * @access  Private
 */
router.delete('/me/gallery/:contentId', protect, removeFromGallery);

/**
 * @route   GET /api/v1/users/profile/:username
 * @desc    Get a creator's full public profile for their page
 * @access  Public
 */
router.get('/profile/:username', optionalProtect, getFullPublicProfile);


/**
 * @route   GET /api/v1/users/:username
 * @desc    Get a user's public profile by their username
 * @access  Public
 */
router.get('/:username', getPublicProfile);

/**
 * @route   POST /api/v1/users/me/onboarding
 * @desc    Complete the onboarding process for the current creator
 * @access  Private (Creators only)
 */
router.post('/me/onboarding', ...protectAndCreator, completeOnboarding);

/**
 * @route   POST /api/v1/users/me/verification
 * @desc    Submit creator verification documents
 * @access  Private (Creators only)
 */
router.post('/me/verification', ...protectAndCreator, uploadVerificationDocs, submitVerification);

/**
 * @route   GET /api/v1/users/me/feed
 * @desc    Get the personalized content feed for the current user
 * @access  Private
 */
router.get('/me/feed', protect, getMyFeed);

/**
 * @route   GET /api/v1/users/me/settings
 * @desc    Get all settings for the currently logged-in user
 * @access  Private
 */
// 2. Add the new GET route
router.get('/me/settings', protect, getMySettings);

/**
 * @route   PUT /api/v1/users/me/settings
 * @desc    Update all settings for the currently logged-in user
 * @access  Private
 */
// 3. Add the new PUT route
router.put('/me/settings', protect, updateMySettings);

export default router;
