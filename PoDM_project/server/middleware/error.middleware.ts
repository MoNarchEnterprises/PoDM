import { Request, Response, NextFunction } from 'express';

/**
 * A custom Error class to create errors with a specific status code.
 */
export class AppError extends Error {
    statusCode: number;

    constructor(message: string, statusCode: number) {
        super(message);
        this.statusCode = statusCode;
        // This is necessary to make 'instanceof' work correctly with custom errors in TypeScript
        Object.setPrototypeOf(this, AppError.prototype);
    }
}

/**
 * Global error handling middleware for the Express application.
 * This should be the last middleware added to your app stack in server.ts.
 * It catches all errors thrown by your route handlers and sends a
 * standardized JSON response.
 */
export const errorHandler = (
    err: Error, 
    req: Request, 
    res: Response, 
    next: NextFunction
) => {
    // Default to a 500 Internal Server Error if no specific status is set
    let statusCode = 500;
    let message = 'Something went wrong on the server.';

    // If the error is a custom AppError, use its specific status and message
    if (err instanceof AppError) {
        statusCode = err.statusCode;
        message = err.message;
    } else {
        // You can add more specific error checks here if needed
        // For example, handling Supabase or database-specific errors.
        console.error('UNHANDLED ERROR:', err);
    }

    res.status(statusCode).json({
        success: false,
        message,
        // Only include the error stack in development mode for security reasons
        stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
    });
};
