import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import {
  createRegistration, listRegistrations, getSummary,
  updateRegistration, deleteRegistration, exportCsv,
} from '../controllers/oceanShujaaController.js';

const router = Router();

const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many registrations from this connection. Please try again later.' },
});

// Public
router.post('/registrations', registerLimiter, createRegistration);

// Admin only
router.use('/admin', requireAuth, requireAdmin);
router.get('/admin/registrations', listRegistrations);
router.get('/admin/summary', getSummary);
router.get('/admin/export.csv', exportCsv);
router.patch('/admin/registrations/:id', updateRegistration);
router.delete('/admin/registrations/:id', deleteRegistration);

export default router;
