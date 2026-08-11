import express from 'express';
import * as ReferralController from '../controllers/referral.controller';
import { protect, protectAndCreator } from '../middleware/auth.middleware';

const router = express.Router();

// Protected routes (require active creator status)
router.get('/my-codes', ...protectAndCreator, ReferralController.getMyReferralCodes);
router.post('/generate', ...protectAndCreator, ReferralController.generateReferralCodes);
router.get('/stats', ...protectAndCreator, ReferralController.getReferralStats);
router.get('/earnings', ...protectAndCreator, ReferralController.getReferrerEarnings);

// Internal route for milestone checking (should be called by payment/earnings system)
router.post('/check-milestone/:userId', ReferralController.checkMilestoneBonus);

// Public route for validation
router.get('/validate/:code', ReferralController.validateReferralCode);

export default router;
