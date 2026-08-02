import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

/**
 * Generates a unique request ID for each incoming request.
 * Attaches it to the request object and response headers for log correlation.
 */
export const requestId = (req: Request, res: Response, next: NextFunction) => {
    const id = (req.headers['x-request-id'] as string) || randomUUID();
    (req as any).requestId = id;
    res.setHeader('X-Request-ID', id);
    next();
};
