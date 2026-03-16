import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { sendOTP, verifyOTP, getMe, getStats } from '../controllers/adminController.js';

const router = Router();

// Public auth endpoints
router.post('/send-otp', sendOTP);
router.post('/verify-otp', verifyOTP);

// Protected admin endpoints
router.get('/me', requireAuth, requireAdmin, getMe);
router.get('/stats', requireAuth, requireAdmin, getStats);

export default router;
