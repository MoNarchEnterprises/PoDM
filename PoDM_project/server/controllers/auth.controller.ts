import { Request, Response, NextFunction } from 'express';
import * as AuthService from '../services/auth.service';
import { AppError } from '../middleware/error.middleware';
import { UserRole } from '@common/types/User';
/**
 * @desc    Register a new user (fan or creator)
 * @route   POST /api/v1/auth/signup
 * @access  Public
 */
export const signup = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email, password, username, role } = req.body;

        if (!email || !password || !username || !role) {
            throw new AppError('Please provide email, password, username, and role.', 400);
        }

        if (role !== 'fan' && role !== 'creator') {
            throw new AppError('Invalid user role specified.', 400);
        }

        const { user, token } = await AuthService.signupUser(email, password, username, role as UserRole);

        // In a real app, you would likely send the token back in a secure cookie
        res.status(201).json({
            success: true,
            message: "User registered successfully.",
            data: { user, token }
        });

    } catch (error) {
        next(error); // Pass errors to the global error handler
    }
};

/**
 * @desc    Authenticate a user and get a token
 * @route   POST /api/v1/auth/login
 * @access  Public
 */
export const login = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            throw new AppError('Please provide an email and password.', 400);
        }

        const { user, token } = await AuthService.loginUser(email, password);

        res.status(200).json({
            success: true,
            message: "User logged in successfully.",
            data: { user, token }
        });

    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Log out a user
 * @route   POST /api/v1/auth/logout
 * @access  Private (requires auth token)
 */
export const logout = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // In a real app, you might have logic here to invalidate a token
        // or clear a cookie. For Supabase, signOut is handled on the client.
        res.status(200).json({ success: true, message: "User logged out successfully." });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get current logged-in user
 * @route   GET /api/v1/auth/me
 * @access  Private (requires auth token)
 */
export const getMe = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // The 'protect' middleware has already verified the token
        // and attached the user object to the request.
        const user = req.user;

        res.status(200).json({
            success: true,
            data: { user }
        });
    } catch (error) {
        next(error);
    }
};