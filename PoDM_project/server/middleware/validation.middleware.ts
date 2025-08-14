import { Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { AppError } from './error.middleware';

/**
 * A middleware function that checks for validation errors from express-validator.
 * If errors are found, it sends a 400 Bad Request response. Otherwise, it calls next().
 */
const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        // We can format the errors to be more user-friendly if needed
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};

// --- Validation Chains ---
// These are arrays of validation rules that can be applied to your routes.

/**
 * Validation rules for the user signup route.
 */
export const validateSignup = [
    body('email')
        .isEmail()
        .withMessage('Please provide a valid email address.')
        .normalizeEmail(),
    body('username')
        .trim()
        .isLength({ min: 3 })
        .withMessage('Username must be at least 3 characters long.'),
    body('password')
        .isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters long.'),
    handleValidationErrors,
];

/**
 * Validation rules for creating or updating content.
 */
export const validateContent = [
    body('title')
        .trim()
        .notEmpty()
        .withMessage('Title is required.'),
    body('type')
        .isIn(['photo', 'video', 'text', 'audio'])
        .withMessage('Invalid content type.'),
    body('visibility')
        .isIn(['subscribers_only', 'pay_per_view'])
        .withMessage('Invalid visibility setting.'),
    body('price')
        .if(body('visibility').equals('pay_per_view'))
        .isNumeric()
        .withMessage('Price must be a number for pay-per-view content.'),
    handleValidationErrors,
];

/**
 * Validation rules for sending a tip.
 */
export const validateTip = [
    body('creatorId')
        .notEmpty()
        .withMessage('Creator ID is required.'),
    body('amount')
        .isInt({ min: 100 }) // Minimum tip of $1.00
        .withMessage('Tip amount must be at least $1.00.'),
    handleValidationErrors,
];
