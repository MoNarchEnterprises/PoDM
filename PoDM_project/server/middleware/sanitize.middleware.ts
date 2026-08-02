import sanitizeHtml from 'sanitize-html';
import { Request, Response, NextFunction } from 'express';

const sanitizeValue = (value: any): any => {
    if (typeof value === 'string') {
        return sanitizeHtml(value, {
            allowedTags: [],
            allowedAttributes: {},
        });
    }
    if (Array.isArray(value)) {
        return value.map(sanitizeValue);
    }
    if (value !== null && typeof value === 'object') {
        const sanitizedObj: any = {};
        for (const key in value) {
            if (Object.prototype.hasOwnProperty.call(value, key)) {
                sanitizedObj[key] = sanitizeValue(value[key]);
            }
        }
        return sanitizedObj;
    }
    return value;
};

export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
    if (req.body) {
        req.body = sanitizeValue(req.body);
    }
    // Express 5 defines req.query as a getter-only property (re-parsed on each
    // access). Assignment throws; override it with a sanitized snapshot instead.
    if (req.query) {
        Object.defineProperty(req, 'query', {
            configurable: true,
            enumerable: true,
            writable: true,
            value: sanitizeValue(req.query),
        });
    }
    if (req.params) {
        req.params = sanitizeValue(req.params);
    }
    next();
};
