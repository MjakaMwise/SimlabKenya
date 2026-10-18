import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { requireAuth, requirePermission, requireAdmin } from '../middleware/auth.js';
import {
  status, listConversations, listMessages, markRead, startConversation, sendMessage, updateConversation, members,
  getBotSettings, putBotSettings, listNodes, putNode,
} from '../controllers/whatsappController.js';

const router = Router();
router.use(requireAuth);

const sendLimiter = rateLimit({ windowMs: 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false, message: { error: 'Slow down a little.' } });

const view = requirePermission('whatsapp', 'view');
const manage = requirePermission('whatsapp', 'manage');

router.get('/status', view, status);
router.get('/members', view, members);
router.get('/conversations', view, listConversations);
router.get('/conversations/:id/messages', view, listMessages);
router.post('/conversations/:id/read', view, markRead);
router.post('/conversations', manage, startConversation);
router.post('/conversations/:id/messages', manage, sendLimiter, sendMessage);
router.patch('/conversations/:id', manage, updateConversation);

// Bot menu and hours are set up by administrators.
router.get('/bot/settings', requireAdmin, getBotSettings);
router.put('/bot/settings', requireAdmin, putBotSettings);
router.get('/bot/nodes', requireAdmin, listNodes);
router.put('/bot/nodes/:id', requireAdmin, putNode);

export default router;
