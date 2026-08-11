import { Request, Response, NextFunction } from 'express';
import { creatorOnly, anyCreator } from '../middleware/auth.middleware';
import { AppError } from '../middleware/error.middleware';

describe('auth.middleware creator status checks', () => {
    let mockReq: Partial<Request>;
    let mockRes: Partial<Response>;
    let nextFunction: jest.Mock;

    beforeEach(() => {
        mockReq = {};
        mockRes = {};
        nextFunction = jest.fn();
    });

    describe('creatorOnly', () => {
        it('should allow active creators', () => {
            mockReq.user = { id: 'c1', role: 'creator', status: 'active' } as any;

            creatorOnly(mockReq as Request, mockRes as Response, nextFunction);

            expect(nextFunction).toHaveBeenCalledWith();
        });

        it('should block pending creators with 403', () => {
            mockReq.user = { id: 'c1', role: 'creator', status: 'pending' } as any;

            creatorOnly(mockReq as Request, mockRes as Response, nextFunction);

            expect(nextFunction).toHaveBeenCalledWith(expect.any(AppError));
            const error = nextFunction.mock.calls[0][0];
            expect(error.statusCode).toBe(403);
            expect(error.message).toContain('Active creator account required');
        });

        it('should block fan role with 403', () => {
            mockReq.user = { id: 'f1', role: 'fan', status: 'active' } as any;

            creatorOnly(mockReq as Request, mockRes as Response, nextFunction);

            expect(nextFunction).toHaveBeenCalledWith(expect.any(AppError));
            const error = nextFunction.mock.calls[0][0];
            expect(error.statusCode).toBe(403);
            expect(error.message).toContain('Creator role required');
        });

        it('should allow admin impersonating pending creator', () => {
            mockReq.originalUser = { id: 'a1', role: 'admin', status: 'active' } as any;
            mockReq.user = { id: 'c1', role: 'creator', status: 'pending' } as any;

            creatorOnly(mockReq as Request, mockRes as Response, nextFunction);

            expect(nextFunction).toHaveBeenCalledWith();
        });
    });

    describe('anyCreator', () => {
        it('should allow active creators', () => {
            mockReq.user = { id: 'c1', role: 'creator', status: 'active' } as any;

            anyCreator(mockReq as Request, mockRes as Response, nextFunction);

            expect(nextFunction).toHaveBeenCalledWith();
        });

        it('should allow pending creators', () => {
            mockReq.user = { id: 'c1', role: 'creator', status: 'pending' } as any;

            anyCreator(mockReq as Request, mockRes as Response, nextFunction);

            expect(nextFunction).toHaveBeenCalledWith();
        });

        it('should block non-creator users', () => {
            mockReq.user = { id: 'f1', role: 'fan', status: 'active' } as any;

            anyCreator(mockReq as Request, mockRes as Response, nextFunction);

            expect(nextFunction).toHaveBeenCalledWith(expect.any(AppError));
            const error = nextFunction.mock.calls[0][0];
            expect(error.statusCode).toBe(403);
        });
    });
});
