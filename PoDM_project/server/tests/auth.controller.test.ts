import { Request, Response, NextFunction } from 'express';
import * as AuthController from '../controllers/auth.controller';
import * as AuthService from '../services/auth.service';

// Mock the AuthService
jest.mock('../services/auth.service');

describe('Auth Controller', () => {
    let req: Partial<Request>;
    let res: Partial<Response>;
    let next: NextFunction;

    beforeEach(() => {
        req = {
            body: {}
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        next = jest.fn();
    });

    describe('login', () => {
        it('should return 200 and token when login is successful', async () => {
            req.body = { email: 'test@example.com', password: 'password123' };
            const mockUser = { id: '1', email: 'test@example.com', role: 'fan' };
            const mockToken = 'mock-token';

            (AuthService.loginUser as jest.Mock).mockResolvedValue({ user: mockUser, token: mockToken });

            await AuthController.login(req as Request, res as Response, next);

            expect(AuthService.loginUser).toHaveBeenCalledWith('test@example.com', 'password123');
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: "User logged in successfully.",
                data: { user: mockUser, token: mockToken }
            });
        });

        it('should call next with error if login fails', async () => {
            req.body = { email: 'test@example.com', password: 'wrongpassword' };
            const mockError = new Error('Invalid credentials');

            (AuthService.loginUser as jest.Mock).mockRejectedValue(mockError);

            await AuthController.login(req as Request, res as Response, next);
            await new Promise(resolve => process.nextTick(resolve));

            expect(next).toHaveBeenCalledWith(mockError);
        });

        it('should throw error if email or password missing', async () => {
            req.body = { email: 'test@example.com' }; // Missing password

            await AuthController.login(req as Request, res as Response, next);
            await new Promise(resolve => process.nextTick(resolve));

            expect(next).toHaveBeenCalledWith(expect.any(Error));
        });
    });

    describe('signup', () => {
        it('should return 201 and user data when signup is successful', async () => {
            req.body = { email: 'new@example.com', password: 'password123', username: 'newuser', role: 'fan' };
            const mockUser = { id: '2', email: 'new@example.com', role: 'fan', username: 'newuser' };
            const mockToken = 'new-token';

            (AuthService.signupUser as jest.Mock).mockResolvedValue({ user: mockUser, token: mockToken });

            await AuthController.signup(req as Request, res as Response, next);

            expect(AuthService.signupUser).toHaveBeenCalledWith('new@example.com', 'password123', 'newuser', 'fan', undefined);
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: "User registered successfully.",
                data: { user: mockUser, token: mockToken }
            });
        });
    });
});
