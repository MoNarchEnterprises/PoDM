import { Request, Response, NextFunction } from 'express';
import { AppError } from '../middleware/error.middleware';
import * as CryptoPaymentService from '../services/cryptoPayment.service';

/**
 * @desc    Get the creator's crypto wallet and payout configuration
 * @route   GET /api/v1/payments/crypto/wallet
 * @access  Private
 */
export const getWalletConfig = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            throw new AppError('Authentication error, user ID not found.', 401);
        }

        const walletConfig = await CryptoPaymentService.getUserWalletConfig(userId);
        res.status(200).json({ success: true, data: walletConfig });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Update the creator's crypto wallet configurations and preferences
 * @route   POST /api/v1/payments/crypto/wallet
 * @access  Private (Creators only)
 */
export const updateWalletConfig = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const creatorId = req.user?.id;
        const { walletAddress, walletType, payoutPreference } = req.body;

        if (!creatorId) {
            throw new AppError('Authentication error, user ID not found.', 401);
        }

        if (!walletAddress || !walletType || !payoutPreference) {
            throw new AppError('Wallet address, wallet type, and payout preference are required.', 400);
        }

        if (!['none', 'embedded', 'custom'].includes(walletType)) {
            throw new AppError('Invalid wallet type specified.', 400);
        }

        if (!['debit_card', 'on_chain'].includes(payoutPreference)) {
            throw new AppError('Invalid payout preference specified.', 400);
        }

        const result = await CryptoPaymentService.updateUserWalletConfig(creatorId, {
            walletAddress,
            walletType,
            payoutPreference
        });

        res.status(200).json({ success: true, message: 'Wallet configuration updated successfully.', data: result });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Verify a client-submitted Base transaction hash and record the transaction
 * @route   POST /api/v1/payments/crypto/verify
 * @access  Private (Fans only)
 */
export const verifyCryptoPayment = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const fanId = req.user?.id;
        const { txHash, creatorId, amountInCents, transactionType, relatedId } = req.body;

        if (!fanId) {
            throw new AppError('Authentication error, user ID not found.', 401);
        }

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

        res.status(200).json({ success: true, message: 'Crypto transaction verified and recorded successfully.', data: result });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Request a fiat off-ramp cash-out to a linked debit card (US only)
 * @route   POST /api/v1/payments/crypto/withdraw
 * @access  Private (Creators only)
 */
export const requestWithdrawal = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const creatorId = req.user?.id;
        const { amountInCents, debitCardToken } = req.body;

        if (!creatorId) {
            throw new AppError('Authentication error, user ID not found.', 401);
        }

        if (!amountInCents || amountInCents <= 0) {
            throw new AppError('Invalid withdrawal amount.', 400);
        }

        const result = await CryptoPaymentService.processDebitCardOffRamp(creatorId, amountInCents, debitCardToken);

        res.status(200).json({ success: true, message: 'Withdrawal processed successfully.', data: result });
    } catch (error) {
        next(error);
    }
};
