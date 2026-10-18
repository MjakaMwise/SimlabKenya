import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { requireAuth, requirePermission } from '../middleware/auth.js';
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

// Staff delegated Ocean Shujaa (view to read and export, manage to change or delete); administrators always pass.
router.use('/admin', requireAuth);
router.get('/admin/registrations', requirePermission('ocean', 'view'), listRegistrations);
router.get('/admin/summary', requirePermission('ocean', 'view'), getSummary);
router.get('/admin/export.csv', requirePermission('ocean', 'view'), exportCsv);
router.patch('/admin/registrations/:id', requirePermission('ocean', 'manage'), updateRegistration);
router.delete('/admin/registrations/:id', requirePermission('ocean', 'manage'), deleteRegistration);

export default router;
