import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import {
  listChannels, listMembers, listMessages, postMessage, markRead,
  listTasks, createTask, updateTask, getPushKey, subscribePush, unsubscribePush,
} from '../controllers/chatController.js';

const router = Router();
router.use(requireAuth);

// People post a few messages a minute; this stops a runaway script, not a busy morning.
const writeLimiter = rateLimit({ windowMs: 60 * 1000, limit: 60, standardHeaders: true, legacyHeaders: false, message: { error: 'Slow down a little.' } });

// Team chat is delegated like the other areas: view reads, manage posts and assigns tasks.
const view = requirePermission('chat', 'view');
const manage = requirePermission('chat', 'manage');

router.get('/channels', view, listChannels);
router.get('/channels/:channel/members', view, listMembers);
router.get('/channels/:channel/messages', view, listMessages);
router.post('/channels/:channel/messages', manage, writeLimiter, postMessage);
router.post('/channels/:channel/read', view, markRead);

router.get('/tasks', view, listTasks);
router.post('/tasks', manage, writeLimiter, createTask);
router.patch('/tasks/:id', manage, writeLimiter, updateTask);

router.get('/push/key', getPushKey);
router.post('/push/subscribe', writeLimiter, subscribePush);
router.post('/push/unsubscribe', writeLimiter, unsubscribePush);

export default router;
