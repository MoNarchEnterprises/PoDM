import { Router } from 'express';
// --- Import Controllers ---
// We will create these controller functions in the next step
import { signup, login, logout, getMe, changePassword, forgotPassword, signupAndSubscribe, refreshSession } from '../controllers/auth.controller';
import { protect } from '../middleware/auth.middleware';

console.log('✅ auth.routes.ts file has been loaded and is running.');


const router = Router();

/**
 * @route   POST /api/v1/auth/signup-and-subscribe
 * @desc    Signup and subscribe a new fan in one step
 * @access  Public
 */
router.post('/signup-and-subscribe', signupAndSubscribe);


/**
 * @route   POST /api/v1/auth/signup
 * @desc    Register a new user (fan or creator)
 * @access  Public
 */
router.post('/signup', signup);

/**
 * @route   POST /api/v1/auth/forgot-password
 * @desc    Initiate a password reset for a user
 * @access  Public
 */
router.post('/forgot-password', forgotPassword);

/**
 * @route   POST /api/v1/auth/login
 * @desc    Authenticate a user and get a token
 * @access  Public
 */
router.post('/login', login);

/**
 * @route   POST /api/v1/auth/refresh
 * @desc    Refresh an expired access token using a refresh token cookie or body
 * @access  Public
 */
router.post('/refresh', refreshSession);

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Log out a user
 * @access  Private (requires auth token)
 */
router.post('/logout', logout);

/**
 * @route   GET /api/v1/auth/me
 * @desc    Get the currently logged-in user from their token
 * @access  Private
 */
router.get('/me', protect, getMe);

/**
 * @route   PUT /api/v1/auth/change-password
 * @desc    Change password for the currently logged-in user
 * @access  Private
 */
router.put('/change-password', protect, changePassword);


export default router;
