import { Request, Response, NextFunction } from 'express';
// In a real app, you would import your Supabase client here
import supabase from '../config/supabaseClient';

// Extend the Express Request type to include a 'user' property
declare global {
    namespace Express {
        interface Request {
            user?: any; // In a real app, replace 'any' with your User type from common/types
        }
    }
}

/**
 * @desc    Middleware to protect routes by verifying a JWT token.
 * It checks for a token in the Authorization header, verifies it with Supabase,
 * and attaches the user's data to the request object.
 */
export const protect = async (req: Request, res: Response, next: NextFunction) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // Get token from header
            token = req.headers.authorization.split(' ')[1];

            // Verify token with Supabase
            const { data: { user }, error } = await supabase.auth.getUser(token);

            if (error || !user) {
                return res.status(401).json({ message: 'Not authorized, token failed' });
            }

            // Attach user to the request object
            req.user = user;

            // --- Placeholder Logic ---
            // console.log("Token received and processed by 'protect' middleware.");
            // req.user = { id: 'user123', role: 'fan' }; // Mock user for demonstration
            // --- End Placeholder ---

            next();
        } catch (error) {
            console.error(error);
            res.status(401).json({ message: 'Not authorized, token failed' });
        }
    }

    if (!token) {
        res.status(401).json({ message: 'Not authorized, no token' });
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
        res.status(403).json({ message: 'Access denied. Creator role required.' });
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
        res.status(403).json({ message: 'Access denied. Admin role required.' });
    }
};
