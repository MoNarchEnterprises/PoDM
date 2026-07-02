import { Router } from 'express';
// --- Import Controllers & Middleware ---
import { createContent, getContentById, updateContent, deleteContent, getContentByCreator, getMyContent, getSecureContentUrl, getContentView, getContentViewerData, reportContent } from '../controllers/content.controller';
import { protect, protectAndCreator, optionalProtect } from '../middleware/auth.middleware';
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
router.post('/', ...protectAndCreator, uploadContent, createContent);


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
router.get('/my-content', ...protectAndCreator, getMyContent);


/**
 * @route   GET /api/v1/content/creator/:username
 * @desc    Get all content for a specific creator (public view, may be blurred/locked)
 * @access  Public
 */
router.get('/creator/:username', optionalProtect, getContentByCreator);

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
 * @route   POST /api/v1/content/:id/report
 * @desc    Report a piece of content
 * @access  Private
 */
router.post('/:id/report', protect, reportContent);

/**
 * @route   PUT /api/v1/content/:id
 * @desc    Update a piece of content
 * @access  Private (Owner only)
 */
router.put('/:id', ...protectAndCreator, updateContent);

/**
 * @route   DELETE /api/v1/content/:id
 * @desc    Delete a piece of content
 * @access  Private (Owner only)
 */
router.delete('/:id', ...protectAndCreator, deleteContent);

/**
 * @route   GET /api/v1/content/:id/viewer-data
 * @desc    Get all data for the content viewer page
 * @access  Public
 */
router.get('/:id/viewer-data', protect, getContentViewerData);


export default router;