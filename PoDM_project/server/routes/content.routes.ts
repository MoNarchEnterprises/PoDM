import { Router } from 'express';
// --- Import Controllers & Middleware ---
import { createContent, getContentById, updateContent, deleteContent, getContentByCreator, getMyContent, getSecureContentUrl, getContentView } from '../controllers/content.controller';
import { protect, creatorOnly } from '../middleware/auth.middleware';
import { uploadContent } from '../middleware/upload.middleware'; 

const router = Router();

/**
 * @route   POST /api/v1/content
 * @desc    Create a new piece of content
 * @access  Private (Creators only)
 */
// --- THIS IS THE FIX ---
// The `uploadContent` middleware now handles its own errors, so we remove the extra handler.
// The chain is now simpler and architecturally correct.
router.post('/', protect, creatorOnly, uploadContent, createContent);


/**
 * @route   GET /api/v1/content/:id/secure-url
 * @desc    Get a secure, temporary URL for a content file
 * @access  Private (Subscribers, Admins, or Owner)
 */
router.get('/:id/secure-url', protect, getSecureContentUrl);

/**
 * @route   GET /api/v1/content/my-content
 * @desc    Get all content for the currently logged-in creator
 * @access  Private (Creators only)
 */
router.get('/my-content', protect, creatorOnly, getMyContent);


/**
 * @route   GET /api/v1/content/creator/:username
 * @desc    Get all content for a specific creator (public view, may be blurred/locked)
 * @access  Public
 */
router.get('/creator/:username', getContentByCreator);

/**
 * @route   GET /api/v1/content/:id/view
 * @desc    Get a secure URL for viewing full-size content
 * @access  Private (Requires fan access)
 */
router.get('/:id/view', protect, getContentView);

/**
 * @route   GET /api/v1/content/:id
 * @desc    Get a single piece of content by its ID
 * @access  Private (Fan must be subscribed or have purchased)
 */
router.get('/:id', protect, getContentById);

/**
 * @route   PUT /api/v1/content/:id
 * @desc    Update a piece of content
 * @access  Private (Owner only)
 */
router.put('/:id', protect, creatorOnly, updateContent);

/**
 * @route   DELETE /api/v1/content/:id
 * @desc    Delete a piece of content
 * @access  Private (Owner only)
 */
router.delete('/:id', protect, creatorOnly, deleteContent);


export default router;