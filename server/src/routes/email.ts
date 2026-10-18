import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import { listGroups, preview, send, count, listBatches, batchDetail, retry } from '../controllers/emailController.js';

const router = Router();
router.use(requireAuth);

const sendLimiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many sends this hour. Try again later.' } });

router.get('/groups', requirePermission('email', 'view'), listGroups);
router.get('/log', requirePermission('email', 'view'), listBatches);
router.get('/log/:batchId', requirePermission('email', 'view'), batchDetail);
router.post('/preview', requirePermission('email', 'manage'), preview);
router.post('/count', requirePermission('email', 'manage'), count);
router.post('/send', requirePermission('email', 'manage'), sendLimiter, send);
router.post('/log/:batchId/retry', requirePermission('email', 'manage'), sendLimiter, retry);

export default router;
