import { Router } from 'express';
// --- Import Controllers ---
// We will create these controller functions in the next step
import { signup, login, logout } from '../controllers/auth.controller';

import { getMe } from '../controllers/auth.controller';
import { protect } from '../middleware/auth.middleware';


const router = Router();

/**
 * @route   POST /api/v1/auth/signup
 * @desc    Register a new user (fan or creator)
 * @access  Public
 */
router.post('/signup', signup);

/**
 * @route   POST /api/v1/auth/login
 * @desc    Authenticate a user and get a token
 * @access  Public
 */
router.post('/login', login);

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


export default router;
