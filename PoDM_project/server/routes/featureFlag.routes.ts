import { Router } from 'express';
import { protect, protectAndAdmin } from '../middleware/auth.middleware';
import {
    getFlags,
    getUserFlags,
    updateFlag,
    setOverride
} from '../controllers/featureFlag.controller';

const router = Router();

router.get('/', protect, getFlags);
router.get('/user', protect, getUserFlags);
router.put('/:key', protectAndAdmin, updateFlag);
router.post('/override', protectAndAdmin, setOverride);

export default router;
