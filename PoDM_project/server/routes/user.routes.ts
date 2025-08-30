import { Router } from 'express';
// --- Import Controllers & Middleware ---
import { getMe, updateMe, getPublicProfile, addToGallery, removeFromGallery, updateMyAvatar, completeOnboarding, submitVerification, getFullPublicProfile } from '../controllers/user.controller';
import { protect, creatorOnly  } from '../middleware/auth.middleware';
// --- Add the avatar upload middleware import ---
import { uploadAvatar } from '../middleware/upload.middleware';
import { uploadVerificationDocs } from '../middleware/upload.middleware';

const router = Router();

/**
 * @route   GET /api/v1/users/me
 * @desc    Get the profile of the currently logged-in user
 * @access  Private
 */
router.get('/me', protect, getMe);

/**
 * @route   PUT /api/v1/users/me
 * @desc    Update the profile of the currently logged-in user
 * @access  Private
 */
router.put('/me', protect, updateMe);

/**
 * @route   PUT /api/v1/users/me/avatar
 * @desc    Update the current user's avatar
 * @access  Private
 */
router.put('/me/avatar', protect, uploadAvatar, updateMyAvatar);


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
router.get('/profile/:username', getFullPublicProfile);


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
router.post('/me/onboarding', protect, creatorOnly, completeOnboarding);

/**
 * @route   POST /api/v1/users/me/verification
 * @desc    Submit creator verification documents
 * @access  Private (Creators only)
 */
router.post('/me/verification', protect, creatorOnly, uploadVerificationDocs, submitVerification);


export default router;
