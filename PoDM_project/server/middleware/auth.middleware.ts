import { Request, Response, NextFunction } from 'express';
import { createClient, User as SupabaseAuthUser } from '@supabase/supabase-js';
import { findUserById } from '../models/user.model';
import { AppError } from './error.middleware';
import { User } from '@common/types/User';
import { reshapeUserForApp } from '../utils/user.utils';

// --- Local Supabase Client for Token Verification ---
// This client uses the public ANON key and is ONLY used to verify incoming user tokens.
// It is separate from the global service_role client used for admin operations.
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase URL and Anon Key must be provided for the auth middleware.");
}
const authSupabase = createClient(supabaseUrl, supabaseAnonKey);




// Extend the Express Request type to include a 'user' property
declare global {
    namespace Express {
        interface Request {
            user?: User;
        }
    }
}

/**
 * @desc    Middleware to protect routes by verifying a JWT token.
 * It checks for a token in the Authorization header, verifies it with Supabase,
 * and attaches the user's full profile (including role) to the request object.
 */
export const protect = async (req: Request, res: Response, next: NextFunction) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // 1. Get token from header
            token = req.headers.authorization.split(' ')[1];
            if (!token) {
                return next(new AppError('Not authorized, no token provided', 401));
            }

            // 2. **FIX:** Verify token with the local Supabase client that uses the ANON key.
            const { data: { user: authUser }, error: authError } = await authSupabase.auth.getUser(token);

            if (authError || !authUser) {
                return next(new AppError('Not authorized, token failed', 401));
            }

            // 3. Fetch the user's public profile to get their correct role
            // The user model uses the global service_role client, which is correct for this DB query.
            const userProfile = await findUserById(authUser.id);
            
            if (!userProfile) {
                return next(new AppError('User profile not found for this token.', 404));
            }

            // 4. Attach the complete user profile to the request object
            req.user = reshapeUserForApp(userProfile, authUser);

            next();
        } catch (error) {
            return next(new AppError('Not authorized, token processing error', 401));
        }
    }

    if (!token) {
        return next(new AppError('Not authorized, no token provided', 401));
    }
};

/**
 * @desc    Middleware to restrict access to creator-only routes.
 * Should be used after the 'protect' middleware.
 */
export const creatorOnly = (req: Request, res: Response, next: NextFunction) => {
    if (req.user && req.user.role === 'creator') {
        next();
    } else {
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
