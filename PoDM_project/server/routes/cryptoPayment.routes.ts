import { Router } from 'express';
import { protect } from '../middleware/auth.middleware';
import {
    getWalletConfig,
    requestWalletChallenge,
    updateWalletConfig,
    verifyCryptoPayment,
    registerPaymentIntent,
    attachPaymentIntentTransaction,
    getReferrerInfo
} from '../controllers/cryptoPayment.controller';

console.log('✅ cryptoPayment.routes.ts loaded and registering /verify route');
const router = Router();

/**
 * @route   GET /api/v1/payments/crypto/wallet
 * @desc    Get the creator's crypto wallet and payout configuration
 * @access  Private (Creators & Fans)
 */
router.get('/wallet', protect, getWalletConfig);

/**
 * @route   POST /api/v1/payments/crypto/wallet/challenge
 * @desc    Request a cryptographic ownership challenge for a custom wallet
 * @access  Private (Creators & Fans)
 */
router.post('/wallet/challenge', protect, requestWalletChallenge);

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
router.post('/intent', protect, registerPaymentIntent);
router.post('/intent/transaction', protect, attachPaymentIntentTransaction);

/**
 * @route   GET /api/v1/payments/crypto/referrer/:creatorId
 * @desc    Get the referrer wallet + referral fee bps a fan must pass to the
 *          contract when paying a referred creator ('' referrerAddress = no referral)
 * @access  Private
 */
router.get('/referrer/:creatorId', protect, getReferrerInfo);

export default router;
