import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { requireAuth, requireAdmin, requirePending } from '../middleware/auth.js';
import { listStaff, createStaff, updateStaff, resetStaffPassword, deleteStaff } from '../controllers/staffController.js';
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
router.post('/change-password', authLimiter, requireAuth, changePassword);
router.post('/test-email', authLimiter, requireAuth, requireAdmin, testEmail);
router.get('/me', requireAuth, getMe);
router.get('/stats', requireAuth, getStats);

// Staff management (administrators only)
router.use('/staff', requireAuth, requireAdmin);
router.get('/staff', listStaff);
router.post('/staff', createStaff);
router.patch('/staff/:id', updateStaff);
router.post('/staff/:id/reset-password', authLimiter, resetStaffPassword);
router.delete('/staff/:id', deleteStaff);

export default router;
