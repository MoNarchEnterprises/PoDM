import { Router } from 'express';
import { protect, creatorOnly } from '../middleware/auth.middleware';
import * as ContestController from '../controllers/contest.controller';

const router = Router();

// Fan Routes
router.get('/feed', protect, ContestController.getFeed); // Get list of active contests for fans
router.get('/:id', protect, ContestController.getDetails);
router.post('/:id/enter', protect, ContestController.enter);

// Creator Routes
router.post('/', protect, creatorOnly, ContestController.create);
router.get('/creator/my', protect, creatorOnly, ContestController.getMyContests);
router.put('/:id/publish', protect, creatorOnly, ContestController.publish);
router.post('/:id/finalize', protect, creatorOnly, ContestController.finalize);

export default router;
