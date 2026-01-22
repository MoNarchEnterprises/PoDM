import express from 'express';
import * as AIController from '../controllers/ai.controller';
import { protect } from '../middleware/auth.middleware';
import { uploadAICaptionImage } from '../middleware/upload.middleware';

const router = express.Router();

// Protect all AI routes with authentication
router.use(protect);

router.post('/caption', uploadAICaptionImage, AIController.generateCaption);

export default router;
