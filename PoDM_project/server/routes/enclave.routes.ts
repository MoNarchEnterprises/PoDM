import { Router } from 'express';
import * as enclaveController from '../controllers/enclave.controller';
import { protect, adminOnly, protectAndAdmin } from '../middleware/auth.middleware';

const router = Router();

// Public routes
router.get('/spots-remaining', enclaveController.getSpotsRemaining);
router.post('/applications', enclaveController.submitApplication);

// Admin routes
router.get('/applications', ...protectAndAdmin, enclaveController.getAllApplications);
router.patch('/applications/:id', ...protectAndAdmin, enclaveController.updateApplicationStatus);

export default router;
