import rateLimit from 'express-rate-limit';

const isDevelopment = process.env.NODE_ENV !== 'production';

export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: isDevelopment ? 1000 : 5,
    message: 'Too many attempts, please try again in 15 minutes.',
    standardHeaders: 'draft-7',
    legacyHeaders: false,
});

export const paymentLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 20,
    message: 'Too many payment requests, please slow down.',
    standardHeaders: 'draft-7',
    legacyHeaders: false,
});

export const globalLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 100,
    message: 'Too many requests from this IP.',
    standardHeaders: 'draft-7',
    legacyHeaders: false,
});
