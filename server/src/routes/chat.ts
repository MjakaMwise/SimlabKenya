import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { requireAuth } from '../middleware/auth.js';
import {
  listChannels, listMembers, listMessages, postMessage, markRead,
  listTasks, createTask, updateTask, getPushKey, subscribePush, unsubscribePush,
} from '../controllers/chatController.js';

const router = Router();
router.use(requireAuth);

// People post a few messages a minute; this stops a runaway script, not a busy morning.
const writeLimiter = rateLimit({ windowMs: 60 * 1000, limit: 60, standardHeaders: true, legacyHeaders: false, message: { error: 'Slow down a little.' } });

router.get('/channels', listChannels);
router.get('/channels/:channel/members', listMembers);
router.get('/channels/:channel/messages', listMessages);
router.post('/channels/:channel/messages', writeLimiter, postMessage);
router.post('/channels/:channel/read', markRead);

router.get('/tasks', listTasks);
router.post('/tasks', writeLimiter, createTask);
router.patch('/tasks/:id', writeLimiter, updateTask);

router.get('/push/key', getPushKey);
router.post('/push/subscribe', writeLimiter, subscribePush);
router.post('/push/unsubscribe', writeLimiter, unsubscribePush);

export default router;
