import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { requireAuth, requireAdmin, requirePending } from '../middleware/auth.js';
import { login, resendOTP, verifyOTP, changePassword, testEmail, getMe, getStats } from '../controllers/adminController.js';

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please try again later.' },
});

// Sign-in: password -> emailed code -> session token
router.post('/login', authLimiter, login);
router.post('/resend-otp', authLimiter, requirePending, resendOTP);
router.post('/verify-otp', authLimiter, requirePending, verifyOTP);

// Protected admin endpoints
router.post('/change-password', authLimiter, requireAuth, requireAdmin, changePassword);
router.post('/test-email', authLimiter, requireAuth, requireAdmin, testEmail);
router.get('/me', requireAuth, requireAdmin, getMe);
router.get('/stats', requireAuth, requireAdmin, getStats);

export default router;
