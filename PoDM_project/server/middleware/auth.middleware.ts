import { Request, Response, NextFunction } from 'express';
import supabase from '../config/supabaseClient'; // Use the main admin client
import { findUserById } from '../models/user.model';
import { AppError } from './error.middleware';
import { User } from '@common/types/User';
import { reshapeUserForApp } from '../utils/user.utils';
import fs from 'fs';
import path from 'path';

// Extend the Express Request type to include a 'user' property
declare global {
    namespace Express {
        interface Request {
            user?: User;
            originalUser?: User; // Add originalUser for impersonation
        }
    }
}

function logAuthDebug(message: string) {
    if (process.env.NODE_ENV !== 'production' && process.env.DEBUG_AUTH === 'true') {
        console.log(`[AUTH_DEBUG] ${new Date().toISOString()} - ${message}`);
    }
}

/**
 * @desc    Optionally attaches the user to the request if a valid token is provided.
 * Unlike 'protect', this does NOT throw an error if no token is found.
 * This is useful for public routes that should show different content for logged-in users.
 */
export const optionalProtect = async (req: Request, res: Response, next: NextFunction) => {
    const hasHeaderToken = req.headers.authorization && req.headers.authorization.startsWith('Bearer');
    const hasCookieToken = Boolean(req.cookies?.authToken);
    if (hasHeaderToken || hasCookieToken) {
        // If a token exists, run the full 'protect' logic
        return protect(req, res, next);
    } else {
        // If no token, just continue to the next middleware without a user object.
        next();
    }
};

/**
 * @desc    Middleware to protect routes by verifying a JWT token.
 * It checks for a token in cookies or Authorization header, verifies it with Supabase,
 * and attaches the full user profile to the request object.
 */
export const protect = async (req: Request, res: Response, next: NextFunction) => {
    logAuthDebug(`--- New Request: ${req.method} ${req.path} ---`);
    let token: string | undefined;

    if (req.cookies?.authToken) {
        token = req.cookies.authToken;
        logAuthDebug('Token found in HttpOnly cookie.');
    } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
        logAuthDebug('Token found in header.');
    }

    if (token) {
        try {

            // Use the admin client to validate the user's token
            const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token);

            if (authError) {
                logAuthDebug(`Supabase auth error: ${authError.message}`);
                return next(new AppError(`Not authorized: ${authError.message}`, 401));
            }
            if (!authUser) {
                logAuthDebug('No auth user returned for token.');
                return next(new AppError('Not authorized, token is invalid or expired.', 401));
            }
            logAuthDebug(`Token validated for user ID: ${authUser.id}`);

            // Fetch the user's full profile from our public profiles table
            const userProfile = await findUserById(authUser.id);

            if (!userProfile) {
                logAuthDebug(`Database profile not found for user ID: ${authUser.id}`);
                return next(new AppError('User profile not found for this token.', 404));
            }
            logAuthDebug(`Full user profile found: ${userProfile.username}`);

            // Attach the complete, reshaped user profile to the request object
            req.user = reshapeUserForApp(userProfile);

            // --- Impersonation Logic (moved from impersonation.middleware) ---
            const impersonatingUserId = req.headers['x-impersonating-user-id'] as string;
            if (impersonatingUserId && req.user.role === 'admin') {
                try {
                    const targetUser = await findUserById(impersonatingUserId);
                    if (!targetUser) {
                        logAuthDebug(`Impersonated user ID ${impersonatingUserId} not found.`);
                        // Continue as admin if impersonated user not found
                    } else {
                        req.originalUser = req.user; // Store the original admin user
                        req.user = reshapeUserForApp(targetUser); // Set req.user to the impersonated user
                        logAuthDebug(`Admin '${req.originalUser.email}' is now impersonating '${req.user.email}'.`);
                    }
                } catch (impersonationError) {
                    logAuthDebug(`Error during impersonation attempt: ${impersonationError}`);
                    // Continue as admin if impersonation fails
                }
            }
            // --- End Impersonation Logic ---

            logAuthDebug('User attached to request. Proceeding...');

            next();

        } catch (error: any) {
            logAuthDebug(`CATCH BLOCK ERROR: ${error.message}`);
            return next(new AppError('Not authorized, token processing error', 401));
        }
    } else {
        logAuthDebug('No authorization header found.');
        return next(new AppError('Not authorized, no token provided', 401));
    }
};

/**
 * @desc    Middleware to restrict access to creator-only routes.
 * Should be used after the 'protect' middleware.
 */
export const creatorOnly = (req: Request, res: Response, next: NextFunction) => {
    console.log('[CreatorOnly] Checking user role...');
    console.log(`[CreatorOnly] req.user.role: ${req.user?.role}`);
    console.log(`[CreatorOnly] req.originalUser: ${req.originalUser?.email || 'none'}`);

    // Allow if user is a creator, or if admin is impersonating a creator
    const isCreator = req.user && req.user.role === 'creator';
    const isAdminImpersonatingCreator = req.originalUser && req.originalUser.role === 'admin' && req.user && req.user.role === 'creator';

    if (isCreator || isAdminImpersonatingCreator) {
        console.log(`[CreatorOnly] Access granted. isCreator: ${isCreator}, isAdminImpersonatingCreator: ${isAdminImpersonatingCreator}`);
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

/**
 * @desc    Factory that creates a role-based access middleware.
 * Usage: requireRole('creator'), requireRole('admin'), requireRole('creator', 'admin')
 */
export const requireRole = (...roles: string[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        if (req.user && roles.includes(req.user.role)) {
            return next();
        }
        return next(new AppError(`Access denied. ${roles.join(' or ')} role required.`, 403));
    };
};

export const protectAndCreator = [protect, creatorOnly];
export const protectAndAdmin = [protect, adminOnly];