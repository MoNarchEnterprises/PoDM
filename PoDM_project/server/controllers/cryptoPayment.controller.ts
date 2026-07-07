import { Request, Response, NextFunction } from 'express';
import { AppError } from '../middleware/error.middleware';
import * as CryptoPaymentService from '../services/cryptoPayment.service';
import { asyncHandler } from '../utils/asyncHandler';
import { requireAuth } from '../utils/requestHelpers';
import { ok, okMsg } from '../utils/response';

export const getWalletConfig = asyncHandler(async (req: Request, res: Response) => {
    const userId = requireAuth(req);
    const walletConfig = await CryptoPaymentService.getUserWalletConfig(userId);
    ok(res, walletConfig);
});

export const updateWalletConfig = asyncHandler(async (req: Request, res: Response) => {
    const creatorId = requireAuth(req);
    const { walletAddress, walletType, payoutPreference } = req.body;

    if (!walletAddress || !walletType || !payoutPreference) {
        throw new AppError('Wallet address, wallet type, and payout preference are required.', 400);
    }

    if (!['none', 'embedded', 'custom'].includes(walletType)) {
        throw new AppError('Invalid wallet type specified.', 400);
    }

    if (!['debit_card', 'on_chain', 'base'].includes(payoutPreference)) {
        throw new AppError('Invalid payout preference specified.', 400);
    }

    const result = await CryptoPaymentService.updateUserWalletConfig(creatorId, {
        walletAddress,
        walletType,
        payoutPreference
    });

    okMsg(res, 'Wallet configuration updated successfully.', result);
});

export const verifyCryptoPayment = asyncHandler(async (req: Request, res: Response) => {
    const fanId = requireAuth(req);
    const { txHash, creatorId, amountInCents, transactionType, relatedId } = req.body;

    if (!txHash || !creatorId || !amountInCents || !transactionType) {
        throw new AppError('Missing required parameters for verification (txHash, creatorId, amountInCents, transactionType).', 400);
    }

    const result = await CryptoPaymentService.verifyAndRecordBasePayment({
        txHash,
        fanId,
        creatorId,
        amountInCents,
        transactionType,
        relatedId
    });

    okMsg(res, 'Crypto transaction verified and recorded successfully.', result);
});

export const requestWithdrawal = asyncHandler(async (req: Request, res: Response) => {
    const creatorId = requireAuth(req);
    const { amountInCents, debitCardToken } = req.body;

    if (!amountInCents || amountInCents <= 0) {
        throw new AppError('Invalid withdrawal amount.', 400);
    }

    const result = await CryptoPaymentService.processDebitCardOffRamp(creatorId, amountInCents, debitCardToken);
    okMsg(res, 'Withdrawal processed successfully.', result);
});
