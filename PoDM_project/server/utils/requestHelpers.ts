import { Request } from 'express';
import { AppError } from '../middleware/error.middleware';

export const requireAuth = (req: Request, label: string = 'user'): string => {
    const userId = req.user?.id;
    if (!userId) {
        throw new AppError(`Authentication error, ${label} ID not found.`, 401);
    }
    return userId;
};

export const requireId = (req: Request, name: string = 'id'): string => {
    const val = req.params[name];
    if (!val) {
        throw new AppError(`Parameter ${name} is required.`, 400);
    }
    return val;
};

export const requireBody = (req: Request, fields: string[]): Record<string, any> => {
    for (const field of fields) {
        const value = req.body[field];
        if (value === undefined || value === null || value === '') {
            const fieldName = field.replace(/_/g, ' ');
            throw new AppError(`${fieldName} is required.`, 400);
        }
    }
    return req.body;
};
