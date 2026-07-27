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
        console.error(`AppError [${statusCode}]: ${message}`);
    } else {
        // Check if the error object has a status code (e.g., from OpenAI or other libs)
        console.log('Error Handler Received Non-AppError:', {
            name: err.name,
            message: err.message,
            stack: err.stack,
            fullError: err
        });

        if ((err as any).status) {
            statusCode = (err as any).status;
        } else if ((err as any).statusCode) {
            statusCode = (err as any).statusCode;
        } else if ((err as any).code && typeof (err as any).code === 'number') {
            // Sometimes 'code' is the status code (like 429)
            statusCode = (err as any).code;
        } else if ((err as any).error && (err as any).error.code && typeof (err as any).error.code === 'number') {
            // OpenAI sometimes puts it in error.code
            statusCode = (err as any).error.code;
        }

        // Use the error message if available, or fallback
        if (err.message) {
            message = err.message;
        }

        console.error('UNHANDLED ERROR:', err);
    }

    res.status(statusCode).json({
        success: false,
        message,
        // Only include the error stack in development mode for security reasons
        stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
    });
};
