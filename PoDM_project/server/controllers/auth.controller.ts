import { Request, Response, NextFunction } from 'express';
import * as AuthService from '../services/auth.service';
import { AppError } from '../middleware/error.middleware';
import { UserRole } from '@common/types/User';

/**
 * @desc Signup and subscribe a new fan in one step
 * @route POST /api/v1/auth/signup-and-subscribe
 * @access Public
 */
export const signupAndSubscribe = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email, password, fullName, creatorId, tierId, paymentMethodId } = req.body;
        
        const { user, token } = await AuthService.signupAndSubscribe(
            email, password, fullName, creatorId, tierId, paymentMethodId
        );

        res.status(201).json({
            success: true,
            message: "User created and subscribed successfully.",
            data: { user, token }
        });

    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Register a new user (fan or creator)
 * @route   POST /api/v1/auth/signup
 * @access  Public
 */
export const signup = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email, password, username, role } = req.body;
        console.log('[Signup Controller] Received signup request:', { email, username, role });

        const { user, token } = await AuthService.signupUser(email, password, username, role as UserRole);

        console.log(`[Signup Controller] User registered successfully: ${username} (${role})`);
        res.status(201).json({
            success: true,
            message: "User registered successfully.",
            data: { user, token }
        });

    } catch (error: any) {
        // --- THIS IS THE CRITICAL ADDITION ---
        console.error('--- DETAILED SIGNUP ERROR ---');
        // Log the specific error message from the AppError
        console.error('Message:', error.message); 
        // If the error has more details (like from a Supabase client error), log them
        if (error.originalError) {
            console.error('Original Error:', error.originalError);
        }
        console.error('--- END DETAILED SIGNUP ERROR ---');
        // --- END OF ADDITION ---
        
        next(error); // Pass the error to the global error handler
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
        // In a real app, you would likely send the token back in a secure cookie
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

/**
 * @desc    Change the password for the current user
 * @route   PUT /api/v1/auth/change-password
 * @access  Private (requires auth token)
 */
export const changePassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?._id;
        const { currentPassword, newPassword } = req.body;

        if (!userId) {
            throw new AppError('Authentication error, user ID not found.', 401);
        }
        if (!currentPassword || !newPassword) {
            throw new AppError('Please provide current and new passwords.', 400);
        }

        await AuthService.changeUserPassword(userId, currentPassword, newPassword);
        res.status(200).json({ success: true, message: 'Password changed successfully.' });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Initiate a password reset email
 * @route   POST /api/v1/auth/forgot-password
 * @access  Public
 */
export const forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email } = req.body;
        if (!email) {
            throw new AppError('Please provide an email address.', 400);
        }

        // The service will instruct Supabase to send the email.
        await AuthService.requestPasswordReset(email);

        // ALWAYS return a success message to prevent email enumeration attacks.
        res.status(200).json({ success: true, message: 'If an account with this email exists, a password reset link has been sent.' });
    } catch (error) {
        next(error);
    }
};
