import { Router } from 'express';
import { protect, creatorOnly, protectAndCreator } from '../middleware/auth.middleware';
import * as ContestController from '../controllers/contest.controller';

const router = Router();

// Fan Routes
router.get('/feed', protect, ContestController.getFeed); // Get list of active contests for fans
router.get('/:id', protect, ContestController.getDetails);
router.post('/:id/enter', protect, ContestController.enter);

// Creator Routes
router.post('/', ...protectAndCreator, ContestController.create);
router.get('/creator/my', ...protectAndCreator, ContestController.getMyContests);
router.put('/:id/publish', ...protectAndCreator, ContestController.publish);
router.post('/:id/finalize', ...protectAndCreator, ContestController.finalize);

export default router;
