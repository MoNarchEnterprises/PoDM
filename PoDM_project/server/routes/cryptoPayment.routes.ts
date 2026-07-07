import { Router } from 'express';
import { protect } from '../middleware/auth.middleware';
import {
    getWalletConfig,
    updateWalletConfig,
    verifyCryptoPayment,
    requestWithdrawal
} from '../controllers/cryptoPayment.controller';

const router = Router();

/**
 * @route   GET /api/v1/payments/crypto/wallet
 * @desc    Get the creator's crypto wallet and payout configuration
 * @access  Private (Creators & Fans)
 */
router.get('/wallet', protect, getWalletConfig);

/**
 * @route   POST /api/v1/payments/crypto/wallet
 * @desc    Update the creator's crypto wallet configurations and preferences
 * @access  Private (Creators only)
 */
router.post('/wallet', protect, updateWalletConfig);

/**
 * @route   POST /api/v1/payments/crypto/verify
 * @desc    Verify a client-submitted Base transaction hash and record the transaction
 * @access  Private (Fans only)
 */
router.post('/verify', protect, verifyCryptoPayment);

/**
 * @route   POST /api/v1/payments/crypto/withdraw
 * @desc    Request a payout to the creator's configured wallet (on-chain USDC on Base)
 * @access  Private (Creators only)
 */
router.post('/withdraw', protect, requestWithdrawal);

export default router;
