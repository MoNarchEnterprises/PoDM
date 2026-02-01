import { Router } from 'express';
import * as enclaveController from '../controllers/enclave.controller';
import { protect, adminOnly } from '../middleware/auth.middleware';

const router = Router();

// Public routes
router.get('/spots-remaining', enclaveController.getSpotsRemaining);
router.post('/applications', enclaveController.submitApplication);

// Admin routes
router.get('/applications', protect, adminOnly, enclaveController.getAllApplications);
router.patch('/applications/:id', protect, adminOnly, enclaveController.updateApplicationStatus);

export default router;
