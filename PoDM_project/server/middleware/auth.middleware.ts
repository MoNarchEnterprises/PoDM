import { Request, Response, NextFunction } from 'express';
import supabase from '../config/supabaseClient'; // Use the main admin client
import { findUserById } from '../models/user.model';
import { AppError } from './error.middleware';
import { User } from '@common/types/User';
import { reshapeUserForApp } from '../utils/user.utils';

// Extend the Express Request type to include a 'user' property
declare global {
    namespace Express {
        interface Request {
            user?: User;
        }
    }
}

/**
 * @desc    Optionally attaches the user to the request if a valid token is provided.
 * Unlike 'protect', this does NOT throw an error if no token is found.
 * This is useful for public routes that should show different content for logged-in users.
 */
export const optionalProtect = async (req: Request, res: Response, next: NextFunction) => {
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        // If a token exists, run the full 'protect' logic
        return protect(req, res, next);
    } else {
        // If no token, just continue to the next middleware without a user object.
        next();
    }
};

/**
 * @desc    Middleware to protect routes by verifying a JWT token.
 * It checks for a token, verifies it with Supabase, and attaches the
 * full user profile to the request object.
 */
export const protect = async (req: Request, res: Response, next: NextFunction) => {
    console.log(`[Protect] --- New Request: ${req.method} ${req.path} ---`);
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            console.log('[Protect] Token found in header.');

            // Use the admin client to validate the user's token
            const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token);
            
            if (authError) {
                console.error('[Protect] Supabase auth error:', authError.message);
                return next(new AppError(`Not authorized: ${authError.message}`, 401));
            }
            if (!authUser) {
                console.error('[Protect] No auth user returned for token.');
                return next(new AppError('Not authorized, token is invalid or expired.', 401));
            }
            console.log(`[Protect] Token validated for user ID: ${authUser.id}`);

            // Fetch the user's full profile from our public profiles table
            const userProfile = await findUserById(authUser.id);
            
            if (!userProfile) {
                console.error(`[Protect] Database profile not found for user ID: ${authUser.id}`);
                return next(new AppError('User profile not found for this token.', 404));
            }
            console.log(`[Protect] Full user profile found: ${userProfile.username}`);

            // Attach the complete, reshaped user profile to the request object
            req.user = reshapeUserForApp(userProfile);
            console.log('[Protect] User attached to request. Proceeding...');
            
            next();

        } catch (error: any) {
            console.error('[Protect] CATCH BLOCK ERROR:', error.message);
            return next(new AppError('Not authorized, token processing error', 401));
        }
    } else {
        console.log('[Protect] No authorization header found.');
        return next(new AppError('Not authorized, no token provided', 401));
    }
};

/**
 * @desc    Middleware to restrict access to creator-only routes.
 * Should be used after the 'protect' middleware.
 */
export const creatorOnly = (req: Request, res: Response, next: NextFunction) => {
    console.log('[CreatorOnly] Checking user role...');
    if (req.user && req.user.role === 'creator') {
        console.log(`[CreatorOnly] Access granted for role: ${req.user.role}`);
        next();
    } else {
        console.error(`[CreatorOnly] Access denied. User role is: ${req.user?.role}`);
        return next(new AppError('Access denied. Creator role required.', 403));
    }
};

/**
 * @desc    Middleware to restrict access to admin-only routes.
 * Should be used after the 'protect' middleware.
 */
export const adminOnly = (req: Request, res: Response, next: NextFunction) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        return next(new AppError('Access denied. Admin role required.', 403));
    }
};