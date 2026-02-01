import express from 'express';
import * as ReferralController from '../controllers/referral.controller';
import { protect } from '../middleware/auth.middleware';

const router = express.Router();

// Protected routes (require authentication)
router.get('/my-codes', protect, ReferralController.getMyReferralCodes);
router.post('/generate', protect, ReferralController.generateReferralCodes);
router.get('/stats', protect, ReferralController.getReferralStats);

// Internal route for milestone checking (should be called by payment/earnings system)
router.post('/check-milestone/:userId', ReferralController.checkMilestoneBonus);

// Public route for validation
router.get('/validate/:code', ReferralController.validateReferralCode);

export default router;
