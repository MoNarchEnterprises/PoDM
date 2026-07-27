import { Router } from 'express';
import { protect } from '../middleware/auth.middleware';
import {
    createWallet,
    getWalletStatus,
    getBalance,
    signOperation,
    recoverWallet,
    transferUsdcToSmartAccount
} from '../controllers/embeddedWallet.controller';

const router = Router();

router.post('/create', protect, createWallet);
router.get('/status', protect, getWalletStatus);
router.get('/balance', protect, getBalance);
router.post('/sign-operation', protect, signOperation);
router.post('/recover', protect, recoverWallet);
router.post('/transfer-to-smart-account', protect, transferUsdcToSmartAccount);

export default router;
