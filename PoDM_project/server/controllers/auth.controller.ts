import { Request, Response, NextFunction } from 'express';
import * as AuthService from '../services/auth.service';
import { AppError } from '../middleware/error.middleware';
import { UserRole } from '@common/types/User';
import { asyncHandler } from '../utils/asyncHandler';
import { requireAuth } from '../utils/requestHelpers';
import { ok, created, okMsg, createdMsg } from '../utils/response';

export const signupAndSubscribe = asyncHandler(async (req: Request, res: Response) => {
    const { email, password, fullName, creatorId, tierId, paymentMethodId } = req.body;

    const { user, token } = await AuthService.signupAndSubscribe(
        email, password, fullName, creatorId, tierId, paymentMethodId
    );

    createdMsg(res, "User created and subscribed successfully.", { user, token });
});

export const signup = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email, password, username, role, referralCode } = req.body;

        const { user, token } = await AuthService.signupUser(email, password, username, role as UserRole, referralCode);

        createdMsg(res, "User registered successfully.", { user, token });
    } catch (error: any) {
        console.error('--- DETAILED SIGNUP ERROR ---');
        console.error('Message:', error.message);
        if (error.originalError) {
            console.error('Original Error:', error.originalError);
        }
        console.error('--- END DETAILED SIGNUP ERROR ---');
        next(error);
    }
};

export const login = asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body;

    if (!email || !password) {
        throw new AppError('Please provide an email and password.', 400);
    }

    const { user, token } = await AuthService.loginUser(email, password);
    okMsg(res, "User logged in successfully.", { user, token });
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
    okMsg(res, "User logged out successfully.");
});

export const getMe = asyncHandler(async (req: Request, res: Response) => {
    ok(res, { user: req.user });
});

export const changePassword = asyncHandler(async (req: Request, res: Response) => {
    const userId = requireAuth(req);
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
        throw new AppError('Please provide current and new passwords.', 400);
    }

    await AuthService.changeUserPassword(userId, currentPassword, newPassword);
    okMsg(res, 'Password changed successfully.');
});

export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
    const { email } = req.body;
    if (!email) {
        throw new AppError('Please provide an email address.', 400);
    }

    await AuthService.requestPasswordReset(email);
    okMsg(res, 'If an account with this email exists, a password reset link has been sent.');
});
