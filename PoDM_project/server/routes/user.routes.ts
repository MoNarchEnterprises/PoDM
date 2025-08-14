import { Router } from 'express';
// --- Import Controllers & Middleware ---
// We will create these in later steps
// import { getMe, updateMe, getPublicProfile, addToGallery, removeFromGallery } from '../controllers/user.controller';
// import { protect } from '../middleware/auth.middleware';

const router = Router();

/**
 * @route   GET /api/v1/users/me
 * @desc    Get the profile of the currently logged-in user
 * @access  Private
 */
// router.get('/me', protect, getMe);

/**
 * @route   PUT /api/v1/users/me
 * @desc    Update the profile of the currently logged-in user
 * @access  Private
 */
// router.put('/me', protect, updateMe);

/**
 * @route   POST /api/v1/users/me/gallery
 * @desc    Add a piece of content to the current user's gallery
 * @access  Private
 */
// router.post('/me/gallery', protect, addToGallery);

/**
 * @route   DELETE /api/v1/users/me/gallery/:contentId
 * @desc    Remove a piece of content from the current user's gallery
 * @access  Private
 */
// router.delete('/me/gallery/:contentId', protect, removeFromGallery);

/**
 * @route   GET /api/v1/users/:username
 * @desc    Get a user's public profile by their username
 * @access  Public
 */
// router.get('/:username', getPublicProfile);


export default router;
