/**
 * A custom Error class for creating API errors with a specific HTTP status code.
 * This allows for standardized error handling throughout the application.
 */
export class AppError extends Error {
    statusCode: number;
    isOperational: boolean;

    constructor(message: string, statusCode: number) {
        super(message);

        this.statusCode = statusCode;
        // Differentiate between operational errors (expected, like "user not found")
        // and programming errors. This can be used for more advanced error logging.
        this.isOperational = true;

        // Capture the stack trace, excluding the constructor call from it.
        Error.captureStackTrace(this, this.constructor);

        // This is necessary to make 'instanceof' work correctly with custom errors in TypeScript
        Object.setPrototypeOf(this, AppError.prototype);
    }
}
